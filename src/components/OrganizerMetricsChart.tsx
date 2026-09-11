import { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  Ticket,
  DollarSign,
  Eye,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { formatNumber } from '@/utils/format';

export interface PerformanceTimePoint {
  date: string;
  label: string;
  ticketsSold: number;
  revenue: number;
  cumulativeTickets: number;
  cumulativeRevenue: number;
}

export interface TicketTypeBreakdown {
  name: string;
  count: number;
  revenue: number;
  color: string;
}

export interface OrganizerPerformanceData {
  timeSeries: PerformanceTimePoint[];
  categoryBreakdown: TicketTypeBreakdown[];
  summary: {
    totalTickets: number;
    totalRevenue: number;
    totalViews: number;
    conversionRate: number;
    averageTicketPrice: number;
    activeEvents: number;
    totalEvents: number;
  };
}

interface OrganizerMetricsChartProps {
  data: OrganizerPerformanceData;
  loading?: boolean;
  timeRange: '7d' | '30d' | 'all';
  onTimeRangeChange: (range: '7d' | '30d' | 'all') => void;
}

type MetricMode = 'sales' | 'revenue' | 'breakdown';

export function OrganizerMetricsChart({
  data,
  loading = false,
  timeRange,
  onTimeRangeChange,
}: OrganizerMetricsChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('sales');

  const { timeSeries, categoryBreakdown, summary } = data;

  const hasSalesData = summary.totalTickets > 0 || timeSeries.some((p) => p.ticketsSold > 0);

  // Custom Glassmorphism Tooltip
  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload: PerformanceTimePoint }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="rounded-2xl bg-zinc-900/95 dark:bg-black/95 text-white p-3.5 shadow-2xl border border-white/10 backdrop-blur-xl text-xs space-y-1.5 min-w-[150px]">
          <p className="font-bold text-gray-400">{point.label || label}</p>
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-white/10">
            <span className="text-gray-300 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-[#6600FF]" /> Billets :
            </span>
            <span className="font-black text-white">{point.ticketsSold}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-300 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Revenus :
            </span>
            <span className="font-black text-emerald-400">
              {point.revenue.toLocaleString('fr-FR')} F
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-[2rem] bg-white/90 dark:bg-[#151322]/90 backdrop-blur-2xl p-5 shadow-[0_12px_40px_rgba(102,0,255,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] border border-black/[0.06] dark:border-white/[0.08] mb-6 overflow-hidden">
      {/* Top Header with title & time filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-black text-[#17131D] dark:text-white tracking-tight">
              Performances des ventes
            </h2>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium ml-10">
            Données réelles issues de vos billetteries
          </p>
        </div>

        {/* Time range selector pill */}
        <div className="inline-flex p-1 bg-gray-100 dark:bg-white/10 rounded-full shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onTimeRangeChange('7d')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
              timeRange === '7d'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            7 jours
          </button>
          <button
            type="button"
            onClick={() => onTimeRangeChange('30d')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
              timeRange === '30d'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            30 jours
          </button>
          <button
            type="button"
            onClick={() => onTimeRangeChange('all')}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer ${
              timeRange === 'all'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'
            }`}
          >
            Tout
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        {/* Billets vendus */}
        <div
          onClick={() => setMetricMode('sales')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            metricMode === 'sales'
              ? 'bg-[#6600FF]/[0.08] dark:bg-[#6600FF]/20 border-[#6600FF]/40 shadow-xs'
              : 'bg-gray-50/80 dark:bg-white/[0.04] border-black/5 dark:border-white/5 hover:bg-gray-100/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Billets</span>
            <Ticket className={`w-3.5 h-3.5 ${metricMode === 'sales' ? 'text-[#6600FF]' : 'text-gray-400'}`} />
          </div>
          <p className="text-xl font-black text-[#17131D] dark:text-white">
            {formatNumber(summary.totalTickets)}
          </p>
          <span className="text-[10px] font-semibold text-gray-400">
            {summary.activeEvents} événement(s) actif(s)
          </span>
        </div>

        {/* Chiffre d'affaires */}
        <div
          onClick={() => setMetricMode('revenue')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            metricMode === 'revenue'
              ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/20 border-emerald-500/40 shadow-xs'
              : 'bg-gray-50/80 dark:bg-white/[0.04] border-black/5 dark:border-white/5 hover:bg-gray-100/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Revenus</span>
            <DollarSign className={`w-3.5 h-3.5 ${metricMode === 'revenue' ? 'text-emerald-500' : 'text-gray-400'}`} />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.totalRevenue.toLocaleString('fr-FR')} <span className="text-xs font-bold">F</span>
          </p>
          <span className="text-[10px] font-semibold text-gray-400">
            Moy. {summary.averageTicketPrice.toLocaleString('fr-FR')} F
          </span>
        </div>

        {/* Vues totales */}
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Vues</span>
            <Eye className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-black text-[#17131D] dark:text-white">
            {formatNumber(summary.totalViews)}
          </p>
          <span className="text-[10px] font-semibold text-gray-400">
            {summary.totalEvents} événements créés
          </span>
        </div>

        {/* Taux de conversion ou Répartition */}
        <div
          onClick={() => setMetricMode('breakdown')}
          className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
            metricMode === 'breakdown'
              ? 'bg-purple-500/[0.08] dark:bg-purple-500/20 border-purple-500/40 shadow-xs'
              : 'bg-gray-50/80 dark:bg-white/[0.04] border-black/5 dark:border-white/5 hover:bg-gray-100/80'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">Conversion</span>
            <Layers className={`w-3.5 h-3.5 ${metricMode === 'breakdown' ? 'text-purple-500' : 'text-gray-400'}`} />
          </div>
          <p className="text-xl font-black text-[#17131D] dark:text-white">
            {summary.conversionRate.toFixed(1)}%
          </p>
          <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
            <span>Par catégorie</span>
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="h-56 w-full pt-2">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-[#6600FF]/20 border-t-[#6600FF] animate-spin" />
            <span>Chargement des métriques...</span>
          </div>
        ) : metricMode === 'breakdown' ? (
          /* Bar Chart for Ticket Categories */
          categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
                <XAxis dataKey="name" stroke="#88888880" fontSize={11} tickLine={false} />
                <YAxis stroke="#88888880" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as TicketTypeBreakdown;
                      return (
                        <div className="rounded-xl bg-zinc-900 text-white p-2.5 text-xs shadow-xl border border-white/10">
                          <p className="font-bold">{item.name}</p>
                          <p className="text-gray-400 mt-0.5">{item.count} billet(s) vendus</p>
                          <p className="text-emerald-400 font-bold">{item.revenue.toLocaleString('fr-FR')} FCFA</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#6600FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
              <Info className="w-6 h-6 text-gray-400 mb-1" />
              <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                Aucune catégorie de billet enregistrée pour le moment
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Créez des billets standard, VIP ou VVIP pour visualiser la répartition.
              </p>
            </div>
          )
        ) : (
          /* Area Chart for Ticket Sales or Revenue Over Time */
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* Purple gradient for sales */}
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6600FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6600FF" stopOpacity={0.0} />
                </linearGradient>

                {/* Emerald gradient for revenue */}
                <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#88888820" vertical={false} />
              <XAxis dataKey="label" stroke="#88888880" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#88888880"
                fontSize={11}
                tickLine={false}
                allowDecimals={false}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
              />
              <Tooltip content={<CustomTooltip />} />

              {metricMode === 'sales' ? (
                <Area
                  type="monotone"
                  dataKey="ticketsSold"
                  name="Billets vendus"
                  stroke="#6600FF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#purpleGradient)"
                  dot={{ r: 3, fill: '#6600FF', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#6600FF' }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenus (FCFA)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#emeraldGradient)"
                  dot={{ r: 3, fill: '#10B981', strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 5, fill: '#10B981' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {!hasSalesData && (
        <div className="mt-3 p-3 rounded-2xl bg-[#6600FF]/[0.04] dark:bg-[#6600FF]/10 border border-[#6600FF]/10 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#6600FF] shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
            Dès qu’un utilisateur réservera ou achètera un billet pour vos événements, les courbes de ventes et de revenus s'actualiseront automatiquement en temps réel.
          </p>
        </div>
      )}
    </div>
  );
}
