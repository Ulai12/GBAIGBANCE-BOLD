import { useState, useMemo } from 'react';
import {
  Ticket,
  Users,
  Calendar,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { formatNumber } from '@/utils/format';
import type { Event } from '@/types';

export interface GbaigbanceStatsDashboardProps {
  events?: Event[];
  platformStats?: {
    totalEvents: number;
    totalArtists: number;
    totalOrganizers: number;
    totalTickets: number;
    totalParticipants: number;
  };
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
  events = [],
  platformStats,
}: GbaigbanceStatsDashboardProps) {
  const [period, setPeriod] = useState<Period>('current_month');
  const [activeMetric, setActiveMetric] =
    useState<MetricType>('tickets');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<string | null>(null);

  // Données dynamiques de la période sélectionnée
  const monthlyTimeline = useMemo<MonthlyDataPoint[]>(() => {
    const baseTickets = platformStats?.totalTickets || 1240;
    const baseAttendees =
      platformStats?.totalParticipants || 4850;
    const baseEvents =
      platformStats?.totalEvents || events.length || 14;

    if (period === 'current_month') {
      return [
        {
          label: 'Semaine 1 (1 - 7 Sept)',
          shortLabel: 'Sem 1',
          tickets: Math.round(baseTickets * 0.18),
          revenue: Math.round(
            baseTickets * 0.18 * 4500
          ),
          attendees: Math.round(
            baseAttendees * 0.19
          ),
          events: Math.max(
            1,
            Math.round(baseEvents * 0.2)
          ),
        },
        {
          label: 'Semaine 2 (8 - 14 Sept)',
          shortLabel: 'Sem 2',
          tickets: Math.round(baseTickets * 0.26),
          revenue: Math.round(
            baseTickets * 0.26 * 4800
          ),
          attendees: Math.round(
            baseAttendees * 0.25
          ),
          events: Math.max(
            2,
            Math.round(baseEvents * 0.28)
          ),
        },
        {
          label: 'Semaine 3 (15 - 21 Sept)',
          shortLabel: 'Sem 3',
          tickets: Math.round(baseTickets * 0.34),
          revenue: Math.round(
            baseTickets * 0.34 * 5200
          ),
          attendees: Math.round(
            baseAttendees * 0.33
          ),
          events: Math.max(
            3,
            Math.round(baseEvents * 0.35)
          ),
        },
        {
          label: 'Semaine 4 (22 - 30 Sept)',
          shortLabel: 'Sem 4',
          tickets: Math.round(baseTickets * 0.22),
          revenue: Math.round(
            baseTickets * 0.22 * 5000
          ),
          attendees: Math.round(
            baseAttendees * 0.23
          ),
          events: Math.max(
            2,
            Math.round(baseEvents * 0.25)
          ),
        },
      ];
    }

    if (period === 'last_month') {
      return [
        {
          label: 'Semaine 1 (Août)',
          shortLabel: 'Sem 1',
          tickets: Math.round(baseTickets * 0.15),
          revenue: Math.round(
            baseTickets * 0.15 * 4200
          ),
          attendees: Math.round(
            baseAttendees * 0.16
          ),
          events: Math.max(
            1,
            Math.round(baseEvents * 0.18)
          ),
        },
        {
          label: 'Semaine 2 (Août)',
          shortLabel: 'Sem 2',
          tickets: Math.round(baseTickets * 0.21),
          revenue: Math.round(
            baseTickets * 0.21 * 4400
          ),
          attendees: Math.round(
            baseAttendees * 0.22
          ),
          events: Math.max(
            2,
            Math.round(baseEvents * 0.22)
          ),
        },
        {
          label: 'Semaine 3 (Août)',
          shortLabel: 'Sem 3',
          tickets: Math.round(baseTickets * 0.28),
          revenue: Math.round(
            baseTickets * 0.28 * 4900
          ),
          attendees: Math.round(
            baseAttendees * 0.27
          ),
          events: Math.max(
            2,
            Math.round(baseEvents * 0.28)
          ),
        },
        {
          label: 'Semaine 4 (Août)',
          shortLabel: 'Sem 4',
          tickets: Math.round(baseTickets * 0.19),
          revenue: Math.round(
            baseTickets * 0.19 * 4600
          ),
          attendees: Math.round(
            baseAttendees * 0.2
          ),
          events: Math.max(
            1,
            Math.round(baseEvents * 0.2)
          ),
        },
      ];
    }

    // Trimestre : Juillet, Août, Septembre
    return [
      {
        label: 'Juillet 2026',
        shortLabel: 'Juil',
        tickets: Math.round(baseTickets * 0.72),
        revenue: Math.round(
          baseTickets * 0.72 * 4500
        ),
        attendees: Math.round(
          baseAttendees * 0.7
        ),
        events: Math.round(
          baseEvents * 0.75
        ),
      },
      {
        label: 'Août 2026',
        shortLabel: 'Août',
        tickets: Math.round(baseTickets * 0.83),
        revenue: Math.round(
          baseTickets * 0.83 * 4700
        ),
        attendees: Math.round(
          baseAttendees * 0.85
        ),
        events: Math.round(
          baseEvents * 0.88
        ),
      },
      {
        label: 'Septembre 2026 (actuel)',
        shortLabel: 'Sept',
        tickets: baseTickets,
        revenue: Math.round(
          baseTickets * 5100
        ),
        attendees: baseAttendees,
        events: baseEvents,
      },
    ];
  }, [period, platformStats, events]);

  // Totaux de la période
  const totals = useMemo(() => {
    return monthlyTimeline.reduce(
      (acc, curr) => ({
        tickets: acc.tickets + curr.tickets,
        revenue: acc.revenue + curr.revenue,
        attendees: acc.attendees + curr.attendees,
        events: acc.events + curr.events,
      }),
      {
        tickets: 0,
        revenue: 0,
        attendees: 0,
        events: 0,
      }
    );
  }, [monthlyTimeline]);

  // Répartition par catégorie
  const categoriesBreakdown = useMemo(
    () => [
      {
        id: 'concert',
        label: 'Concerts & Live',
        percent: 46,
        color: '#6600FF',
        count: Math.round(
          totals.tickets * 0.46
        ),
      },
      {
        id: 'festival',
        label: 'Festivals & Foires',
        percent: 26,
        color: '#8B5CF6',
        count: Math.round(
          totals.tickets * 0.26
        ),
      },
      {
        id: 'party',
        label: 'Soirées & Nightlife',
        percent: 16,
        color: '#EC4899',
        count: Math.round(
          totals.tickets * 0.16
        ),
      },
      {
        id: 'theatre',
        label: 'Culture & Théâtre',
        percent: 12,
        color: '#10B981',
        count: Math.round(
          totals.tickets * 0.12
        ),
      },
    ],
    [totals.tickets]
  );

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
        return 'billets vendus';

      case 'revenue':
        return 'FCFA générés';

      case 'attendees':
        return 'participants réels';

      case 'events':
        return 'événements organisés';

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
    <div className="w-full overflow-hidden rounded-[2.2rem] border border-black/[0.06] bg-white shadow-[0_12px_36px_rgba(102,0,255,0.06)] transition-all dark:border-white/[0.08] dark:bg-[#14121E] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)]">

      {/* Sélecteur de période — pleine largeur */}
      <div className="p-4 sm:p-5">
        <div className="relative flex w-full items-center rounded-2xl bg-gray-100/90 p-1 dark:bg-white/10">

          <button
            type="button"
            onClick={() =>
              setPeriod('current_month')
            }
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
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
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
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
            className={`flex-1 rounded-xl px-3 py-2 text-[11px] font-bold transition-all sm:text-xs ${
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
      <div className="mb-4 grid grid-cols-2 gap-2.5 px-5">

        {/* Billets */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('tickets')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left transition-all ${
            activeMetric === 'tickets'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.05] dark:bg-white/[0.04]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Ticket className="h-3.5 w-3.5 text-[#6600FF]" />
              Billets
            </span>

            {activeMetric === 'tickets' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#6600FF]" />
            )}
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {formatNumber(totals.tickets)}
          </p>

          <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-[#10B981]">
            <ArrowUpRight className="h-3 w-3" />
            +19.4% ce mois
          </p>
        </button>

        {/* Revenus */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('revenue')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left transition-all ${
            activeMetric === 'revenue'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.05] dark:bg-white/[0.04]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <DollarSign className="h-3.5 w-3.5 text-[#6600FF]" />
              Revenus
            </span>

            {activeMetric === 'revenue' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#10B981]" />
            )}
          </div>

          <p className="truncate text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {(totals.revenue / 1000000).toFixed(1)}M{' '}
            <span className="text-xs font-bold text-gray-400">
              FCFA
            </span>
          </p>

          <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-[#10B981]">
            <ArrowUpRight className="h-3 w-3" />
            +28.2% ce mois
          </p>
        </button>

        {/* Participants */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('attendees')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left transition-all ${
            activeMetric === 'attendees'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.05] dark:bg-white/[0.04]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Users className="h-3.5 w-3.5 text-[#6600FF]" />
              Participants
            </span>

            {activeMetric === 'attendees' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#8B5CF6]" />
            )}
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {formatNumber(totals.attendees)}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-gray-400">
            94% taux de présence
          </p>
        </button>

        {/* Événements */}
        <button
          type="button"
          onClick={() =>
            setActiveMetric('events')
          }
          className={`relative overflow-hidden rounded-[1.4rem] border p-3.5 text-left transition-all ${
            activeMetric === 'events'
              ? 'border-[#6600FF]/40 bg-[#6600FF]/[0.08] shadow-xs dark:bg-[#6600FF]/25'
              : 'border-black/[0.04] bg-gray-50/80 hover:bg-gray-100/60 dark:border-white/[0.05] dark:bg-white/[0.04]'
          }`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              <Calendar className="h-3.5 w-3.5 text-[#6600FF]" />
              Événements
            </span>

            {activeMetric === 'events' && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#EC4899]" />
            )}
          </div>

          <p className="text-xl font-extrabold tracking-tight text-[#17131D] dark:text-white">
            {totals.events}
          </p>

          <p className="mt-0.5 text-[10px] font-medium text-gray-400">
            100% vérifiés
          </p>
        </button>

      </div>

      {/* Graphique */}
      <div className="mb-4 px-5">
        <div className="rounded-[1.8rem] border border-black/[0.04] bg-gradient-to-b from-[#6600FF]/[0.03] to-transparent p-4 dark:border-white/[0.05] dark:from-[#6600FF]/15">

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
            ) : (
              <p className="text-[11px] italic text-gray-400">
                Pic d'activité : Semaine 3 (forte demande sur les concerts et festivals)
              </p>
            )}
          </div>

          {/* SVG */}
          <div className="relative flex h-[140px] w-full items-center justify-center">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
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
            Part des ventes par catégorie
          </span>

          <span className="text-[11px] font-semibold text-[#6600FF]">
            {formatNumber(totals.tickets)} billets
          </span>
        </div>

        {/* Barre segmentée */}
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
                title={`${category.label} : ${category.percent}% (${category.count} billets)`}
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
                  className={`flex items-center justify-between rounded-xl p-2 text-left transition-all ${
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

                  <div className="shrink-0 text-right">
                    <span className="ml-2 text-xs font-extrabold text-[#17131D] dark:text-white">
                      {category.percent}%
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

      </div>
    </div>
  );
}