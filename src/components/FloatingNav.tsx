import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

interface FloatingNavProps {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  transparent?: boolean;
}

export function FloatingNav({ title, onBack, right, transparent = false }: FloatingNavProps) {
  return (
    <div className={`sticky top-0 z-30 px-4 py-3 ${transparent ? '' : 'glass'}`}>
      <div className="max-w-md mx-auto flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-[#171726]" />
          </button>
        )}
        {title && <h1 className="text-lg font-bold text-[#171726] flex-1 text-center">{title}</h1>}
        {right || <div className="w-10" />}
      </div>
    </div>
  );
}
