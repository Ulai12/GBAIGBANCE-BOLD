import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? 'bottom-sheet-title' : undefined}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md glass-surface rounded-t-[2.5rem] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-gray-300/50 rounded-full mx-auto mb-4" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 id="bottom-sheet-title" className="text-lg font-bold text-[#1A1A2E] dark:text-white">{title}</h2>
                        <button type="button" onClick={onClose} aria-label="Fermer" className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 active:scale-90 transition-transform">
              <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
