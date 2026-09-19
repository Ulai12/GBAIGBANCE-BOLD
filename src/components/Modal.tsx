import type { ReactNode } from 'react';
import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative w-full max-w-md glass-surface rounded-3xl p-6 animate-bounce-in max-h-[85vh] overflow-y-auto no-scrollbar focus:outline-none"
      >
        {title ? (
          <div className="flex items-center justify-between mb-4">
            <h2 id={titleId} className="text-lg font-bold text-[#1A1A2E] dark:text-white">
              {title}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Fermer la boîte de dialogue"
              className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
            >
              <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
        ) : (
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer la boîte de dialogue"
            className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF]"
          >
            <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
