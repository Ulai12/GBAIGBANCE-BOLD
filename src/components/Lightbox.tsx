import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface LightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function Lightbox({ src, alt = '', onClose }: LightboxProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale > 1) {
      setStartPos({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startPos && scale > 1) {
      setTranslate({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
  };

  const onPointerUp = () => setStartPos(null);

  const toggleZoom = () => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-11 h-11 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
        aria-label="Fermer"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={toggleZoom}
        className="absolute bottom-6 right-6 w-11 h-11 rounded-full flex items-center justify-center z-10 active:scale-90 transition-transform"
        style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)' }}
        aria-label="Zoom"
      >
        {scale > 1 ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
      </button>

      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain select-none transition-transform duration-300"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          cursor: scale > 1 ? 'grab' : 'zoom-in',
          touchAction: 'none',
        }}
        draggable={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={(e) => { e.stopPropagation(); toggleZoom(); }}
      />
    </div>
  );
}
