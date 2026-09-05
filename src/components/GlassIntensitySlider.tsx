import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface GlassIntensitySliderProps {
  className?: string;
}

export function GlassIntensitySlider({ className = '' }: GlassIntensitySliderProps) {
  const [intensity, setIntensity] = useState(0.3);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('glass-intensity');
    if (saved !== null) {
      const v = parseFloat(saved);
      setIntensity(v);
      applyIntensity(v);
    }
  }, []);

  const applyIntensity = (v: number) => {
    document.documentElement.style.setProperty('--glass-intensity', String(v));
  };

  const handleChange = (v: number) => {
    setIntensity(v);
    applyIntensity(v);
    localStorage.setItem('glass-intensity', String(v));
  };

  return (
    <div className={`glass-surface rounded-2xl p-4 ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#6600FF]" />
          <span className="font-semibold text-zinc-900 dark:text-white">Effet verre</span>
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{Math.round(intensity * 100)}%</span>
      </button>
      {open && (
        <div className="mt-4 animate-fade-in">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={intensity}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-zinc-300 to-[#6600FF] accent-[#6600FF]"
          />
          <div className="flex justify-between mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Opaque</span>
            <span>Transparent</span>
          </div>
        </div>
      )}
    </div>
  );
}
