import { useEffect, useState } from 'react';

interface DynamicBackgroundProps {
  enabled: boolean;
}

const COLORS = [
  ['#6600FF', '#8B5CF6', '#A885FF'],
  ['#FF6B6B', '#FF8E53', '#FFA559'],
  ['#0EA5E9', '#0284C7', '#38BDF8'],
  ['#10B981', '#059669', '#34D399'],
  ['#F59E0B', '#D97706', '#FBBF24'],
  ['#EC4899', '#DB2777', '#F472B6'],
];

export function DynamicBackground({ enabled }: DynamicBackgroundProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const [angle, setAngle] = useState(135);

  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % COLORS.length);
      setAngle((prev) => (prev + 45) % 360);
    }, 5000);
    return () => clearInterval(interval);
  }, [enabled]);

  if (!enabled) return null;

  const [c1, c2, c3] = COLORS[colorIndex];

  return (
    <div
      className="fixed inset-0 transition-all duration-[3000ms] ease-in-out pointer-events-none"
      style={{
        background: `linear-gradient(${angle}deg, ${c1}25 0%, ${c2}15 50%, ${c3}10 100%)`,
        zIndex: 0,
      }}
    >
      <div
        className="absolute top-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-30 transition-all duration-[3000ms]"
        style={{ background: c1, transform: `translate(${Math.sin(colorIndex) * 100}px, ${Math.cos(colorIndex) * 80}px)` }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-25 transition-all duration-[3000ms]"
        style={{ background: c2, transform: `translate(${Math.cos(colorIndex) * 120}px, ${Math.sin(colorIndex) * 90}px)` }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 transition-all duration-[3000ms]"
        style={{ background: c3, transform: `translate(-50%, -50%) translate(${Math.sin(colorIndex * 2) * 60}px, ${Math.cos(colorIndex * 2) * 60}px)` }}
      />
    </div>
  );
}
