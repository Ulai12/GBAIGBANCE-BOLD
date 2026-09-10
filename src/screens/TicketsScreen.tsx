import { useState, useEffect } from 'react';
import { Ticket as TicketIcon, QrCode, Calendar, MapPin, X, Share2, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchUserTickets, cancelTicket } from '@/services/events';
import { getCachedUserTickets, saveCachedUserTickets, getSyncCachedUserTickets } from '@/services/cache';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { TicketsScreenSkeleton } from '@/components/Skeleton';
import type { Event, Ticket } from '@/types';
import type { ToastData } from '@/components/Toast';

interface TicketsScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

let cachedTickets: { userId: string; tickets: (Ticket & { event?: Event })[] } | null = null;

export function TicketsScreen({ onEventClick, onLogin, onToast }: TicketsScreenProps) {
  const { session, user, isSessionResolving } = useApp();
  const initialTickets = user
    ? (cachedTickets && cachedTickets.userId === user.id ? cachedTickets.tickets : getSyncCachedUserTickets(user.id))
    : [];
  const hasCache = initialTickets.length > 0;
  const [tickets, setTickets] = useState<(Ticket & { event?: Event })[]>(initialTickets);
  const [loading, setLoading] = useState(() => !!user && !hasCache);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [viewingTicket, setViewingTicket] = useState<(Ticket & { event?: Event }) | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // 1. Instant hydration from private IndexedDB for 0ms access at concert gates even if offline
    let isMounted = true;
    getCachedUserTickets(user.id).then((storedTickets) => {
      if (isMounted && storedTickets && storedTickets.length > 0) {
        cachedTickets = { userId: user.id, tickets: storedTickets };
        setTickets(storedTickets);
        setLoading(false);
      }
    });

    // 2. Background revalidation from network
    fetchUserTickets(user.id)
      .then((data) => {
        if (!isMounted) return;
        const list = (data as (Ticket & { event?: Event })[]) || [];
        setTickets(list);
        cachedTickets = { userId: user.id, tickets: list };
        saveCachedUserTickets(user.id, list).catch(() => {});
      })
      .catch(() => {
        // Keep private offline tickets loaded from IndexedDB
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleCancel = async () => {
    if (!cancelTarget || !user) return;
    setCancelling(true);
    try {
      const result = await cancelTicket(cancelTarget);
      if (result.success) {
        onToast({ message: 'Billet annulé avec succès', type: 'success' });
        const updated = tickets.map((t) => (t.id === cancelTarget ? { ...t, status: 'cancelled' } : t));
        setTickets(updated);
        cachedTickets = { userId: user.id, tickets: updated };
        saveCachedUserTickets(user.id, updated).catch(() => {});
      } else {
        onToast({ message: result.error || 'Erreur lors de l’annulation', type: 'error' });
      }
    } catch {
      onToast({ message: 'Erreur réseau', type: 'error' });
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const handleShareTicket = async (ticket: Ticket & { event?: Event }) => {
    const title = ticket.event?.title || 'Mon billet Gbaïgbancê';
    const text = `Je vais à ${title} ! Réserve ta place sur Gbaïgbancê.`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        onToast({ message: 'Lien copié dans le presse-papiers !', type: 'success' });
      } catch {
        onToast({ message: 'Impossible de copier le lien', type: 'error' });
      }
    }
  };

  // Prevent login flash: if session is still resolving on boot and we don't have user yet, show skeleton
  if (isSessionResolving && !user) {
    return <TicketsScreenSkeleton />;
  }

  // If session resolution has finished and there is strictly no user nor session, show login CTA
  if (!session && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#6600FF]/10 dark:bg-[#6600FF]/25 flex items-center justify-center mb-4 text-[#6600FF] dark:text-[#A78BFA]">
          <TicketIcon className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-black text-[#17131D] dark:text-white mb-2">
          Vos billets & Pass d'accès
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-6 leading-relaxed">
          Connectez-vous pour retrouver vos billets électroniques et présenter vos QR codes d'entrée.
        </p>
        <button
          type="button"
          onClick={onLogin}
          className="px-8 py-3.5 rounded-full bg-[#6600FF] text-white text-xs font-black shadow-md hover:bg-[#5200cc] transition-all"
        >
          Se connecter
        </button>
      </div>
    );
  }

  if (loading && tickets.length === 0) {
    return <TicketsScreenSkeleton />;
  }

  const activeTickets = tickets.filter((t) => t.status === 'active');
  const pastTickets = tickets.filter((t) => t.status !== 'active');
  const displayedTickets = activeTab === 'active' ? activeTickets : pastTickets;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
          Accès & Pass
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <h1 className="text-3xl font-black text-[#17131D] dark:text-white tracking-tight">
            Mes billets
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-black">
            {activeTickets.length} valide{activeTickets.length > 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Tous vos pass d'entrée sécurisés avec QR code hors-ligne
        </p>
      </div>

      {/* Offline banner notice */}
      {typeof navigator !== 'undefined' && !navigator.onLine && tickets.length > 0 && (
        <div className="mx-5 mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <QrCode className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">Mode hors-ligne : Billets & QR codes sauvegardés prêts pour scan à l'entrée</span>
        </div>
      )}

      {/* Segmented control */}
      <div className="px-5 mt-3">
        <div className="p-1 bg-gray-200/70 dark:bg-white/10 rounded-2xl flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'active'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Billets valides ({activeTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'history'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Historique ({pastTickets.length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="px-5 mt-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-gray-200/70 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={activeTab === 'active' ? 'Aucun billet actif' : 'Aucun historique'}
              description={
                activeTab === 'active'
                  ? 'Vous n’avez aucun billet à venir. Explorez les événements tendance pour réserver votre place !'
                  : 'Vos billets utilisés ou annulés apparaîtront ici.'
              }
              icon={<TicketIcon className="w-12 h-12 text-[#6600FF]/40" />}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {displayedTickets.map((ticket) => {
              const isValid = ticket.status === 'active';
              return (
                <div
                  key={ticket.id}
                  className="rounded-3xl overflow-hidden bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] shadow-sm relative transition-all"
                >
                  {/* Top part */}
                  <div className="p-4 sm:p-5 flex items-start gap-3.5">
                    <button
                      type="button"
                      onClick={() => ticket.event && onEventClick(ticket.event)}
                      className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                    >
                      <img
                        src={ticket.event?.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=300'}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isValid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : ticket.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                          }`}
                        >
                          {isValid ? 'VALIDE' : ticket.status === 'cancelled' ? 'ANNULÉ' : ticket.status.toUpperCase()}
                        </span>
                        {ticket.event && (
                          <button
                            type="button"
                            onClick={() => onEventClick(ticket.event!)}
                            className="text-gray-400 hover:text-[#6600FF] dark:hover:text-white"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <h3
                        onClick={() => ticket.event && onEventClick(ticket.event)}
                        className="font-black text-sm text-[#17131D] dark:text-white truncate mt-1 cursor-pointer hover:underline"
                      >
                        {ticket.event?.title || 'Événement Gbaïgbancê'}
                      </h3>

                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
                        <span>
                          {ticket.event
                            ? new Date(ticket.event.starts_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
                        <span className="truncate">{ticket.event?.location_name || ticket.event?.city || 'Abidjan'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cutout notch divider adapting to dark mode */}
                  <div className="relative flex items-center">
                    <div className="absolute left-0 w-4 h-5 rounded-r-full bg-[#EDE8FF] dark:bg-[#14121E]" />
                    <div className="flex-1 border-t-2 border-dashed border-gray-200 dark:border-white/10 mx-5" />
                    <div className="absolute right-0 w-4 h-5 rounded-l-full bg-[#EDE8FF] dark:bg-[#14121E]" />
                  </div>

                  {/* Bottom part */}
                  <div className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Pass</p>
                      <p className="font-black text-xs text-[#17131D] dark:text-white">
                        {ticket.ticket_type?.toUpperCase() || 'STANDARD'}
                      </p>
                      {ticket.qr_code && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                          REF: {ticket.qr_code.slice(0, 12)}...
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleShareTicket(ticket)}
                        className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#6600FF] transition-all"
                        title="Partager"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {isValid && (
                        <>
                          <button
                            type="button"
                            onClick={() => setViewingTicket(ticket)}
                            className="px-3.5 py-2 rounded-2xl bg-[#6600FF] text-white flex items-center gap-1.5 text-xs font-black shadow-xs hover:bg-[#5200cc] transition-all"
                            title="Voir le QR code"
                          >
                            <QrCode className="w-4 h-4" />
                            <span>QR Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(ticket.id)}
                            className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                            title="Annuler le billet"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Confirmation Annulation */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Annuler votre billet ?">
        <div className="space-y-4 text-[#17131D] dark:text-white">
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Êtes-vous sûr de vouloir annuler ce billet ? Votre place sera immédiatement remise en vente pour la communauté.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCancelTarget(null)}
              className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold text-xs"
            >
              Conserver mon billet
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-colors"
            >
              {cancelling ? 'Annulation...' : 'Oui, annuler'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal QR Code */}
      <Modal open={!!viewingTicket} onClose={() => setViewingTicket(null)} title="Pass d'accès sécurisé">
        {viewingTicket && (
          <div className="flex flex-col items-center gap-4 text-center text-[#17131D] dark:text-white py-2">
            <div className="p-4 bg-white rounded-3xl shadow-lg ring-1 ring-black/5">
              <QrCode className="w-44 h-44 text-[#17131D]" />
            </div>

            <div>
              <p className="font-black text-sm text-[#17131D] dark:text-white">
                {viewingTicket.event?.title}
              </p>
              <p className="text-xs text-[#6600FF] dark:text-[#A78BFA] font-bold mt-0.5">
                PASS {viewingTicket.ticket_type.toUpperCase()}
              </p>
              <p className="text-[11px] text-gray-400 font-mono mt-1 select-all bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-full inline-block">
                {viewingTicket.qr_code}
              </p>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Présentez ce QR code à l’entrée. Aucun accès réseau requis : le badge est vérifiable hors-ligne.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
