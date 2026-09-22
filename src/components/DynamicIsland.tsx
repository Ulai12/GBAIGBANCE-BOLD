import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  WifiOff,
  Wifi,
  Ticket,
  Heart,
  Share2,
} from 'lucide-react';
import type { ToastData } from '@/components/Toast';
import { haptic } from '@/hooks/useHaptics';

interface DynamicIslandProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
}

/**
 * GBAIGBANCE — Apple iOS Dynamic Island & Floating Capsule
 * 
 * Provides:
 * - Fluid morphing capsule at the top center of the viewport
 * - Elastic spring physics (stiffness: 420, damping: 28)
 * - Auto-detects ticket bookings, favorites, shares, and network loss
 * - Interactive swipe-up to dismiss gesture
 * - Synchronized Taptic Engine feedback
 */
export function DynamicIsland({ toasts, onClose }: DynamicIslandProps) {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [justReconnected, setJustReconnected] = useState(false);

  // Monitor network connectivity for Dynamic Island status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      haptic.success();
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
      haptic.warning();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Most recent toast displayed on top of the island
  const activeToast = toasts[toasts.length - 1];

  // Trigger haptic whenever a new toast appears
  const activeToastId = activeToast?.id;
  const activeToastType = activeToast?.type;
  useEffect(() => {
    if (!activeToastId) return;

    if (activeToastType === 'success') {
      haptic.success();
    } else if (activeToastType === 'error') {
      haptic.error();
    } else {
      haptic.light();
    }
  }, [activeToastId, activeToastType]);

  // Auto-dismiss active toast
  const activeToastPersistent = activeToast?.persistent;
  const activeToastHasAction = Boolean(activeToast?.action);
  useEffect(() => {
    if (!activeToastId || activeToastPersistent) return;
    const duration = activeToastHasAction ? 6000 : 3500;
    const timer = setTimeout(() => {
      onClose(activeToastId);
    }, duration);
    return () => clearTimeout(timer);
  }, [activeToastId, activeToastPersistent, activeToastHasAction, onClose]);

  // Icon detection based on message context
  const getContextualIcon = (toast: ToastData) => {
    const msg = (toast.message || '').toLowerCase();
    if (msg.includes('billet') || msg.includes('réserv') || msg.includes('ticket')) {
      return <Ticket className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />;
    }
    if (msg.includes('favori') || msg.includes('aimé') || msg.includes('like')) {
      return <Heart className="w-4 h-4 text-rose-400 fill-rose-400 shrink-0 scale-110" />;
    }
    if (msg.includes('partag') || msg.includes('copi') || msg.includes('lien')) {
      return <Share2 className="w-4 h-4 text-indigo-400 shrink-0" />;
    }

    if (toast.type === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (toast.type === 'error') {
      return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    return <Info className="w-4 h-4 text-purple-400 shrink-0" />;
  };

  const hasIslandContent = Boolean(activeToast || isOffline || justReconnected);

  return (
    <div
      className="fixed left-0 right-0 z-[70] flex flex-col items-center pointer-events-none px-3"
      style={{
        top: 'max(1rem, calc(env(safe-area-inset-top, 0px) + 0.75rem))',
      }}
    >
      <AnimatePresence mode="wait">
        {hasIslandContent && (
          <motion.div
            layoutId="dynamic-island-capsule"
            initial={{ y: -45, scale: 0.85, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -45, scale: 0.85, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
              mass: 0.7,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.05 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -15 || info.velocity.y < -200) {
                if (activeToast) {
                  haptic.light();
                  onClose(activeToast.id);
                }
              }
            }}
            className="pointer-events-auto max-w-sm sm:max-w-md w-auto min-w-[200px] flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/90 dark:bg-[#12101C]/95 text-white backdrop-blur-2xl border border-white/[0.18] shadow-[0_12px_32px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
          >
            {/* 1. Offline Mode State */}
            {isOffline && !activeToast && (
              <div className="flex items-center gap-2.5 text-xs font-medium w-full">
                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="font-bold text-white text-[13px] leading-tight">Mode Hors-ligne</p>
                  <p className="text-zinc-400 text-[11px] truncate">Billets disponibles via le cache</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              </div>
            )}

            {/* 2. Reconnection Banner State */}
            {!isOffline && justReconnected && !activeToast && (
              <div className="flex items-center gap-2.5 text-xs font-medium w-full">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <p className="font-bold text-white text-[13px] leading-tight">Connexion Rétablie</p>
                  <p className="text-zinc-400 text-[11px]">Synchronisation en direct active</p>
                </div>
              </div>
            )}

            {/* 3. Active Toast / Notification Island */}
            {activeToast && (
              <>
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  {getContextualIcon(activeToast)}
                </div>

                <p className="text-[13px] font-medium text-white flex-1 min-w-0 pr-1 leading-snug">
                  {activeToast.message}
                </p>

                {activeToast.action && (
                  <button
                    type="button"
                    onClick={() => {
                      haptic.selection();
                      activeToast.action?.onClick();
                      onClose(activeToast.id);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#6600FF] hover:bg-[#5500DD] text-white text-[11px] font-bold active:scale-95 transition-all shrink-0 shadow-xs"
                  >
                    {activeToast.action.label}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    onClose(activeToast.id);
                  }}
                  aria-label="Fermer la capsule"
                  className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
