import { useState, useEffect, useCallback } from 'react';
import { 
  Ticket as TicketIcon, 
  QrCode, 
  Gift
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { haptic } from '@/hooks/useHaptics';
import {
  fetchUserTickets,
  subscribeToUserTicketsLive,
  subscribeToGlobalEventsLive,
} from '@/services/events';
import {
  getCachedUserTickets,
  saveCachedUserTickets,
  getSyncCachedUserTickets,
  getCachedTicketsMemory,
  setCachedTicketsMemory,
  clearCachedTicketsMemory,
} from '@/services/cache';
import { claimTicketByToken, regenerateClaimLink } from '@/features/tickets/service';
import { WalletPosterTicket } from '@/components/WalletPosterTicket';
import { RefundRequestModal } from '@/components/RefundRequestModal';
import { PresenceChallengeModal } from '@/components/PresenceChallengeModal';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { TicketsScreenSkeleton } from '@/components/Skeleton';
import type { Event, Ticket } from '@/types';
import type { ToastData } from '@/components/Toast';

export { clearCachedTicketsMemory };

interface TicketsScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function TicketsScreen({ onEventClick, onLogin, onToast }: TicketsScreenProps) {
  const { session, user, isSessionResolving } = useApp();
  const cached = user ? getCachedTicketsMemory(user.id) : null;
  const initialTickets = user
    ? (cached ?? getSyncCachedUserTickets(user.id))
    : [];
  const hasCache = initialTickets.length > 0;
  
  const [tickets, setTickets] = useState<(Ticket & { event?: Event })[]>(initialTickets);
  const [loading, setLoading] = useState(() => !!user && !hasCache);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  // Modales d'interaction avancées
  const [selectedRefundTicket, setSelectedRefundTicket] = useState<Ticket | null>(null);
  const [selectedChallengeTicket, setSelectedChallengeTicket] = useState<Ticket | null>(null);
  const [claimTokenInput, setClaimTokenInput] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Clear memory and local state when signing out
  useEffect(() => {
    const handleSignedOut = () => {
      clearCachedTicketsMemory();
      setTickets([]);
      setLoading(false);
    };
    window.addEventListener('gba-user-signed-out', handleSignedOut);
    return () => {
      window.removeEventListener('gba-user-signed-out', handleSignedOut);
    };
  }, []);

  // Détection d'un token de réclamation dans l'URL (#claim=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.includes('claim=')) {
      const token = hash.split('claim=')[1]?.split('&')[0];
      if (token) {
        setClaimTokenInput(token);
        setShowClaimModal(true);
      }
    }
  }, []);

  const refreshTickets = useCallback(() => {
    if (!user) return;
    fetchUserTickets(user.id)
      .then((data) => {
        const list = (data as unknown as (Ticket & { event?: Event })[]) || [];
        setTickets(list);
        setCachedTicketsMemory(user.id, list);
        saveCachedUserTickets(user.id, list).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('gba-tickets-count-changed', {
              detail: { count: list.filter((t) => t.status === 'valid' || t.status === 'pending').length },
            })
          );
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setTickets([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    getCachedUserTickets(user.id).then((storedTickets) => {
      if (isMounted && storedTickets && storedTickets.length > 0) {
        setCachedTicketsMemory(user.id, storedTickets);
        setTickets(storedTickets);
        setLoading(false);
      }
    });

    fetchUserTickets(user.id)
      .then((data) => {
        if (!isMounted) return;
        const list = (data as unknown as (Ticket & { event?: Event })[]) || [];
        setTickets(list);
        setCachedTicketsMemory(user.id, list);
        saveCachedUserTickets(user.id, list).catch(() => {});
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('gba-tickets-count-changed', {
              detail: { count: list.filter((t) => t.status === 'valid' || t.status === 'pending').length },
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const unsubRealtime = subscribeToUserTicketsLive(user.id, {
      onTicketCreated: () => refreshTickets(),
      onTicketUpdated: (updatedTicket) => {
        refreshTickets();
        if (updatedTicket.status === 'used') {
          onToast({ message: 'Billet validé à l’entrée avec succès ! 🎉', type: 'success' });
        }
      },
      onTicketCancelled: () => refreshTickets(),
    });

    const unsubGlobalEvents = subscribeToGlobalEventsLive(({ eventType, new: newEvt }) => {
      if (eventType === 'UPDATE' && newEvt?.id) {
        setTickets((prev) =>
          prev.map((t) =>
            t.event && t.event.id === newEvt.id
              ? { ...t, event: { ...t.event, ...(newEvt as Partial<Event>) } as Event }
              : t
          )
        );
      }
    });

    const handleTicketBooked = () => refreshTickets();
    window.addEventListener('gba-ticket-booked', handleTicketBooked);

    return () => {
      isMounted = false;
      unsubRealtime();
      if (unsubGlobalEvents) unsubGlobalEvents();
      window.removeEventListener('gba-ticket-booked', handleTicketBooked);
    };
  }, [user, refreshTickets, onToast]);

  // Réclamation d'un billet offert par un ami
  const handleClaimTicket = async () => {
    if (!claimTokenInput.trim()) return;
    setIsClaiming(true);
    haptic.selection();

    try {
      const res = await claimTicketByToken(claimTokenInput.trim());
      if (!res.success) {
        onToast({ message: res.error || 'Token invalide ou déjà utilisé.', type: 'error' });
        setIsClaiming(false);
        return;
      }

      onToast({ message: res.message || 'Billet réclamé avec succès !', type: 'success' });
      setShowClaimModal(false);
      setClaimTokenInput('');
      // Nettoie l'URL
      if (typeof window !== 'undefined' && window.location.hash.includes('claim=')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      refreshTickets();
    } catch {
      onToast({ message: 'Erreur lors de la réclamation du billet', type: 'error' });
    } finally {
      setIsClaiming(false);
    }
  };

  // Régénération d'un lien d'invitation ami
  const handleRegenerateClaimLink = async (t: Ticket) => {
    haptic.selection();
    try {
      const res = await regenerateClaimLink(t.id);
      if (res.success && res.claim_token) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const url = `${origin}/#claim=${res.claim_token}`;
        navigator.clipboard.writeText(url);
        onToast({ message: 'Nouveau lien copié dans le presse-papier !', type: 'success' });
      } else {
        onToast({ message: res.error || 'Impossible de régénérer le lien', type: 'error' });
      }
    } catch {
      onToast({ message: 'Erreur de connexion', type: 'error' });
    }
  };

  // Décision sur événement reporté (Garder son billet)
  const handlePostponedDecision = (ticket: Ticket, decision: 'keep' | 'refund_requested') => {
    haptic.medium();
    if (decision === 'keep') {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticket.id ? { ...t, postponed_decision: 'keep' } : t))
      );
      onToast({ message: 'Billet confirmé pour la nouvelle date reportée !', type: 'success' });
    }
  };

  if (isSessionResolving && !user) {
    return <TicketsScreenSkeleton />;
  }

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

  // Filtrage intelligent selon les statuts réels
  const activeTickets = tickets.filter(
    (t) => t.status === 'valid' || t.status === 'pending' || t.status === 'frozen'
  );
  const pastTickets = tickets.filter(
    (t) => t.status === 'used' || t.status === 'refunded' || t.status === 'expired'
  );
  const displayedTickets = activeTab === 'active' ? activeTickets : pastTickets;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-5 pt-safe-header pb-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
            Apple Wallet Live Pass
          </p>
          <button
            type="button"
            onClick={() => setShowClaimModal(true)}
            className="px-3 py-1.5 rounded-full bg-[#6600FF]/10 hover:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Gift className="w-3.5 h-3.5" />
            Réclamer un billet ami
          </button>
        </div>

        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-black text-[#17131D] dark:text-white tracking-tight">
            Mes billets
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-black">
            {activeTickets.length} actif{activeTickets.length > 1 ? 's' : ''}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Design interactif Wallet « Poster » avec QR code certifié
        </p>
      </div>

      {/* Offline banner notice */}
      {typeof navigator !== 'undefined' && !navigator.onLine && tickets.length > 0 && (
        <div className="mx-5 mb-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <QrCode className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">Mode hors-ligne : Vos pass Apple Wallet restent scannables à l'entrée</span>
        </div>
      )}

      {/* Segmented control */}
      <div className="px-5 mt-2">
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
            Billets actifs ({activeTickets.length})
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
            Historique & Clôturés ({pastTickets.length})
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="px-5 mt-5">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-96 rounded-[32px] bg-gray-200/70 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={activeTab === 'active' ? 'Aucun billet actif' : 'Aucun historique'}
              description={
                activeTab === 'active'
                  ? 'Vous n’avez aucun billet pour le moment. Réservez votre place pour vos événements préférés !'
                  : 'Vos billets utilisés, archivés ou remboursés apparaîtront ici.'
              }
              icon={<TicketIcon className="w-12 h-12 text-[#6600FF]/40" />}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {displayedTickets.map((ticket) => (
              <WalletPosterTicket
                key={ticket.id}
                ticket={ticket}
                isBuyer={ticket.buyer_user_id === user?.id}
                onOpenRefundModal={(t) => setSelectedRefundTicket(t)}
                onOpenChallengeModal={(t) => setSelectedChallengeTicket(t)}
                onPostponedDecision={handlePostponedDecision}
                onRegenerateClaimLink={handleRegenerateClaimLink}
                onEventClick={(t) => t.event && onEventClick(t.event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal Réclamation de Billet Ami */}
      <Modal open={showClaimModal} onClose={() => setShowClaimModal(false)} title="Réclamer un billet offert">
        <div className="space-y-4 text-xs">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            Un ami vous a offert une place pour un concert ou festival ? Entrez le jeton reçu ou collez le lien complet pour ajouter le pass à votre compte.
          </p>

          <input
            type="text"
            value={claimTokenInput}
            onChange={(e) => setClaimTokenInput(e.target.value)}
            placeholder="Code ou jeton de réclamation..."
            className="w-full px-3.5 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-[#17131D] dark:text-white border border-gray-200 dark:border-white/15 outline-none font-mono"
          />

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowClaimModal(false)}
              className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleClaimTicket}
              disabled={isClaiming || !claimTokenInput.trim()}
              className="flex-1 py-3 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold disabled:opacity-50 transition-all shadow-md shadow-purple-900/20"
            >
              {isClaiming ? 'Vérification...' : 'Réclamer mon billet'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Demande de Remboursement */}
      {selectedRefundTicket && (
        <RefundRequestModal
          ticket={selectedRefundTicket}
          isOpen={!!selectedRefundTicket}
          onClose={() => setSelectedRefundTicket(null)}
          onSuccess={() => {
            onToast({ message: 'Demande de remboursement transmise avec succès !', type: 'success' });
            refreshTickets();
          }}
        />
      )}

      {/* Modal Défi de Présence Fun */}
      {selectedChallengeTicket && (
        <PresenceChallengeModal
          ticket={selectedChallengeTicket}
          isOpen={!!selectedChallengeTicket}
          onClose={() => setSelectedChallengeTicket(null)}
          onSuccess={() => {
            onToast({ message: 'Badge « Pionnier du Live » débloqué ! 🌟', type: 'success' });
            refreshTickets();
          }}
        />
      )}
    </div>
  );
}
