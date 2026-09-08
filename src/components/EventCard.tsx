import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowUpRight, CalendarDays, Heart, MapPin, Ticket, Map } from 'lucide-react';
import { useRef } from 'react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';

interface TrendingDeckCardProps {
  event: Event;
  index: number;
  total: number;
  active: boolean;
  onOpen: () => void;
  onBook: () => void;
  onAdvance: () => void;
}

function formatDate(date?: string) {
  if (!date) return 'À venir';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(date));
  } catch {
    return 'À venir';
  }
}

export function TrendingDeckCard({ event, index, total, active, onOpen, onBook, onAdvance }: TrendingDeckCardProps) {
  if (!event) return null;

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-8, 0, 8]);
  const imageScale = useTransform(x, [-260, 0, 260], [1.08, 1, 1.08]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const prefersReducedMotion = useReducedMotion();
  const dragging = useRef(false);
  const offset = index;
  const isBehind = !active;

  return (
    <motion.article
      className="event-deck-card absolute inset-0 overflow-hidden rounded-[2rem] bg-[#17131d] text-white shadow-2xl"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : offset * -2.5,
        scale: active ? 1 : 1 - Math.min(Math.abs(offset), 2) * 0.045,
        y: active ? 0 : Math.abs(offset) * 12,
        zIndex: total - index,
        transformOrigin: '50% 90%',
        pointerEvents: active ? 'auto' : 'none',
        touchAction: active ? 'pan-y' : 'auto',
      }}
      initial={isBehind ? { opacity: 0.65 } : { opacity: 0, scale: 0.94, y: 24 }}
      animate={{ opacity: active ? 1 : 0.72, scale: active ? 1 : 1 - Math.min(Math.abs(offset), 2) * 0.045, y: active ? 0 : Math.abs(offset) * 12 }}
      exit={{ opacity: 0, x: x.get() > 0 ? 420 : -420, rotate: x.get() > 0 ? 14 : -14, transition: { duration: 0.3, ease: 'easeIn' } }}
      transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 280, damping: 28, mass: 0.8 }}
      drag={active ? 'x' : false}
      dragConstraints={{ left: -24, right: 24 }}
      dragElastic={0.9}
      dragSnapToOrigin
      onDragStart={() => { dragging.current = true; }}
      onDragEnd={(_, info) => {
        const shouldAdvance = Math.abs(info.offset.x) > 90 || Math.abs(info.velocity.x) > 520;
        if (shouldAdvance) onAdvance();
        window.setTimeout(() => { dragging.current = false; }, 0);
      }}
      onClick={() => {
        if (!dragging.current) onOpen();
      }}
      aria-label={`Découvrir ${event.title || ''}`}
    >
      <motion.div className="absolute inset-0" style={{ scale: active ? imageScale : 1 }}>
        <SmartImage
          src={event.cover_url || event.images?.[0]}
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,15,.04)_20%,rgba(10,7,15,.18)_42%,rgba(10,7,15,.94)_100%)]" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
        <span className="shrink-0 rounded-full border border-white/20 bg-black/10 px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
          Tendance {String(index + 1).padStart(2, '0')}
        </span>
        <button type="button" aria-label="Ajouter aux favoris" onClick={(eventClick) => eventClick.stopPropagation()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/10 backdrop-blur-xl transition-transform hover:scale-105 active:scale-90">
          <Heart className="h-6 w-6" />
        </button>
      </div>

      <motion.div style={{ opacity: likeOpacity }} className="absolute left-5 top-24 rounded-full border border-lime-300/50 bg-lime-300/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-200 backdrop-blur-xl">
        À découvrir
      </motion.div>

      {/* Zone du bas avec max-height et overflow contrôlé */}
      <div className="absolute inset-x-5 bottom-5 max-h-[65%] overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/75">
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/10 px-2 py-1 backdrop-blur-xl">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" /> 
            <span className="truncate">{formatDate(event.starts_at)}</span>
          </span>
          <span className="flex items-center gap-1 max-w-[140px]">
            <Map className="h-3.5 w-3.5 shrink-0 text-[#a78dfa]" />
            <span className="truncate">{event.city}</span>
          </span>
        </div>

        {/* CSS natif multi-lignes sans dépendance externe */}
        <h3 
          className="text-[1.75rem] sm:text-[2rem] font-black leading-[0.96] tracking-[-0.04em] overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word'
          }}
        >
          {event.title}
        </h3>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location_name || 'Lieu à confirmer'}</span>
            </p>
            <p className="mt-1 text-[1.25em] sm:text-[1.35em] font-black text-[#a78dfa] truncate">
              {event.price_min === 0 
                ? 'Entrée libre' 
                : typeof event.price_min === 'number' 
                  ? `Dès ${event.price_min.toLocaleString('fr-FR')} FCFA` 
                  : 'Prix non défini'}
            </p>
          </div>

          <button type="button" onClick={(eventClick) => { eventClick.stopPropagation(); onBook(); }} className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#17131d] transition-transform hover:scale-105 active:scale-95">
            <Ticket className="h-4 w-4" /> Réserver
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl sm:flex">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.article>
  );
}
