import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 animate-bounce-in max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E]">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 active:scale-90 transition-transform"><X className="w-5 h-5 text-gray-500" /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
