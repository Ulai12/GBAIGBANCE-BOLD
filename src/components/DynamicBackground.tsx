import { useEffect, useRef } from 'react';

interface DynamicBackgroundProps {
  enabled: boolean;
  theme: 'light' | 'dark';
}

const LIGHT_PALETTES = [
  { c1: '#C4B3FF', c2: '#DDD6FE', c3: '#E9D5FF', base: '#EDE8FF' },
  { c1: '#A5B4FC', c2: '#C4B3FF', c3: '#DDD6FE', base: '#EEF2FF' },
  { c1: '#D8B4FE', c2: '#C4B3FF', c3: '#A5B4FC', base: '#FDF4FF' },
  { c1: '#DDD6FE', c2: '#E9D5FF', c3: '#C4B3FF', base: '#F5F3FF' },
  { c1: '#C4B3FF', c2: '#DDD6FE', c3: '#E9D5FF', base: '#EDE8FF' },
  { c1: '#BDB2FF', c2: '#C4B3FF', c3: '#D8B4FE', base: '#F3F0FF' },
];

const DARK_PALETTES = [
  { c1: '#6600FF', c2: '#7C3AED', c3: '#A855F7', base: '#06000F' },
  { c1: '#7C3AED', c2: '#6600FF', c3: '#9333EA', base: '#0C0014' },
  { c1: '#8B5CF6', c2: '#6600FF', c3: '#A855F7', base: '#0A0010' },
  { c1: '#9333EA', c2: '#6600FF', c3: '#7C3AED', base: '#100018' },
  { c1: '#A855F7', c2: '#7C3AED', c3: '#6600FF', base: '#0C0014' },
];
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function hexToRgb(hex: string): [number, number, number] { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r: number, g: number, b: number) { return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function blendHex(a: string, b: string, t: number) { const [r1, g1, b1] = hexToRgb(a); const [r2, g2, b2] = hexToRgb(b); return rgbToHex(lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)); }

export function DynamicBackground({ enabled, theme }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef({ t: 0, paletteIndex: 0, blendT: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!enabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const palettes = theme === 'dark' ? DARK_PALETTES : LIGHT_PALETTES;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const speed = 0.006;
    const draw = () => {
      if (document.visibilityState === 'hidden') {
        animRef.current = requestAnimationFrame(draw);
        return;
      }
      const { width, height } = canvas;
      const s = stateRef.current;
      s.t += speed;
      if (s.t >= 1) { s.t = 0; s.blendT = 0; s.paletteIndex = (s.paletteIndex + 1) % palettes.length; }
      s.blendT = Math.min(1, s.blendT + speed * 0.5);
      const curr = palettes[s.paletteIndex];
      const next = palettes[(s.paletteIndex + 1) % palettes.length];
      const bt = s.blendT;
      const base = blendHex(curr.base, next.base, bt);
      const c1 = blendHex(curr.c1, next.c1, bt);
      const c2 = blendHex(curr.c2, next.c2, bt);
      const c3 = blendHex(curr.c3, next.c3, bt);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, width, height);
      const time = s.t * Math.PI * 2;
      if (theme === 'light') {
        const g1 = ctx.createRadialGradient(width * (0.2 + Math.sin(time * 0.7) * 0.15), height * (0.2 + Math.cos(time * 0.5) * 0.12), 0, width * (0.2 + Math.sin(time * 0.7) * 0.15), height * (0.2 + Math.cos(time * 0.5) * 0.12), width * 0.55);
        g1.addColorStop(0, c1 + 'D0'); g1.addColorStop(0.3, c1 + '70'); g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, width, height);
        const g2 = ctx.createRadialGradient(width * (0.8 + Math.cos(time * 0.6) * 0.1), height * (0.75 + Math.sin(time * 0.4) * 0.1), 0, width * (0.8 + Math.cos(time * 0.6) * 0.1), height * (0.75 + Math.sin(time * 0.4) * 0.1), width * 0.5);
        g2.addColorStop(0, c2 + 'C0'); g2.addColorStop(0.4, c2 + '60'); g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, width, height);
        const g3 = ctx.createRadialGradient(width * (0.5 + Math.sin(time * 0.9) * 0.08), height * (0.45 + Math.cos(time * 0.7) * 0.08), 0, width * 0.5, height * 0.45, width * 0.35);
        g3.addColorStop(0, c3 + 'A0'); g3.addColorStop(0.4, c3 + '50'); g3.addColorStop(1, 'transparent');
        ctx.fillStyle = g3; ctx.fillRect(0, 0, width, height);
        const g4 = ctx.createRadialGradient(width * (0.1 + Math.sin(time * 1.1) * 0.08), height * (0.6 + Math.cos(time * 0.8) * 0.1), 0, width * 0.1, height * 0.6, width * 0.4);
        g4.addColorStop(0, c2 + '80'); g4.addColorStop(0.5, c2 + '30'); g4.addColorStop(1, 'transparent');
        ctx.fillStyle = g4; ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let r = 0; r < 7; r++) {
          const rayAngle = time * 0.3 + r * 0.9;
          const rayX = width * (0.08 + r * 0.14 + Math.sin(rayAngle) * 0.05);
          const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + Math.cos(rayAngle) * 100, height * 0.65);
          rayGrad.addColorStop(0, c1 + '40'); rayGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(rayX - 25, 0); ctx.lineTo(rayX + 25, 0); ctx.lineTo(rayX + 70, height * 0.65); ctx.lineTo(rayX - 70, height * 0.65); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        const shimmer = ctx.createLinearGradient(0, 0, width, height * 0.4);
        shimmer.addColorStop(0, 'rgba(255,255,255,0.55)'); shimmer.addColorStop(0.5, 'rgba(255,255,255,0.20)'); shimmer.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = shimmer; ctx.fillRect(0, 0, width, height);
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.9);
        vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(180,160,255,0.25)');
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
      } else {
        const starCount = 150;
        ctx.save();
        for (let i = 0; i < starCount; i++) {
          const sx = ((i * 137.508 + 17) % width);
          const sy = ((i * 89.201 + 43) % height);
          const r = (i % 3 === 0) ? 1.5 : 0.7;
          const alpha = 0.2 + (Math.sin(time * 1.5 + i) + 1) * 0.15;
          ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
        }
        ctx.restore();
        const g1 = ctx.createRadialGradient(width * (0.25 + Math.sin(time * 0.5) * 0.12), height * (0.3 + Math.cos(time * 0.4) * 0.1), 0, width * (0.25 + Math.sin(time * 0.5) * 0.12), height * (0.3 + Math.cos(time * 0.4) * 0.1), width * 0.6);
        g1.addColorStop(0, c1 + 'E0'); g1.addColorStop(0.2, c1 + '80'); g1.addColorStop(0.6, c1 + '30'); g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, width, height);
        const g2 = ctx.createRadialGradient(width * (0.75 + Math.cos(time * 0.6) * 0.12), height * (0.65 + Math.sin(time * 0.45) * 0.1), 0, width * (0.75 + Math.cos(time * 0.6) * 0.12), height * (0.65 + Math.sin(time * 0.45) * 0.1), width * 0.5);
        g2.addColorStop(0, c2 + 'D0'); g2.addColorStop(0.3, c2 + '60'); g2.addColorStop(1, 'transparent');
        const g3 = ctx.createRadialGradient(width * (0.5 + Math.sin(time * 0.8) * 0.07), height * (0.5 + Math.cos(time * 0.65) * 0.07), 0, width * 0.5, height * 0.5, width * 0.3);
        g3.addColorStop(0, c3 + 'C0'); g3.addColorStop(0.4, c3 + '50'); g3.addColorStop(1, 'transparent');
        ctx.fillStyle = g3; ctx.fillRect(0, 0, width, height);
        const g4 = ctx.createRadialGradient(width * (0.15 + Math.sin(time * 1.2) * 0.08), height * (0.8 + Math.cos(time * 0.9) * 0.08), 0, width * 0.15, height * 0.8, width * 0.35);
        g4.addColorStop(0, c1 + '90'); g4.addColorStop(0.5, c1 + '30'); g4.addColorStop(1, 'transparent');
        ctx.fillStyle = g4; ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        for (let r = 0; r < 8; r++) {
          const rayAngle = time * 0.2 + r * 0.85;
          const rayX = width * (0.06 + r * 0.13 + Math.sin(rayAngle) * 0.04);
          const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + Math.cos(rayAngle) * 120, height * 0.75);
          rayGrad.addColorStop(0, c1 + '50'); rayGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = rayGrad;
          ctx.beginPath(); ctx.moveTo(rayX - 20, 0); ctx.lineTo(rayX + 20, 0); ctx.lineTo(rayX + 90, height * 0.75); ctx.lineTo(rayX - 90, height * 0.75); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        const rim = ctx.createLinearGradient(0, 0, width, 0);
        rim.addColorStop(0, c1 + '70'); rim.addColorStop(0.5, c2 + '50'); rim.addColorStop(1, c1 + '70');
        ctx.fillStyle = rim; ctx.fillRect(0, 0, width, 5);
        const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.2, width / 2, height / 2, height);
        vignette.addColorStop(0, 'transparent'); vignette.addColorStop(0.7, 'rgba(0,0,0,0.2)'); vignette.addColorStop(1, 'rgba(0,0,0,0.75)');
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
      }
      animRef.current = requestAnimationFrame(draw);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={enabled ? 'fixed inset-0 pointer-events-none' : 'hidden'}
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
