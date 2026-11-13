import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Ticket,
  Users,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { formatNumber } from '@/utils/format';
import { subscribeToPlatformStatsLive, fetchPlatformStats, type PlatformStats } from '@/services/events';
import { coreTimeline, type TimelineBucket } from '@/lib/rust-core';

export interface GbaigbanceStatsDashboardProps {
  platformStats?: PlatformStats;
}

type Period = 'current_month' | 'last_month' | 'quarter';
type MetricType = 'tickets' | 'revenue' | 'attendees' | 'events';

interface MonthlyDataPoint {
  label: string;
  shortLabel: string;
  tickets: number;
  revenue: number;
  attendees: number;
  events: number;
}

export function GbaigbanceStatsDashboard({
  platformStats: initialPlatformStats,
}: GbaigbanceStatsDashboardProps) {
  const [period, setPeriod] = useState<Period>('current_month');
  const [activeMetric, setActiveMetric] =
    useState<MetricType>('tickets');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState(initialPlatformStats);
  const [timelineBuckets, setTimelineBuckets] = useState<TimelineBucket[] | null>(null);
  const syncSeq = useRef(0);
  // Ne jamais tracer les quelques événements de découverte comme s'ils représentaient
  // toute la plateforme : le graphique attend exclusivement l'agrégat complet du service.
  const timelineEvents = useMemo(
    () => platformStats?.eventsTimeline ?? [],
    [platformStats?.eventsTimeline]
  );

  // Keep state updated if props change
  useEffect(() => {
    if (initialPlatformStats) {
      setPlatformStats(initialPlatformStats);
    }
  }, [initialPlatformStats]);

  // Une réponse lente ne doit pas écraser une synchro plus récente.
  useEffect(() => {
    const handleStatsUpdate = () => {
      const seq = ++syncSeq.current;
      fetchPlatformStats().then((data) => {
        if (seq !== syncSeq.current || !data) return;
        setPlatformStats(data);
        }).catch(() => {});
    };

    const unsubscribe = subscribeToPlatformStatsLive(handleStatsUpdate);
    window.addEventListener('gba-ticket-booked', handleStatsUpdate);
    window.addEventListener('gba-event-created', handleStatsUpdate);
    window.addEventListener('gba-refresh-events', handleStatsUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('gba-ticket-booked', handleStatsUpdate);
      window.removeEventListener('gba-event-created', handleStatsUpdate);
      window.removeEventListener('gba-refresh-events', handleStatsUpdate);
    };
  }, []);

  // Totaux réels de la plateforme (100% dynamiques et vérifiés)
  const totals = useMemo(() => {
    // Les KPI sont les comptes réels : utilisateurs ≠ somme des jauges, billets ≠ participants.
    return {
      tickets: platformStats?.totalTickets ?? 0,
      revenue: platformStats?.totalRevenue ?? 0,
      attendees: platformStats?.totalUsers ?? 0,
      events: platformStats?.totalEvents ?? 0,
    };
  }, [platformStats]);

  // Données dynamiques de la période sélectionnée basées sur les dates réelles des événements et des billets
  useEffect(() => {
    let cancelled = false;
    setTimelineBuckets(null);
    const tickets = (platformStats?.ticketsTimeline || []).map((ticket, index) => ({
      id: ticket.id || `${ticket.event_id}-${ticket.created_at_ms || index}-${index}`,
      created_at_ms: ticket.created_at_ms || Date.parse(ticket.created_at),
      price_paid: ticket.price_paid || 0,
      status: 'valid',
    }));
    coreTimeline({ period, nowMs: Date.now(), tickets, events: timelineEvents }).then((buckets) => {
      if (!cancelled) setTimelineBuckets(buckets);
    });
    return () => {
      cancelled = true;
    };
  }, [period, platformStats, timelineEvents]);

  const monthlyTimeline = useMemo<MonthlyDataPoint[]>(() => {
    if (timelineBuckets && timelineBuckets.length > 0) {
      return timelineBuckets.map((bucket) => {
        const monthDate = new Date(bucket.year, bucket.month - 1, 1);
        const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(monthDate);
        const fullMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(monthDate);
        if (bucket.week === null || bucket.week === undefined) {
          return {
            label: fullMonth,
            shortLabel: monthName,
            tickets: bucket.tickets,
            revenue: bucket.revenue,
            attendees: bucket.attendees,
            events: bucket.events,
          };
        }
        const startDay = bucket.week * 7 + 1;
        const endLabel = bucket.week === 3 ? '22+' : String(startDay + 6);
        return {
          label: `Semaine ${bucket.week + 1} (${startDay} - ${endLabel} ${monthName})`,
          shortLabel: `Sem ${bucket.week + 1}`,
          tickets: bucket.tickets,
          revenue: bucket.revenue,
          attendees: bucket.attendees,
          events: bucket.events,
        };
      });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const tickets = platformStats?.ticketsTimeline || [];

    if (period === 'current_month') {
      const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(now);
      const weeks: MonthlyDataPoint[] = [
        { label: `Semaine 1 (1 - 7 ${monthName})`, shortLabel: 'Sem 1', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 2 (8 - 14 ${monthName})`, shortLabel: 'Sem 2', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 3 (15 - 21 ${monthName})`, shortLabel: 'Sem 3', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 4 (22+ ${monthName})`, shortLabel: 'Sem 4', tickets: 0, revenue: 0, attendees: 0, events: 0 },
      ];

      // 1. Événements réels se déroulant ce mois
      timelineEvents.forEach((ev) => {
        const d = new Date(ev.starts_at_ms);
        if (!isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
          const evAttendees = ev.attendees || 0;
          weeks[weekIdx].events += 1;
          weeks[weekIdx].attendees += evAttendees;
        }
      });

      // 2. Vrais billets achetés ce mois
      tickets.forEach((tk) => {
        const td = new Date(tk.created_at_ms || Date.parse(tk.created_at));
        if (!isNaN(td.getTime()) && td.getMonth() === currentMonth && td.getFullYear() === currentYear) {
          const day = td.getDate();
          const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
          weeks[weekIdx].tickets += 1;
          weeks[weekIdx].revenue += tk.price_paid || 0;
        }
      });

      return weeks;
    }

    if (period === 'last_month') {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const lastMonthName = new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(lastMonthDate);
      const lastMonthIdx = lastMonthDate.getMonth();
      const lastMonthYear = lastMonthDate.getFullYear();

      const weeks: MonthlyDataPoint[] = [
        { label: `Semaine 1 (1 - 7 ${lastMonthName})`, shortLabel: 'Sem 1', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 2 (8 - 14 ${lastMonthName})`, shortLabel: 'Sem 2', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 3 (15 - 21 ${lastMonthName})`, shortLabel: 'Sem 3', tickets: 0, revenue: 0, attendees: 0, events: 0 },
        { label: `Semaine 4 (22+ ${lastMonthName})`, shortLabel: 'Sem 4', tickets: 0, revenue: 0, attendees: 0, events: 0 },
      ];

      timelineEvents.forEach((ev) => {
        const d = new Date(ev.starts_at_ms);
        if (!isNaN(d.getTime()) && d.getMonth() === lastMonthIdx && d.getFullYear() === lastMonthYear) {
          const day = d.getDate();
          const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
          const evAttendees = ev.attendees || 0;
          weeks[weekIdx].events += 1;
          weeks[weekIdx].attendees += evAttendees;
        }
      });

      tickets.forEach((tk) => {
        const td = new Date(tk.created_at_ms || Date.parse(tk.created_at));
        if (!isNaN(td.getTime()) && td.getMonth() === lastMonthIdx && td.getFullYear() === lastMonthYear) {
          const day = td.getDate();
          const weekIdx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
          weeks[weekIdx].tickets += 1;
          weeks[weekIdx].revenue += tk.price_paid || 0;
        }
      });

      return weeks;
    }

    // Trimestre (3 mois récents)
    const m1 = new Date(currentYear, currentMonth - 2, 1);
    const m2 = new Date(currentYear, currentMonth - 1, 1);
    const m3 = new Date(currentYear, currentMonth, 1);

    const formatMonth = (d: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d);
    const formatFullMonth = (d: Date) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(d);

    const m1Data: MonthlyDataPoint = { label: formatFullMonth(m1), shortLabel: formatMonth(m1), tickets: 0, revenue: 0, attendees: 0, events: 0 };
    const m2Data: MonthlyDataPoint = { label: formatFullMonth(m2), shortLabel: formatMonth(m2), tickets: 0, revenue: 0, attendees: 0, events: 0 };
    const m3Data: MonthlyDataPoint = { label: `${formatFullMonth(m3)} (en cours)`, shortLabel: formatMonth(m3), tickets: 0, revenue: 0, attendees: 0, events: 0 };

    timelineEvents.forEach((ev) => {
      const d = new Date(ev.starts_at_ms);
      if (isNaN(d.getTime())) return;
      const m = d.getMonth();
      const y = d.getFullYear();
      const evAttendees = ev.attendees || 0;

      if (m === m1.getMonth() && y === m1.getFullYear()) {
        m1Data.events += 1;
        m1Data.attendees += evAttendees;
      } else if (m === m2.getMonth() && y === m2.getFullYear()) {
        m2Data.events += 1;
        m2Data.attendees += evAttendees;
      } else if (m === m3.getMonth() && y === m3.getFullYear()) {
        m3Data.events += 1;
        m3Data.attendees += evAttendees;
      }
    });

    tickets.forEach((tk) => {
      const td = new Date(tk.created_at_ms || Date.parse(tk.created_at));
      if (isNaN(td.getTime())) return;
      const m = td.getMonth();
      const y = td.getFullYear();
      const price = tk.price_paid || 0;

      if (m === m1.getMonth() && y === m1.getFullYear()) {
        m1Data.tickets += 1;
        m1Data.revenue += price;
      } else if (m === m2.getMonth() && y === m2.getFullYear()) {
        m2Data.tickets += 1;
        m2Data.revenue += price;
      } else if (m === m3.getMonth() && y === m3.getFullYear()) {
        m3Data.tickets += 1;
        m3Data.revenue += price;
      }
    });

    return [m1Data, m2Data, m3Data];
  }, [period, totals, timelineEvents, platformStats?.ticketsTimeline, timelineBuckets]);

  // Répartition par catégorie basée sur les vrais événements
  const categoriesBreakdown = useMemo(() => {
    const categoryMeta: Record<string, { label: string; color: string }> = {
      concert: { label: 'Concerts & Live', color: '#6600FF' },
      festival: { label: 'Festivals & Foires', color: '#8B5CF6' },
      party: { label: 'Soirées & Nightlife', color: '#EC4899' },
      theatre: { label: 'Culture & Théâtre', color: '#10B981' },
      conference: { label: 'Conférences & Talks', color: '#3B82F6' },
      spectacle: { label: 'Spectacles & Humour', color: '#F59E0B' },
      formation: { label: 'Formations & Workshops', color: '#14B8A6' },
      private: { label: 'Événements Privés', color: '#6366F1' },
      sport: { label: 'Sport & Bien-être', color: '#EF4444' },
      exhibition: { label: 'Expositions & Art', color: '#D946EF' },
      exposition: { label: 'Expositions & Art', color: '#D946EF' },
    };

    const shares = platformStats?.categoryShares || [];
    if (shares.length === 0) return [];

    return shares.map((share) => {
      const meta = categoryMeta[share.id] || {
        label: share.id.charAt(0).toUpperCase() + share.id.slice(1),
        color: '#6600FF',
      };
      return {
        id: share.id,
        label: meta.label,
        percent: share.percent,
        color: meta.color,
        count: share.count,
      };
    });
  }, [platformStats?.categoryShares]);

  // Valeur maximale du graphique
  const maxMetricValue = useMemo(() => {
    const values = monthlyTimeline.map(
      (item) => item[activeMetric]
    );

    return Math.max(...values, 1);
  }, [monthlyTimeline, activeMetric]);

  // Formatage des métriques
  const getMetricFormatted = (
    value: number,
    type: MetricType
  ) => {
    if (type === 'revenue') {
      return `${value.toLocaleString(
        'fr-FR'
      )} FCFA`;
    }

    return formatNumber(value);
  };

  const getMetricUnit = (type: MetricType) => {
    switch (type) {
      case 'tickets':
        return 'billets de la période';

      case 'revenue':
        return 'ventes de la période';

      case 'attendees':
        return 'participants des événements';

      case 'events':
        return 'événements de la période';

      default:
        return '';
    }
  };

  // Dimensions du graphique SVG
  const chartWidth = 320;
  const chartHeight = 130;
  const paddingX = 24;
  const paddingY = 20;

  // Points de la courbe
  const points = useMemo(() => {
    const count = monthlyTimeline.length;

    if (count === 0) {
      return [];
    }

    if (count === 1) {
      const item = monthlyTimeline[0];
      const ratio =
        item[activeMetric] / maxMetricValue;

      const y =
        chartHeight -
        paddingY -
        ratio *
          (chartHeight - paddingY * 2);

      return [
        {
          x: chartWidth / 2,
          y,
          data: item,
        },
      ];
    }

    return monthlyTimeline.map((item, index) => {
      const x =
        paddingX +
        (index / (count - 1)) *
          (chartWidth - paddingX * 2);

      const ratio =
        item[activeMetric] / maxMetricValue;

      const y =
        chartHeight -
        paddingY -
        ratio *
          (chartHeight - paddingY * 2);

      return {
        x,
        y,
        data: item,
      };
    });
  }, [
    monthlyTimeline,
    activeMetric,
    maxMetricValue,
  ]);

  // Tracé de la courbe
  const pathD = useMemo(() => {
    if (points.length === 0) {
      return '';
    }

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`;
    }

    let path = `M ${points[0].x} ${points[0].y}`;

    for (
      let index = 0;
      index < points.length - 1;
      index++
    ) {
      const current = points[index];
      const next = points[index + 1];

      const controlX =
        (current.x + next.x) / 2;

      path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
    }

    return path;
  }, [points]);

  // Surface sous la courbe
  const areaD = useMemo(() => {
    if (points.length === 0 || !pathD) {
      return '';
    }

    const first = points[0];
    const last =
      points[points.length - 1];

    return `${pathD} L ${last.x} ${chartHeight} L ${first.x} ${chartHeight} Z`;
  }, [pathD, points]);

  const activeHoverPoint =
    hoveredIndex !== null
      ? points[hoveredIndex]
      : null;

  return (
    <div className="w-full overflow-hidden relative isolate rounded-[2rem] border border-white/75 border-t-white/90 bg-gradient-to-br from-white/75 via-white/60 to-violet-50/45 shadow-[0_12px_36px_rgba(23,19,29,0.08)] backdrop-blur-2xl dark:border-white/20 dark:border-t-white/35 dark:bg-gradient-to-br dark:from-[#493568]/55 dark:via-[#1a162b]/48 dark:to-[#39264e]/52 dark:shadow-[0_22px_56px_rgba(0,0,0,0.48)] dark:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.16),0_22px_56px_rgba(0,0,0,0.48)]">
      {/* Sélecteur de période — pleine largeur */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
Données synchronisées en direct
            </span>
          </div>

        </div>
        <div className="relative flex w-full items-center rounded-2xl bg-gray-100/90 p-1 dark:bg-white/[0.055]">

          <button
            type="button"
            onClick={() =>
              setPeriod('current_month')
            }
            className={`flex-1 min-h-[44px] rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
              period === 'current_month'
                ? 'bg-white text-[#17131D] shadow-xs dark:bg-[#6600FF] dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Ce mois
          </button>

          <button
            type="button"
            onClick={() =>
              setPeriod('last_month')
            }
            className={`flex-1 min-h-[44px] rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
              period === 'last_month'
                ? 'bg-white text-[#17131D] shadow-xs dark:bg-[#6600FF] dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Mois dernier
          </button>

          <button
            type="button"
            onClick={() =>
              setPeriod('quarter')
            }
            className={`flex-1 min-h-[44px] rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
              period === 'quarter'
                ? 'bg-white text-[#17131D] shadow-xs dark:bg-[#6600FF] dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Trimestre
          </button>

        </div>
      </div>

      {/* Cartes KPI */}
      <div className="mb-5 grid grid-cols-2 gap-3 px-4 sm:px-5 lg:grid-cols-4">

        {/* Billets - Total global acheté par tout le monde */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('tickets')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left backdrop-blur-xl transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99] ${
            activeMetric === 'tickets'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#8B5CF6]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.11] dark:bg-white/[0.045]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Ticket className="h-3.5 w-3.5 text-[#6600FF]" />
              Billets vendus
            </span>

            {activeMetric === 'tickets' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#6600FF]" />
            )}
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {platformStats?.isAvailable === false || !platformStats ? '—' : formatNumber(totals.tickets)}
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-gray-400">
            Billets totaux vendus dans l'app
          </p>
        </button>

        {/* Revenus - Montant total des ventes de billets dans l'app */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('revenue')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left backdrop-blur-xl transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99] ${
            activeMetric === 'revenue'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.11] dark:bg-white/[0.075]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <DollarSign className="h-3.5 w-3.5 text-[#6600FF]" />
              Ventes de billets
            </span>

            {activeMetric === 'revenue' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#10B981]" />
            )}
          </div>

          <p className="truncate text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {platformStats?.isAvailable === false || !platformStats
              ? '—'
              : totals.revenue >= 1000000
                ? `${(totals.revenue / 1000000).toFixed(1)}M`
                : totals.revenue > 0
                  ? totals.revenue.toLocaleString('fr-FR')
                  : '0'}{' '}
            <span className="text-xs font-bold text-gray-400">
              FCFA
            </span>
          </p>

          <p className="mt-0.5 text-[10px] font-semibold text-gray-400">
            Montant total des ventes
          </p>
        </button>

        {/* Comptes : le chiffre n'est pas la courbe (la courbe est la jauge des événements). */}
        <div
          className="relative overflow-hidden rounded-[1.4rem] border border-black/[0.04] bg-gray-50/65 p-3.5 text-left backdrop-blur-xl dark:border-white/[0.11] dark:bg-white/[0.075]"
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Users className="h-3.5 w-3.5 text-[#6600FF]" />
              Utilisateurs
            </span>
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {platformStats?.isAvailable === false || !platformStats ? '—' : formatNumber(totals.attendees)}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-gray-400">
            Comptes inscrits
          </p>
        </div>

        {/* Événements créés - Actifs uniquement */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('events')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left backdrop-blur-xl transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99] ${
            activeMetric === 'events'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.11] dark:bg-white/[0.075]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Calendar className="h-3.5 w-3.5 text-[#6600FF]" />
              Événements actifs
            </span>

            {activeMetric === 'events' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#EC4899]" />
            )}
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {totals.events}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-gray-400">
            Événements créés en cours
          </p>
        </button>

      </div>

      {/* Graphique */}
      <div className="mb-4 px-5">
        <div className="rounded-[1.8rem] border border-white/65 bg-gradient-to-b from-white/55 to-white/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-xl dark:border-white/[0.12] dark:from-[#8B5CF6]/20 dark:via-[#251d35]/35 dark:to-white/[0.035] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">

          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-xs font-bold text-[#17131D] dark:text-white">
                Évolution de la période :
              </span>

              <span className="truncate text-xs font-extrabold text-[#6600FF] dark:text-[#A78BFA]">
                {getMetricUnit(activeMetric)}
              </span>
            </div>

            <span className="hidden shrink-0 text-[11px] text-gray-400 sm:block">
              Touchez un point pour inspecter
            </span>
          </div>

          {/* Info-bulle */}
          <div className="mb-1 flex h-7 items-center">
            {activeHoverPoint ? (
              <div className="inline-flex animate-fade-in items-center gap-2 rounded-xl bg-[#6600FF] px-3 py-1 text-xs font-bold text-white shadow-sm">
                <span>
                  {activeHoverPoint.data.label} :
                </span>

                <span className="font-black text-yellow-300">
                  {getMetricFormatted(
                    activeHoverPoint.data[
                      activeMetric
                    ],
                    activeMetric
                  )}
                </span>
              </div>
            ) : (() => {
              const peak = monthlyTimeline.reduce((best, cur) => cur[activeMetric] > (best ? best[activeMetric] : -1) ? cur : best, monthlyTimeline[0]);
              return (
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
                  Pic d'activité : <strong className="text-[#6600FF] dark:text-[#A78BFA] font-bold">{peak ? peak.shortLabel : 'Période'}</strong> ({peak ? getMetricFormatted(peak[activeMetric], activeMetric) : '0'})
                </p>
              );
            })()}
          </div>

          {/* SVG */}
          <div className="relative flex h-[140px] w-full items-center justify-center">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient
                  id="chartGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#6600FF"
                    stopOpacity="0.32"
                  />

                  <stop
                    offset="100%"
                    stopColor="#6600FF"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Lignes guides */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={chartWidth - paddingX}
                y2={paddingY}
                stroke="currentColor"
                className="text-black/5 dark:text-white/10"
                strokeDasharray="4 4"
              />

              <line
                x1={paddingX}
                y1={chartHeight / 2}
                x2={chartWidth - paddingX}
                y2={chartHeight / 2}
                stroke="currentColor"
                className="text-black/5 dark:text-white/10"
                strokeDasharray="4 4"
              />

              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="currentColor"
                className="text-black/10 dark:text-white/15"
              />

              {/* Surface */}
              {areaD && (
                <path
                  d={areaD}
                  fill="url(#chartGradient)"
                />
              )}

              {/* Courbe */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#6600FF"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Points */}
              {points.map((point, index) => {
                const isHovered =
                  hoveredIndex === index;

                return (
                  <g
                    key={`${point.data.label}-${index}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredIndex(index)
                    }
                    onMouseLeave={() =>
                      setHoveredIndex(null)
                    }
                    onClick={() =>
                      setHoveredIndex(
                        isHovered
                          ? null
                          : index
                      )
                    }
                  >
                    {/* Zone tactile */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="18"
                      fill="transparent"
                    />

                    {/* Effet actif */}
                    {isHovered && (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="10"
                        fill="#6600FF"
                        fillOpacity="0.25"
                        className="animate-ping"
                      />
                    )}

                    {/* Point */}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isHovered ? 6 : 4}
                      fill={
                        isHovered
                          ? '#6600FF'
                          : '#ffffff'
                      }
                      stroke="#6600FF"
                      strokeWidth={
                        isHovered ? 3 : 2.5
                      }
                      className="transition-all duration-200"
                    />

                    {/* Label */}
                    <text
                      x={point.x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      className="fill-gray-400 text-[9px] font-bold select-none"
                    >
                      {point.data.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Répartition par catégorie */}
      <div className="px-5 pb-5">

        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {platformStats?.categoryBasis === 'revenue' ? 'Part des ventes par catégorie' : 'Répartition du catalogue'}
          </span>

          <span className="text-[11px] font-semibold text-[#6600FF]">
            {platformStats?.categoryBasis === 'revenue'
              ? `${formatNumber(totals.tickets)} billets`
              : `${formatNumber(categoriesBreakdown.reduce((sum, category) => sum + category.count, 0))} événements`}
          </span>
        </div>

        {/* Barre segmentée ou état vide */}
        {categoriesBreakdown.length === 0 ? (
          <div className="py-4 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 rounded-2xl bg-gray-50 dark:bg-white/[0.03]">
            Aucune catégorie d'événement pour le moment
          </div>
        ) : (
          <>
            <div className="mb-3 flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100 p-0.5 dark:bg-white/10">
              {categoriesBreakdown.map(
                (category) => (
                  <button
                    key={category.id}
                    type="button"
                    aria-label={`${category.label} : ${category.percent}%`}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory ===
                          category.id
                          ? null
                          : category.id
                      )
                    }
                    style={{
                      width: `${category.percent}%`,
                      backgroundColor:
                        category.color,
                      opacity:
                        selectedCategory &&
                        selectedCategory !==
                          category.id
                          ? 0.35
                          : 1,
                    }}
                    className="h-full min-w-0 cursor-pointer rounded-full transition-all hover:scale-y-110"
                    title={`${category.label} : ${category.percent}% (${category.count} ${platformStats?.categoryBasis === 'revenue' ? 'billets' : 'événements'})`}
                  />
                )
              )}
            </div>

            {/* Légende */}
            <div className="grid grid-cols-2 gap-2">
              {categoriesBreakdown.map(
                (category) => {
                  const isSelected =
                    selectedCategory ===
                    category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(
                          isSelected
                            ? null
                            : category.id
                        )
                      }
                      className={`flex min-h-[44px] items-center justify-between rounded-xl px-2 text-left transition-[background-color,border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.99] ${
                        isSelected
                          ? 'bg-gray-100 ring-1 ring-[#6600FF] dark:bg-white/15'
                          : 'hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              category.color,
                          }}
                        />

                        <span className="truncate text-[11px] font-semibold text-[#17131D] dark:text-white">
                          {category.label}
                        </span>
                      </div>

                      <div className="shrink-0 text-right flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                          ({category.count})
                        </span>
                        <span className="text-xs font-extrabold text-[#17131D] dark:text-white">
                          {category.percent}%
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}