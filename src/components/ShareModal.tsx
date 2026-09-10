import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Mail,
  Calendar,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import {
  getEventShareData,
  copyEventToClipboard,
  shareEventNative,
  triggerAppToast,
} from '@/utils/share';

interface ShareModalProps {
  isOpen: boolean;
  event: Event | null;
  onClose: () => void;
  onToast?: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
}

export function ShareModal({ isOpen, event, onClose, onToast }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const notify = onToast || triggerAppToast;

  useEffect(() => {
    if (!isOpen) setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const shareData = getEventShareData(event);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    const success = await copyEventToClipboard(event, notify);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    const status = await shareEventNative(event, notify);
    if (status === 'shared') {
      onClose();
    }
  };

  // WhatsApp share
  const handleWhatsApp = () => {
    const text = encodeURIComponent(`${shareData.text}\n${shareData.url}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // Telegram share
  const handleTelegram = () => {
    const text = encodeURIComponent(shareData.text);
    const url = encodeURIComponent(shareData.url);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank', 'noopener,noreferrer');
  };

  // X / Twitter share
  const handleTwitter = () => {
    const text = encodeURIComponent(`🔥 ${event.title} sur @Gbaigbance`);
    const url = encodeURIComponent(shareData.url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'noopener,noreferrer');
  };

  // Facebook share
  const handleFacebook = () => {
    const url = encodeURIComponent(shareData.url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer');
  };

  // Email share
  const handleEmail = () => {
    const subject = encodeURIComponent(`Invitation : ${event.title} sur Gbaïgbancê`);
    const body = encodeURIComponent(`${shareData.text}\n\nLien de l'événement :\n${shareData.url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  // SMS share
  const handleSMS = () => {
    const body = encodeURIComponent(`${shareData.text}\n${shareData.url}`);
    window.open(`sms:?&body=${body}`, '_blank');
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="
            w-full max-w-md bg-[#F9F8FD] dark:bg-[#151322]
            rounded-t-[2.2rem] sm:rounded-[2.2rem]
            border border-black/[0.08] dark:border-white/[0.12]
            shadow-2xl overflow-hidden flex flex-col max-h-[90vh]
          "
        >
          {/* iOS Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1.5 rounded-full bg-black/20 dark:bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-6 pt-3 pb-3 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 flex items-center justify-center text-[#6600FF] dark:text-[#A855F7]">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 id="share-modal-title" className="text-base font-black text-[#17131D] dark:text-white tracking-tight">
                  Partager l'événement
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Invitez vos amis et vos réseaux
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer la fenêtre de partage"
              className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Event Preview Snippet */}
          <div className="p-5 pb-3">
            <div className="p-3 rounded-2xl bg-white dark:bg-[#1C1A2B] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-3.5 shadow-xs">
              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-neutral-200 dark:bg-neutral-800 relative">
                <SmartImage
                  src={event.cover_url || event.images?.[0]}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6600FF] dark:text-[#A855F7] mb-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{shareData.formattedDate}</span>
                </div>
                <h3 className="text-sm font-black text-[#17131D] dark:text-white truncate">
                  {event.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">{shareData.formattedLocation}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-[#6600FF] dark:text-purple-300 shrink-0">
                    {shareData.formattedPrice}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Share Action Grid */}
          <div className="px-5 py-2 overflow-y-auto space-y-4">
            {/* Native OS Share Button if available */}
            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="
                  w-full py-3 px-4 rounded-2xl 
                  bg-[#6600FF] hover:bg-[#5500DD] active:scale-[0.98] 
                  text-white font-bold text-sm flex items-center justify-center gap-2.5 
                  transition-all shadow-md shadow-[#6600FF]/20
                "
              >
                <Share2 className="w-4 h-4" />
                <span>Partager via le système (Applications, AirDrop...)</span>
              </button>
            )}

            {/* Direct Messaging Apps Grid */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                Envoyer via une application
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="
                    flex flex-col items-center justify-center p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-95 transition-all group
                  "
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5 fill-white" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                    WhatsApp
                  </span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={handleTelegram}
                  className="
                    flex flex-col items-center justify-center p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-sky-50 dark:hover:bg-sky-950/30
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-95 transition-all group
                  "
                >
                  <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                    <Send className="w-5 h-5 -translate-x-0.5 translate-y-0.5" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                    Telegram
                  </span>
                </button>

                {/* SMS */}
                <button
                  type="button"
                  onClick={handleSMS}
                  className="
                    flex flex-col items-center justify-center p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-green-50 dark:hover:bg-green-950/30
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-95 transition-all group
                  "
                >
                  <div className="w-11 h-11 rounded-full bg-green-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                    SMS
                  </span>
                </button>

                {/* X / Twitter */}
                <button
                  type="button"
                  onClick={handleTwitter}
                  className="
                    flex flex-col items-center justify-center p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-neutral-100 dark:hover:bg-neutral-800
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-95 transition-all group
                  "
                >
                  <div className="w-11 h-11 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                    <span className="font-black text-sm">𝕏</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200">
                    X
                  </span>
                </button>
              </div>

              {/* Second row: Facebook, Email */}
              <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                {/* Facebook */}
                <button
                  type="button"
                  onClick={handleFacebook}
                  className="
                    flex items-center gap-3 p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-blue-50 dark:hover:bg-blue-950/30
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-[0.98] transition-all
                  "
                >
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <span className="font-black text-base">f</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Facebook</p>
                    <p className="text-[10px] text-gray-400">Fil d'actualité</p>
                  </div>
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={handleEmail}
                  className="
                    flex items-center gap-3 p-3 rounded-2xl
                    bg-white dark:bg-[#1C1A2B] hover:bg-purple-50 dark:hover:bg-purple-950/30
                    border border-black/[0.05] dark:border-white/[0.08]
                    active:scale-[0.98] transition-all
                  "
                >
                  <div className="w-9 h-9 rounded-full bg-[#6600FF] text-white flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-100">Courriel</p>
                    <p className="text-[10px] text-gray-400">Invitation par mail</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Copy Link Section */}
            <div className="pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 px-1">
                Lien direct
              </p>
              <div className="flex items-center gap-2 p-1.5 pl-3 rounded-2xl bg-white dark:bg-[#1C1A2B] border border-black/[0.08] dark:border-white/[0.1]">
                <input
                  type="text"
                  readOnly
                  value={shareData.url}
                  className="w-full bg-transparent text-xs text-gray-600 dark:text-gray-300 outline-none truncate font-mono select-all"
                  aria-label="Lien de l'événement"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`
                    px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0
                    transition-all active:scale-95 shadow-xs
                    ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#6600FF] hover:bg-[#5500DD] text-white'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-4 pt-2 text-center border-t border-black/[0.04] dark:border-white/[0.06] mt-2">
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
              <span>Gbaïgbancê</span>
              <span>·</span>
              <span>L'événementiel africain partagé</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
