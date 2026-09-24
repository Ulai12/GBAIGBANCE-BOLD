import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  Sparkles, 
  Share2, 
  RotateCcw, 
  AlertCircle, 
  PauseCircle, 
  CheckCircle2, 
  XCircle,
  Copy,
  Check,
  Flame
} from 'lucide-react';
import type { Ticket, EventStatus } from '@/types';
import { useImagePalette } from '@/hooks/useImagePalette';

interface WalletPosterTicketProps {
  ticket: Ticket;
  onOpenRefundModal?: (ticket: Ticket) => void;
  onOpenChallengeModal?: (ticket: Ticket) => void;
  onPostponedDecision?: (ticket: Ticket, decision: 'keep' | 'refund_requested') => void;
  onRegenerateClaimLink?: (ticket: Ticket) => void;
  onEventClick?: (ticket: Ticket) => void;
  isBuyer?: boolean;
}

export const WalletPosterTicket: React.FC<WalletPosterTicketProps> = ({
  ticket,
  onOpenRefundModal,
  onOpenChallengeModal,
  onPostponedDecision,
  onRegenerateClaimLink,
  onEventClick,
  isBuyer = false,
}) => {
  const event = ticket.event;
  const eventStatus: EventStatus = event?.status || 'published';
  const eventImage = event?.images?.[0] || null;

  // Extraction adaptative de palette avec fallback instantané et CORS sécurisé
  const palette = useImagePalette(eventImage);
  const [copiedLink, setCopiedLink] = useState(false);

  // État de l'événement dérivé pour l'affichage
  const isCancelled = eventStatus === 'cancelled';
  const isSuspended = eventStatus === 'suspended';
  const isPostponed = eventStatus === 'postponed';
  const isCompleted = eventStatus === 'completed';
  const isFrozen = ticket.status === 'frozen';
  const isRefunded = ticket.status === 'refunded';
  const isPending = ticket.status === 'pending';
  const isValid = ticket.status === 'valid' && !isCancelled && !isSuspended && !isCompleted;

  // Formatage de la date de l'événement
  const eventDate = event?.starts_at ? new Date(event.starts_at) : new Date(ticket.created_at);
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const postponedToDate = event?.postponed_to ? new Date(event.postponed_to) : null;
  const formattedPostponedDate = postponedToDate ? postponedToDate.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }) : null;

  // Gestion du lien de partage/réclamation si billet acheté pour un ami
  const isGiftTicket = !ticket.is_claimed && (ticket.buyer_user_id || ticket.recipient_name);

  const handleCopyClaimLink = (token?: string | null) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const claimUrl = `${origin}/#claim=${token || ticket.id}`;
    navigator.clipboard.writeText(claimUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Badge du statut du billet
  const renderStatusBadge = () => {
    if (isRefunded) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 backdrop-blur-md">
          <XCircle className="w-3.5 h-3.5" /> Remboursé
        </span>
      );
    }
    if (isFrozen) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
          <PauseCircle className="w-3.5 h-3.5" /> Gelé (Remboursement en cours)
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-600/30 text-red-200 border border-red-500/40 backdrop-blur-md">
          <AlertCircle className="w-3.5 h-3.5" /> Événement Annulé
        </span>
      );
    }
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/25 text-orange-200 border border-orange-500/40 backdrop-blur-md">
          <PauseCircle className="w-3.5 h-3.5" /> Suspendu temporairement
        </span>
      );
    }
    if (isPostponed) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 backdrop-blur-md">
          <Calendar className="w-3.5 h-3.5" /> Événement Reporté
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-700/40 text-zinc-300 border border-zinc-600/40 backdrop-blur-md">
          <CheckCircle2 className="w-3.5 h-3.5" /> Événement Clôturé
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-200 border border-amber-400/30 backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 animate-pulse" /> Paiement en attente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
        <CheckCircle2 className="w-3.5 h-3.5" /> Billet Actif
      </span>
    );
  };

  return (
    <div
      className={`relative w-full max-w-sm mx-auto rounded-[32px] overflow-hidden transition-all duration-300 shadow-2xl border ${
        isCompleted || isCancelled || isRefunded
          ? 'grayscale-[0.65] opacity-90 border-white/10'
          : 'border-white/15'
      }`}
      style={{
        background: `radial-gradient(135% 100% at 50% 0%, ${palette.secondary} 0%, ${palette.dominant} 100%)`,
        color: palette.textColor,
      }}
    >
      {/* Halo lumineux diffus au sommet du poster */}
      <div 
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-48 rounded-full blur-3xl opacity-35 pointer-events-none"
        style={{ backgroundColor: palette.accent }}
      />

      {/* PARTIE 1 : Visuel grand format style "Poster" façon Apple Wallet */}
      <div className="relative h-64 w-full overflow-hidden bg-zinc-950">
        {eventImage ? (
          <img
            src={eventImage}
            alt={event?.title || 'Événement'}
            crossOrigin="anonymous"
            className="w-full h-full object-cover object-center transform scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-black p-6 text-center">
            <Sparkles className="w-12 h-12 text-white/50 mb-2" />
            <span className="text-white/70 font-semibold text-sm">Gbaïgbance Live Ticket</span>
          </div>
        )}

        {/* Dégradé de fusion vers le bas du poster */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* En-tête : Badge d'état & type de pass */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          {renderStatusBadge()}

          <span 
            className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md"
            style={{
              backgroundColor: palette.badgeBg,
              borderColor: palette.badgeBorder,
              borderWidth: 1,
            }}
          >
            {ticket.ticket_type}
          </span>
        </div>

        {/* Titre et artiste incrustés au bas du poster */}
        <div 
          className={`absolute bottom-4 inset-x-5 z-10 ${onEventClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          onClick={() => onEventClick && onEventClick(ticket)}
        >
          <h3 className="text-2xl font-black tracking-tight text-white line-clamp-1 drop-shadow-md">
            {event?.title || 'Événement Gbaïgbance'}
          </h3>
          <p className="text-sm font-medium text-white/80 line-clamp-1">
            {event?.city}, {event?.country}
          </p>
        </div>
      </div>

      {/* PARTIE 2 : Encoches physiques Apple Wallet & ligne de pointillés */}
      <div className="relative flex items-center justify-between px-0 py-1 my-1">
        <div className="w-5 h-8 bg-zinc-950 rounded-r-full -ml-1 border-r border-y border-white/10" />
        <div className="flex-1 border-b border-dashed border-white/25 mx-3" />
        <div className="w-5 h-8 bg-zinc-950 rounded-l-full -mr-1 border-l border-y border-white/10" />
      </div>

      {/* PARTIE 3 : Détails de l'événement et bénéficiaire */}
      <div className="px-6 py-4 space-y-4">
        {/* Grille Date & Lieu */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/60 mb-1">
              <Calendar className="w-3.5 h-3.5" /> Date & Heure
            </div>
            <div className="font-semibold text-white">{formattedDate}</div>
            <div className="text-xs text-white/70">{formattedTime}</div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/60 mb-1">
              <MapPin className="w-3.5 h-3.5" /> Lieu
            </div>
            <div className="font-semibold text-white truncate">
              {event?.location_name || 'Lieu à confirmer'}
            </div>
            <div className="text-xs text-white/70 truncate">{event?.city}</div>
          </div>
        </div>

        {/* Détenteur du billet */}
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-purple-300 font-bold">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-white/60 block">Bénéficiaire</span>
              <span className="font-semibold text-white">
                {ticket.recipient_name || 'Moi-même'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-white/60 block">Prix payé</span>
            <span className="font-bold text-white">
              {ticket.price_paid.toLocaleString('fr-FR')} {ticket.currency || 'XOF'}
            </span>
          </div>
        </div>

        {/* PARTIE 4 : QR Code Haute Lisibilité */}
        <div className="p-4 rounded-3xl bg-white flex flex-col items-center justify-center text-center shadow-inner relative">
          {isValid ? (
            <>
              {ticket.qr_code ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    ticket.qr_code
                  )}&color=000000&bgcolor=FFFFFF`}
                  alt="QR Code Billet"
                  crossOrigin="anonymous"
                  className="w-44 h-44 object-contain rounded-xl"
                  loading="lazy"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center bg-zinc-100 rounded-xl">
                  <span className="text-xs text-zinc-500 font-mono">Génération...</span>
                </div>
              )}
              <span className="mt-2 font-mono text-xs font-bold text-zinc-800 tracking-wider">
                {ticket.qr_code}
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                Présentez ce QR code à l'entrée de l'événement
              </span>
            </>
          ) : (
            <div className="w-44 h-44 flex flex-col items-center justify-center text-center p-3">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-2">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-zinc-800">QR Code Inactif</span>
              <p className="text-[10px] text-zinc-500 mt-1">
                {isCancelled
                  ? 'Événement annulé'
                  : isSuspended
                  ? 'Événement suspendu'
                  : isCompleted
                  ? 'Événement terminé'
                  : isFrozen
                  ? 'Billet gelé (remboursement)'
                  : isRefunded
                  ? 'Billet remboursé'
                  : 'Billet en attente'}
              </p>
            </div>
          )}
        </div>

        {/* PARTIE 5 : Notifications d'États & Actions Conditionnelles */}

        {/* État : REPORTÉ */}
        {isPostponed && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-xs space-y-2">
            <div className="font-semibold text-indigo-200 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> Nouvelle date : {formattedPostponedDate || 'À préciser'}
            </div>
            <p className="text-white/80 leading-relaxed">
              L'événement a été reporté. Vous pouvez choisir de conserver ce billet pour la nouvelle date ou demander un remboursement.
            </p>
            {ticket.postponed_decision === 'pending' && onPostponedDecision && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onPostponedDecision(ticket, 'keep')}
                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs active:scale-95 transition-transform"
                >
                  Garder mon billet
                </button>
                <button
                  onClick={() => onOpenRefundModal?.(ticket)}
                  className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs active:scale-95 transition-transform"
                >
                  Remboursement
                </button>
              </div>
            )}
            {ticket.postponed_decision === 'keep' && (
              <div className="text-emerald-300 font-medium">
                ✓ Vous avez choisi de conserver votre billet pour la nouvelle date.
              </div>
            )}
          </div>
        )}

        {/* État : ANNULÉ */}
        {isCancelled && !isRefunded && !isFrozen && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs space-y-2">
            <div className="font-semibold text-rose-200 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Événement Annulé
            </div>
            <p className="text-white/80">
              Cet événement a été annulé par l'organisateur. Vous avez droit à un remboursement intégral sans frais.
            </p>
            {onOpenRefundModal && (
              <button
                onClick={() => onOpenRefundModal(ticket)}
                className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Demander mon Remboursement Mobile Money
              </button>
            )}
          </div>
        )}

        {/* État : SUSPENDU */}
        {isSuspended && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs space-y-1">
            <div className="font-semibold text-amber-200 flex items-center gap-1.5">
              <PauseCircle className="w-4 h-4" /> Événement temporairement suspendu
            </div>
            <p className="text-white/80">
              L'organisation a suspendu l'événement pour des raisons techniques ou logistiques. Les billets sont gelés en attendant la décision définitive.
            </p>
          </div>
        )}

        {/* État : BILLET ACHETÉ POUR UN AMI (Partage / Réclamation) */}
        {isGiftTicket && isBuyer && (
          <div className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs space-y-2">
            <div className="font-semibold text-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Billet offert à {ticket.recipient_name || 'un ami'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-normal">
                En attente de réclamation
              </span>
            </div>
            <p className="text-white/75">
              Envoyez le lien sécurisé à votre ami pour qu'il active son pass dans son propre compte.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleCopyClaimLink()}
                className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Lien copié !' : 'Copier le lien d\'invitation'}
              </button>
              {onRegenerateClaimLink && (
                <button
                  onClick={() => onRegenerateClaimLink(ticket)}
                  title="Régénérer un lien si expiré"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bouton du Défi de Présence Fun */}
        {isValid && onOpenChallengeModal && (
          <button
            onClick={() => onOpenChallengeModal(ticket)}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
            Défi de Présence Live (Bonus Badge)
          </button>
        )}
      </div>
    </div>
  );
};
