/**
 * Modal.tsx
 * ---------
 * Composant Modal & Action Sheet iOS haute ergonomie pour GBAIGBANCE.
 *
 * Fonctionnalités clés :
 * - Intégration de Liquid Glass via <GlassPanel radius={32}> pour un rendu en verre
 *   fluide avec réfraction GPU ou repli CSS Apple (backdrop-filter saturé).
 * - Physique à ressort native iOS (Motion) avec fermeture au glisser vers le bas (pull-to-dismiss).
 * - Barre de préhension (grab handle) dédiée pour ne jamais intercepter la saisie dans les formulaires.
 * - Gestion du focus trap, verrouillage propre du scroll (classe .gba-modal-open) et touche Échap.
 * - Prise en charge intégrale de la safe-area iOS (env(safe-area-inset-bottom)).
 */

import type { ReactNode } from 'react';
import { useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { haptic } from '@/hooks/useHaptics';
import { GlassPanel } from '@/components/glass';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Permet de surcharger la largeur maximale (ex. max-w-lg) */
  maxWidthClass?: string;
}

// Gestionnaire global de verrouillage du défilement pour garantir que body ne reste jamais bloqué en overflow: hidden
let activeModalCount = 0;

function acquireScrollLock() {
  activeModalCount++;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden';
    document.body.classList.add('gba-modal-open');
    window.dispatchEvent(new CustomEvent('gba-modal-visibility-changed', { detail: { open: true } }));
  }
}

function releaseScrollLock() {
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (typeof document !== 'undefined' && activeModalCount === 0) {
    document.body.style.overflow = '';
    document.body.classList.remove('gba-modal-open');
    window.dispatchEvent(new CustomEvent('gba-modal-visibility-changed', { detail: { open: false } }));
  }
}

export function Modal({ open, onClose, children, title, maxWidthClass = 'max-w-md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const uniqueId = useId();
  const titleId = `modal-title-${uniqueId}`;
  
  // Contrôle explicite du geste de glisser pour éviter le blocage du focus sur les inputs
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;

    // Enregistre l'élément précédemment actif pour restaurer le focus à la fermeture
    if (document.activeElement instanceof HTMLElement) {
      triggerElementRef.current = document.activeElement;
    }

    acquireScrollLock();

    // Focus initial respectueux : ne vole pas le focus si un champ de saisie est déjà actif
    const focusTimer = setTimeout(() => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;
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

      // Piège de focus (Focus Trap) pour accessibilité clavier
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

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      releaseScrollLock();

      // Restaure le focus sur l'élément d'origine
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        setTimeout(() => triggerElementRef.current?.focus(), 50);
      }
    };
  }, [open, onClose]);

  const handleDismiss = () => {
    haptic.light();
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
        >
          {/* Arrière-plan assombri avec flou progressif */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Surface de la feuille modale animée par Motion */}
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
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
            className={`relative w-full ${maxWidthClass} max-h-[90vh] sm:max-h-[85vh] focus:outline-none z-10 flex flex-col`}
          >
            {/* 
              Surface en verre liquide adaptative :
              - WebGPU : Réfraction physique des couches d'arrière-plan
              - Repli : Glassmorphism Apple ultra-fluide
            */}
            <GlassPanel
              radius={32}
              interactive={false}
              className="w-full h-full p-6 pt-3 sm:pt-6 pb-[max(2.5rem,calc(env(safe-area-inset-bottom,0px)+2.5rem))] rounded-t-[32px] sm:rounded-3xl border-t sm:border border-black/[0.08] dark:border-white/[0.12] shadow-2xl overflow-y-auto no-scrollbar"
            >
              {/* Barre de préhension iOS pour fermeture au glisser (seul déclencheur du geste drag pour préserver le clavier) */}
              <div
                className="flex justify-center pb-3 pt-1 touch-none sm:hidden cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
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
                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] cursor-pointer"
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
                  className="absolute right-4 top-4 z-10 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] cursor-pointer"
                >
                  <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                </button>
              )}

              {children}
            </GlassPanel>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
}
