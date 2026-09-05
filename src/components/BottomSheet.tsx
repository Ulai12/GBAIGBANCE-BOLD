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
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md glass-surface rounded-t-[2.5rem] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar">
        <div className="w-12 h-1.5 bg-gray-300/50 rounded-full mx-auto mb-4" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 dark:hover:bg-white/10 active:scale-90 transition-transform">
              <X className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
