import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  RotateCcw, 
  AlertCircle, 
  PauseCircle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  Flame, 
  Lock, 
  QrCode, 
  ChevronDown, 
  ChevronUp,
  Gift,
  MessageCircle,
  ShieldCheck,
  Maximize2,
  Sun,
  X
} from 'lucide-react';
import type { Ticket, EventStatus } from '@/types';
import { haptic } from '@/hooks/useHaptics';
import { getDefaultEventCover } from '@/utils/defaultImages';

interface WalletPosterTicketProps {
  ticket: Ticket;
  onOpenRefundModal?: (ticket: Ticket) => void;
  onOpenChallengeModal?: (ticket: Ticket) => void;
  onPostponedDecision?: (ticket: Ticket, decision: 'keep' | 'refund_requested') => void;
  onRegenerateClaimLink?: (ticket: Ticket) => void;
  onEventClick?: (ticket: Ticket) => void;
  isBuyerOnly?: boolean; // Vrai si visualisé dans la section dédiée "Billets offerts"
}

export const WalletPosterTicket: React.FC<WalletPosterTicketProps> = ({
  ticket,
  onOpenRefundModal,
  onOpenChallengeModal,
  onPostponedDecision,
  onRegenerateClaimLink,
  onEventClick,
  isBuyerOnly = false,
}) => {
  const event = ticket.event;
  const eventStatus: EventStatus = event?.status || 'published';
  const coverUrl = event?.cover_url || event?.images?.[0] || getDefaultEventCover(event?.id || ticket.event_id, event?.category, event?.title);

  const [showQrCode, setShowQrCode] = useState(false);
  const [showFullscreenQr, setShowFullscreenQr] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Statuts dérivés
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
  });
  const formattedTime = eventDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const recipientName = ticket.recipient_name || 'Mon ami';
  const recipientPhone = ticket.recipient_phone;
  const buyerName = ticket.buyer_name || 'Un ami';

  // Construction du lien de réclamation / partage direct
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const claimUrl = `${origin}/#claim=${ticket.claim_token || ticket.id}`;

  const handleCopyLink = () => {
    haptic.selection();
    navigator.clipboard.writeText(claimUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    haptic.selection();
    const eventTitle = event?.title || 'cet événement';
    const text = `Salut ${recipientName} ! Je t'ai offert un billet pour ${eventTitle} sur Gbaïgbancê 🎟️. Voici ton pass d'accès sécurisé : ${claimUrl}`;
    const whatsappUrl = `https://wa.me/${recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : ''}?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Badge d'état du billet
  const renderStatusBadge = () => {
    if (isRefunded) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" /> Remboursé
        </span>
      );
    }
    if (isFrozen) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <PauseCircle className="w-3 h-3" /> En cours de remboursement
        </span>
      );
    }
    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <AlertCircle className="w-3 h-3" /> Événement Annulé
        </span>
      );
    }
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
          <PauseCircle className="w-3 h-3" /> Suspendu
        </span>
      );
    }
    if (isPostponed) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Calendar className="w-3 h-3" /> Reporté
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
          <CheckCircle2 className="w-3 h-3" /> Événement Terminé
        </span>
      );
    }
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
          <Clock className="w-3 h-3 animate-pulse" /> En attente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Valide
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl sm:rounded-[24px] overflow-hidden bg-white dark:bg-[#181622] border transition-all duration-200 shadow-sm ${
        isBuyerOnly
          ? 'border-purple-200 dark:border-purple-900/40 ring-1 ring-purple-500/10'
          : 'border-black/[0.08] dark:border-white/[0.08]'
      }`}
    >
      {/* 1. Bandeau contextuel pour billet offert */}
      {isBuyerOnly && (
        <div className="bg-gradient-to-r from-[#6600FF]/15 via-purple-600/10 to-transparent px-4 py-2 flex items-center justify-between border-b border-purple-500/15">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[#6600FF] dark:text-purple-300">
            <Gift className="w-3.5 h-3.5" /> Billet offert à {recipientName}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3 h-3" /> Achat confirmé
          </span>
        </div>
      )}

      {/* Si le billet m'a été offert par un ami */}
      {!isBuyerOnly && ticket.buyer_name && ticket.buyer_user_id !== ticket.user_id && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 border-b border-emerald-500/15">
          <Gift className="w-3.5 h-3.5" /> Cadeau offert par {buyerName}
        </div>
      )}

      {/* 2. Contenu principal : Vignette + Infos événement style Apple Wallet */}
      <div className="p-4 flex items-start gap-3.5">
        {/* Vignette carrée de l'événement */}
        <button
          type="button"
          onClick={() => onEventClick && onEventClick(ticket)}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-white/10 active:scale-95 transition-transform bg-zinc-100 dark:bg-zinc-800"
        >
          <img
            src={coverUrl}
            alt={event?.title || 'Événement'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>

        {/* Détails événement & pass */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-[10px] font-black uppercase tracking-wider">
              {ticket.ticket_type}
            </span>
            {renderStatusBadge()}
          </div>

          <h3
            onClick={() => onEventClick && onEventClick(ticket)}
            className="font-bold text-sm sm:text-base text-[#17131D] dark:text-white truncate mt-1 cursor-pointer hover:underline"
          >
            {event?.title || 'Événement Gbaïgbancê'}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
              {formattedDate} · {formattedTime}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
            <span className="truncate">{event?.location_name || event?.city || 'Lieu à confirmer'}</span>
          </div>
        </div>
      </div>

      {/* Ligne séparatrice avec encoches Apple Wallet discrètes */}
      <div className="relative flex items-center">
        <div className="absolute left-0 w-3 h-5 rounded-r-full bg-gray-100 dark:bg-[#0B0B14] border-r border-y border-black/5 dark:border-white/5" />
        <div className="flex-1 border-t border-dashed border-gray-200 dark:border-white/10 mx-4" />
        <div className="absolute right-0 w-3 h-5 rounded-l-full bg-gray-100 dark:bg-[#0B0B14] border-l border-y border-black/5 dark:border-white/5" />
      </div>

      {/* 3. Pied de carte & Actions */}
      <div className="p-4 space-y-3">
        {/* Détails bénéficiaire et montant */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block font-semibold uppercase">
                {isBuyerOnly ? 'Bénéficiaire' : 'Titulaire'}
              </span>
              <span className="font-bold text-[#17131D] dark:text-white">
                {isBuyerOnly ? recipientName : (ticket.recipient_name || 'Moi-même')}
              </span>
              {isBuyerOnly && recipientPhone && (
                <span className="text-[10px] text-gray-400 block font-mono">
                  {recipientPhone}
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-400 block font-semibold uppercase">Prix payé</span>
            <span className="font-black text-sm text-[#17131D] dark:text-white">
              {ticket.price_paid.toLocaleString('fr-FR')} {ticket.currency || 'F CFA'}
            </span>
          </div>
        </div>

        {/* CAS A : SECTION DÉDIÉE "BILLETS OFFERTS" (ACHETEUR) */}
        {isBuyerOnly ? (
          <div className="space-y-2.5 pt-1">
            {/* Protection stricte anti-utilisation par l'acheteur */}
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-purple-500/20 flex items-start gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#6600FF] dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[#17131D] dark:text-white text-xs">
                  Pass attribué à {recipientName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  Votre achat est validé et garanti. Seul le bénéficiaire possède le pass d'entrée officiel pour accéder à l'événement.
                </p>
              </div>
            </div>

            {/* Boutons d'actions pour l'acheteur : Partage WhatsApp / Copie du lien */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="py-2.5 px-3 rounded-xl bg-[#6600FF]/10 hover:bg-[#6600FF]/20 text-[#6600FF] dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-[#6600FF]/20"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copié !' : 'Copier lien'}</span>
              </button>
            </div>

            {onRegenerateClaimLink && (
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => onRegenerateClaimLink(ticket)}
                  className="text-[11px] text-[#6600FF] dark:text-purple-300 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Régénérer un nouveau lien pour cet ami
                </button>
              </div>
            )}
          </div>
        ) : (
          /* CAS B : MON BILLET ACTIF (TITULAIRE / ACCÈS CONCERT) */
          <div className="space-y-2 pt-1">
            {/* Décision sur événement reporté */}
            {isPostponed && onPostponedDecision && ticket.postponed_decision === 'pending' && (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-xs space-y-2">
                <p className="text-indigo-800 dark:text-indigo-300 font-semibold">
                  Événement reporté : Confirmez votre choix
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onPostponedDecision(ticket, 'keep')}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-[11px]"
                  >
                    Garder mon billet
                  </button>
                  {onOpenRefundModal && (
                    <button
                      type="button"
                      onClick={() => onOpenRefundModal(ticket)}
                      className="flex-1 py-1.5 rounded-lg bg-white dark:bg-white/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 font-bold text-[11px]"
                    >
                      Remboursement
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bouton dépliant QR Code Apple Style */}
            {isValid && (
              <button
                type="button"
                onClick={() => {
                  haptic.selection();
                  setShowQrCode((prev) => !prev);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[#6600FF] hover:bg-[#5200cc] text-white font-bold text-xs flex items-center justify-between active:scale-98 transition-all shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>{showQrCode ? 'Masquer le Pass QR' : 'Afficher mon Pass d’entrée'}</span>
                </span>
                {showQrCode ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}

            {/* QR Code haute lisibilité dépliable */}
            {showQrCode && isValid && (
              <div 
                onClick={() => {
                  haptic.medium();
                  setShowFullscreenQr(true);
                }}
                className="p-4 rounded-2xl bg-white flex flex-col items-center justify-center text-center shadow-inner border border-gray-200 mt-2 animate-fade-in cursor-pointer group hover:border-[#6600FF]/50 transition-all relative"
                title="Cliquer pour afficher en plein écran pour le scan"
              >
                <div className="absolute top-2.5 right-2.5 p-1 rounded-lg bg-gray-100 group-hover:bg-[#6600FF]/10 text-gray-400 group-hover:text-[#6600FF] transition-all">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>

                {ticket.qr_code ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      ticket.qr_code
                    )}&color=000000&bgcolor=FFFFFF`}
                    alt="QR Code Billet"
                    className="w-36 h-36 object-contain rounded-lg group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-36 h-36 flex items-center justify-center bg-gray-100 rounded-lg">
                    <span className="text-xs text-gray-500 font-mono">Génération...</span>
                  </div>
                )}
                <span className="mt-2 font-mono text-xs font-bold text-zinc-900 tracking-wider">
                  {ticket.qr_code}
                </span>
                <span className="text-[10px] text-[#6600FF] font-semibold mt-1 flex items-center gap-1 group-hover:underline">
                  <Maximize2 className="w-3 h-3" /> Touchez pour afficher en plein écran
                </span>
              </div>
            )}

            {/* Actions secondaires : Bonus Défi live & Remboursement */}
            <div className="flex items-center gap-2 pt-1">
              {isValid && onOpenChallengeModal && (
                <button
                  type="button"
                  onClick={() => onOpenChallengeModal(ticket)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all border border-amber-500/20"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Défi Live</span>
                </button>
              )}

              {(isCancelled || isPostponed) && onOpenRefundModal && !isRefunded && !isFrozen && (
                <button
                  type="button"
                  onClick={() => onOpenRefundModal(ticket)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all border border-rose-500/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Remboursement</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY PLEIN ÉCRAN POUR LE SCAN OPTIMAL À L'ENTRÉE (Apple Wallet Style) */}
      {showFullscreenQr && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between items-center p-6 animate-fade-in text-white"
          onClick={() => setShowFullscreenQr(false)}
        >
          {/* Barre supérieure avec bouton fermeture */}
          <div className="w-full max-w-sm flex items-center justify-between pt-safe-header" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-white/80">Luminosité maximale pour le scan</span>
            </div>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setShowFullscreenQr(false);
              }}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 transition-transform flex items-center justify-center text-white"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Carte blanche de présentation du QR Code */}
          <div 
            className="w-full max-w-xs bg-white text-zinc-950 rounded-[2.5rem] p-6 shadow-2xl flex flex-col items-center text-center my-auto border border-white/20 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Titre événement */}
            <div className="mb-3">
              <span className="inline-block px-3 py-1 rounded-full bg-[#6600FF]/10 text-[#6600FF] font-black text-[11px] uppercase tracking-wider mb-1.5">
                Pass {ticket.ticket_type || 'Standard'}
              </span>
              <h2 className="text-base font-black text-zinc-900 leading-snug line-clamp-2">
                {event?.title || 'Événement Gbaïgbancê'}
              </h2>
              {ticket.recipient_name && (
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Titulaire : <span className="font-bold text-zinc-800">{ticket.recipient_name}</span>
                </p>
              )}
            </div>

            {/* Grand QR Code ultra-net */}
            <div className="p-3 bg-white rounded-2xl border-2 border-zinc-100 shadow-inner my-1">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                  ticket.qr_code || ''
                )}&color=000000&bgcolor=FFFFFF`}
                alt="Pass QR Grand Écran"
                className="w-56 h-56 object-contain rounded-xl"
              />
            </div>

            {/* Code alphanumérique sous le QR */}
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-xs font-black tracking-widest text-zinc-800 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200">
                {ticket.qr_code || '---'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!ticket.qr_code) return;
                  haptic.selection();
                  navigator.clipboard.writeText(ticket.qr_code);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                title="Copier le code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 mt-3 font-medium">
              Présentez ce QR Code au point de contrôle d'accès
            </p>
          </div>

          {/* Bouton de fermeture en bas */}
          <div className="w-full max-w-xs pb-safe-footer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setShowFullscreenQr(false);
              }}
              className="w-full py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm backdrop-blur-md active:scale-98 transition-all"
            >
              Fermer le plein écran
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
