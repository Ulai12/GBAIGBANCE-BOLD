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
      <div className="relative w-full max-w-md bg-white rounded-t-[2.5rem] p-6 pb-8 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E]">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
