import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Eye, BarChart3, Search, X, Music2, Building2, Ticket as TicketIcon, Trash2, AlertTriangle, XCircle, Info, Settings, Edit3, RotateCcw, Camera, ScanLine } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { SmartImage } from '@/components/SmartImage';
import { OrganizerMetricsChart, type OrganizerPerformanceData } from '@/components/OrganizerMetricsChart';
import { OrganizerRefundsTab } from '@/components/OrganizerRefundsTab';
import { TicketScannerModal } from '@/components/TicketScannerModal';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/services/supabase';
import { EVENT_CATEGORIES } from '@/constants';
import { formatNumber } from '@/utils/format';
import { createEventWithCollaborators, searchArtists, searchOrganizations, fetchEventDeletionInfo, cancelEvent, deleteEvent, fetchOrganizerPerformanceMetrics, subscribeToOrganizerMetricsLive } from '@/services/events';
import { EventManagementModal } from '@/components/EventManagementModal';
import type { Event, EventCategory, Artist, Organization } from '@/types';
import type { ToastData } from '@/components/Toast';

interface OrganizerDashboardScreenProps {
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onEditEvent?: (event: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}
type CollabType = 'artist' | 'organizer';
interface SelectedCollab { user_id: string; name: string; role: 'co_organizer' | 'performer'; type: CollabType; }

export function OrganizerDashboardScreen({ onBack, onEventClick, onEditEvent, onToast }: OrganizerDashboardScreenProps) {
  const { user, t } = useApp();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'concert' as EventCategory, location_name: '', city: 'Lomé', starts_at: '', price_min: '0', cover_url: '', capacity: '' });
  const [creating, setCreating] = useState(false);
  const [ticketOptions, setTicketOptions] = useState([{ ticket_type: 'standard', label: 'Standard', price: '0', quantity_total: '100', description: '' }]);
  const [collaborators, setCollaborators] = useState<SelectedCollab[]>([]);
  const [showCollabSearch, setShowCollabSearch] = useState(false);
  const [collabSearch, setCollabSearch] = useState('');
  const [collabRole, setCollabRole] = useState<'co_organizer' | 'performer'>('performer');
  const [searchResults, setSearchResults] = useState<{ artists: Artist[]; orgs: Organization[] }>({ artists: [], orgs: [] });
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{ ticketsCount: number; collaboratorsCount: number; ticketOptionsCount: number; likesCount: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'cancel' | 'delete'>('cancel');
  const [manageTarget, setManageTarget] = useState<Event | null>(null);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'events' | 'refunds'>('events');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerEventId, setScannerEventId] = useState<string | undefined>(undefined);
  // Par défaut, afficher l'historique disponible plutôt qu'une fenêtre 7 jours souvent vide.
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [perfData, setPerfData] = useState<OrganizerPerformanceData>({
    timeSeries: [],
    categoryBreakdown: [],
    summary: { totalTickets: 0, totalRevenue: 0, totalViews: 0, conversionRate: 0, averageTicketPrice: 0, activeEvents: 0, totalEvents: 0 },
  });

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('events').select('*').eq('organizer_user_id', user.id).order('created_at', { ascending: false });
    setEvents((data as Event[]) || []);
    setLoading(false);
  }, [user]);

  const loadMetrics = useCallback(async () => {
    if (!user) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const data = await fetchOrganizerPerformanceMetrics(user.id, timeRange);
      setPerfData(data);
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : t('organizer', 'metrics.loadError'));
    } finally {
      setMetricsLoading(false);
    }
  }, [user, timeRange, t]);

  useEffect(() => {
    const handleSignedOut = () => {
      setEvents([]);
      // Réinitialisation conforme à l'interface OrganizerPerformanceData
      setPerfData({
        timeSeries: [],
        categoryBreakdown: [],
        summary: { totalTickets: 0, totalRevenue: 0, totalViews: 0, conversionRate: 0, averageTicketPrice: 0, activeEvents: 0, totalEvents: 0 },
      });
      onBack();
    };
    window.addEventListener('gba-user-signed-out', handleSignedOut);
    return () => window.removeEventListener('gba-user-signed-out', handleSignedOut);
  }, [onBack]);

  useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }
    loadEvents();
    loadMetrics();
  }, [user, loadEvents, loadMetrics]);

  // Real-time live synchronization for organizer metrics and sales
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToOrganizerMetricsLive(user.id, () => {
      loadMetrics();
      loadEvents();
    });

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadMetrics();
        loadEvents();
      }
    }, 30000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [user, loadEvents, loadMetrics]);

  useEffect(() => {
    if (!collabSearch.trim()) {
      setSearchResults({ artists: [], orgs: [] });
      return;
    }
    setSearching(true);
    Promise.all([searchArtists(collabSearch), searchOrganizations(collabSearch)])
      .then(([artists, orgs]) => setSearchResults({ artists, orgs }))
      .catch(() => setSearchResults({ artists: [], orgs: [] }))
      .finally(() => setSearching(false));
  }, [collabSearch]);

  const addCollaborator = (id: string, name: string, type: CollabType) => { if (collaborators.some((c) => c.user_id === id)) return; setCollaborators([...collaborators, { user_id: id, name, role: collabRole, type }]); setShowCollabSearch(false); setCollabSearch(''); };
  const removeCollaborator = (userId: string) => { setCollaborators(collaborators.filter((c) => c.user_id !== userId)); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || !form.title || !form.starts_at) return; setCreating(true);
    try {
      const validTickets = ticketOptions.filter((tk) => tk.label.trim() && tk.quantity_total).map((tk) => ({ ticket_type: tk.ticket_type, label: tk.label, price: parseFloat(tk.price) || 0, quantity_total: parseInt(tk.quantity_total) || 100, description: tk.description || undefined }));
      const validCollabs = collaborators.map((c) => ({ user_id: c.user_id, role: c.role }));
      const createdByRole = user.role === 'artist' ? 'artist' : 'organizer';
      const event = await createEventWithCollaborators({ title: form.title, description: form.description, category: form.category, location_name: form.location_name || t('organizer', 'create.locationFallback'), city: form.city, starts_at: form.starts_at, price_min: parseFloat(form.price_min) || 0, cover_url: form.cover_url, capacity: form.capacity ? parseInt(form.capacity) : undefined, created_by_role: createdByRole }, validCollabs, validTickets, user.id);
      if (!event) throw new Error('Échec de création');
      onToast({ message: t('organizer', 'toast.created'), type: 'success' }); setShowCreate(false);
      setForm({ title: '', description: '', category: 'concert', location_name: '', city: 'Lomé', starts_at: '', price_min: '0', cover_url: '', capacity: '' });
      setTicketOptions([{ ticket_type: 'standard', label: 'Standard', price: '0', quantity_total: '100', description: '' }]); setCollaborators([]); loadEvents(); loadMetrics();
    } catch { onToast({ message: t('organizer', 'toast.createError'), type: 'error' }); } finally { setCreating(false); }
  };

  const isArtist = user?.role === 'artist';
  const openDeleteModal = async (event: Event) => { setDeleteTarget(event); setDeleteInfo(null); setDeleteMode('cancel'); const info = await fetchEventDeletionInfo(event.id); setDeleteInfo(info); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteMode === 'cancel') {
        await cancelEvent(deleteTarget.id);
        onToast({ message: t('organizer', 'toast.cancelled'), type: 'success' });
      } else {
        await deleteEvent(deleteTarget.id);
        onToast({ message: t('organizer', 'toast.deleted'), type: 'success' });
      }
      window.dispatchEvent(new CustomEvent('gba-refresh-events'));
      setDeleteTarget(null);
      loadEvents();
      loadMetrics();
    } catch (err) {
      const msg = (err && typeof err === 'object' && 'message' in err) ? (err as { message: string }).message : t('common', 'error');
      onToast({ message: msg, type: 'error' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-30 px-5 pt-safe-header pb-4 bg-[#F7F5F0]/85 dark:bg-[#141216]/85 backdrop-blur-lg border-b border-black/5 dark:border-white/5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-gray-500 font-medium"{t('common', 'back')}</button>
          <h1 className="text-lg font-bold text-[#1A1A2E] dark:text-white">{t('organizer', isArtist ? 'artistTitle' : 'dashboardTitle')}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setScannerEventId(undefined);
                setScannerOpen(true);
              }}
              className="h-9 px-3 rounded-full bg-gradient-to-r from-[#6600FF] to-[#8B5CF6] flex items-center gap-1.5 text-white shadow-purple active:scale-95 transition-all text-xs font-bold cursor-pointer"
              title={t('organizer', 'scanner.buttonTitle')}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('organizer', 'scanner.button')}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              aria-label={t('organizer', 'create.openAria')}
              className="w-9 h-9 rounded-full bg-[#6600FF] flex items-center justify-center text-white shadow-purple active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6">
        {/* Recharts Performance Trends & Sales Visualization */}
        <OrganizerMetricsChart
          data={perfData}
          loading={metricsLoading}
          error={metricsError}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />

        {/* Quick Action: Scanner de Billets Caméra */}
        <div className="card p-3.5 mb-5 bg-gradient-to-br from-[#6600FF]/10 via-purple-500/5 to-transparent border border-[#6600FF]/25 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] flex items-center justify-center text-white shrink-0 shadow-purple">
              <ScanLine className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[#1A1A2E] dark:text-white text-xs sm:text-sm">{t('organizer', 'scanner.quickTitle')}</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{t('organizer', 'scanner.quickDescription')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setScannerEventId(undefined);
              setScannerOpen(true);
            }}
            className="btn-purple py-2 px-3 text-xs shrink-0 flex items-center gap-1.5 shadow-purple active:scale-95 transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('organizer', 'scanner.open')}</span>
          </button>
        </div>

        {/* Tab switch Mes événements / Remboursements */}
        <div className="flex bg-gray-200/70 dark:bg-white/10 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => setActiveDashboardTab('events')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeDashboardTab === 'events'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {t('organizer', 'tabs.events')} ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveDashboardTab('refunds')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeDashboardTab === 'refunds'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('organizer', 'tabs.refunds')}
          </button>
        </div>

        {activeDashboardTab === 'refunds' ? (
          <OrganizerRefundsTab organizerUserId={user?.id || ''} onToast={onToast} />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A2E] dark:text-white">
                <BarChart3 className="w-5 h-5 text-[#6600FF]" /> {t('organizer', 'events.listTitle')}
              </h2>
              <span className="text-sm text-gray-500">{events.length}</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="card p-4 flex gap-3">
                    <Skeleton className="w-16 h-16 rounded-xl" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title={t('organizer', 'events.emptyTitle')}
                description={t('organizer', 'events.emptyDescription')}
                action={<button onClick={() => setShowCreate(true)} className="btn-purple px-6 py-2.5 text-sm">{t('organizer', 'actions.create')}</button>}
              />
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="card p-4 flex items-center gap-3 cursor-pointer hover:shadow-card-hover transition-all"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/5">
                      <SmartImage
                        src={event.cover_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1A1A2E] dark:text-white text-sm line-clamp-1">{event.title}</h3>
                      <p className="text-xs text-gray-500">{t('events', `categories.${event.category}`)} · {event.city}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{formatNumber(event.attendees_count)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(event.views_count)}</span>
                        {event.status === 'cancelled' && <span className="text-red-500 font-semibold">{t('organizer', 'events.status.cancelled')}</span>}
                        {event.status === 'pending' && <span className="text-amber-500 font-semibold">{t('organizer', 'events.status.pending')}</span>}
                        {event.status === 'suspended' && <span className="text-orange-500 font-semibold">{t('organizer', 'events.status.suspended')}</span>}
                        {event.status === 'postponed' && <span className="text-indigo-500 font-semibold">{t('organizer', 'events.status.postponed')}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setScannerEventId(event.id);
                        setScannerOpen(true);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-[#6600FF] bg-[#6600FF]/10 hover:bg-[#6600FF]/20 transition-all shrink-0 cursor-pointer"
                      aria-label={t('organizer', 'scanner.scanEventAria')}
                      title={t('organizer', 'scanner.scanAtDeskTitle')}
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                    {onEditEvent && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-[#6600FF] hover:bg-[#6600FF]/10 transition-all shrink-0 cursor-pointer"
                        aria-label={t('organizer', 'actions.editEventAria')}
                        title={t('organizer', 'actions.editEventTitle')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openDeleteModal(event); }}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shrink-0 cursor-pointer"
                      aria-label={t('organizer', 'actions.manageDeletionAria')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Event Modal - simplified form */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={t('organizer', 'create.title')}>
        <form onSubmit={handleCreate} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.titleLabel')}</label>
            <input
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder={t('organizer', 'create.titlePlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.descriptionLabel')}</label>
            <textarea
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('organizer', 'create.descriptionPlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.categoryLabel')}</label>
              <select
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as EventCategory })}
              >
                {EVENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t('events', `categories.${c}`) || c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.cityLabel')}</label>
              <input
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.locationLabel')}</label>
            <input
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
              placeholder={t('organizer', 'create.locationPlaceholder')}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.dateTimeLabel')}</label>
            <input
              type="datetime-local"
              className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.minPriceLabel')}</label>
              <input
                type="number"
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
                value={form.price_min}
                onChange={(e) => setForm({ ...form, price_min: e.target.value })}
                min="0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t('organizer', 'create.capacityLabel')}</label>
              <input
                type="number"
                className="w-full mt-1 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 border-0 text-sm font-medium"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                min="0"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3.5 rounded-2xl bg-[#6600FF] text-white font-bold text-sm disabled:opacity-50"
          >
            {creating ? t('organizer', 'create.submitting') : t('organizer', 'create.submit')}
          </button>
        </form>
      </Modal>

      {/* Delete / Cancel Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('organizer', 'delete.title')}>
        <div className="space-y-4">
          {deleteTarget && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-bold text-[#1A1A2E] dark:text-white">{deleteTarget.title}</span>
            </p>
          )}
          {!deleteInfo ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-8 h-8 rounded-full border-3 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-center">
                  <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{deleteInfo.ticketsCount}</p>
                  <p className="text-xs text-gray-500">{t('organizer', 'delete.activeTickets')}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-center">
                  <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{deleteInfo.collaboratorsCount}</p>
                  <p className="text-xs text-gray-500">{t('organizer', 'delete.collaborators')}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-center">
                  <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{deleteInfo.ticketOptionsCount}</p>
                  <p className="text-xs text-gray-500">{t('organizer', 'delete.ticketTypes')}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-2xl text-center">
                  <p className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white">{deleteInfo.likesCount}</p>
                  <p className="text-xs text-gray-500">{t('organizer', 'delete.likes')}</p>
                </div>
              </div>
              {deleteInfo.ticketsCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">{t('organizer', 'delete.noticeExistingTickets').replace('{count}', formatNumber(deleteInfo.ticketsCount))}</p>
                </div>
              )}
              <div className="space-y-2">
                <button
                  onClick={() => setDeleteMode('cancel')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    deleteMode === 'cancel' ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className={`w-5 h-5 ${deleteMode === 'cancel' ? 'text-amber-500' : 'text-gray-400'}`} />
                    <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{t('organizer', 'delete.cancelTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-7">{t('organizer', 'delete.cancelDescription')}</p>
                </button>
                <button
                  onClick={() => setDeleteMode('delete')}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    deleteMode === 'delete' ? 'border-red-400 bg-red-50 dark:bg-red-500/10' : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className={`w-5 h-5 ${deleteMode === 'delete' ? 'text-red-500' : 'text-gray-400'}`} />
                    <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{t('organizer', 'delete.deleteTitle')}</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-7">{t('organizer', 'delete.deleteDescription')}</p>
                </button>
              </div>
              {deleteMode === 'delete' && deleteInfo.ticketsCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-300">{t('organizer', 'delete.warningTickets').replace('{count}', formatNumber(deleteInfo.ticketsCount))}</p>
                </div>
              )}
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all disabled:opacity-50 ${
                  deleteMode === 'cancel' ? 'bg-amber-500' : 'bg-red-500'
                }`}
              >
                {deleteLoading ? t('organizer', 'delete.processing') : deleteMode === 'cancel' ? t('organizer', 'delete.cancelTitle') : t('organizer', 'delete.deleteTitle')}
              </button>
            </>
          )}
        </div>
      </Modal>

      <EventManagementModal event={manageTarget} onClose={() => setManageTarget(null)} onToast={onToast} />

      <TicketScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        events={events}
        initialEventId={scannerEventId}
        onToast={onToast}
      />
    </div>
  );
}
