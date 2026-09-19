import type { ReactNode } from 'react';
import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptic } from '@/hooks/useHaptics';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Allow overriding max width (e.g. max-w-lg) */
  maxWidthClass?: string;
}

/**
 * GBAIGBANCE — iOS Action Sheet & Modal Component
 * 
 * Features:
 * - Native iOS Action Sheet ergonomics on mobile (attached to bottom) with drag-to-dismiss handle
 * - Centered elevated glass card on desktop / tablet
 * - Elastic spring physics (stiffness: 360, damping: 32)
 * - Drag "y" with downward threshold to dismiss with light haptic click
 * - Full accessibility: focus trapping, escape key, ARIA dialog attributes
 */
export function Modal({ open, onClose, children, title, maxWidthClass = 'max-w-md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const uniqueId = useId();
  const titleId = `modal-title-${uniqueId}`;

  useEffect(() => {
    if (!open) return;

    // Save previous active element for focus restoration upon dismiss
    if (document.activeElement instanceof HTMLElement) {
      triggerElementRef.current = document.activeElement;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Initial focus on close button or modal container
    const focusTimer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (modalRef.current) {
        modalRef.current.focus();
      }
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        haptic.light();
        onClose();
        return;
      }

      // Focus Trap implementation
      if (event.key === 'Tab' && modalRef.current) {
        const focusableSelectors = [
          'a[href]',
          'button:not([disabled])',
          'textarea:not([disabled])',
          'input:not([disabled])',
          'select:not([disabled])',
          '[tabindex]:not([tabindex="-1"])',
        ].join(',');

        const focusableElements = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null);

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);

      // Focus restoration
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    };
  }, [open, onClose]);

  const handleDismiss = () => {
    haptic.light();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          {/* Backdrop with progressive blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Action Sheet / Modal Surface */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 90 || info.velocity.y > 350) {
                handleDismiss();
              }
            }}
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 380,
              mass: 0.85,
            }}
            className={`relative w-full ${maxWidthClass} rounded-t-[32px] sm:rounded-3xl p-6 pt-3 sm:pt-6 bg-white/95 dark:bg-[#151221]/95 backdrop-blur-2xl border-t sm:border border-black/[0.08] dark:border-white/[0.12] shadow-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto no-scrollbar focus:outline-none z-10`}
          >
            {/* iOS Action Sheet Pull-to-Dismiss Grabber Bar */}
            <div className="flex justify-center pb-3 pt-1 touch-none sm:hidden cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600/90 transition-transform active:scale-95" />
            </div>

            {title ? (
              <div className="flex items-center justify-between mb-4">
                <h2 id={titleId} className="text-lg font-bold text-[#1A1A2E] dark:text-white tracking-tight">
                  {title}
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Fermer la boîte de dialogue"
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
                >
                  <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </button>
              </div>
            ) : (
              <button
                ref={closeButtonRef}
                type="button"
                onClick={handleDismiss}
                aria-label="Fermer la boîte de dialogue"
                className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
              >
                <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              </button>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
