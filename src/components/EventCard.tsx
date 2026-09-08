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

function formatDate(date: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
}

export function TrendingDeckCard({ event, index, total, active, onOpen, onBook, onAdvance }: TrendingDeckCardProps) {
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
      aria-label={`Découvrir ${event.title}`}
    >
      {/* Fond Image */}
      <motion.div className="absolute inset-0" style={{ scale: active ? imageScale : 1 }}>
        <SmartImage
          src={event.cover_url || event.images?.[0]}
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Masque Dégradé */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,15,.04)_20%,rgba(10,7,15,.25)_40%,rgba(10,7,15,.96)_85%)]" />

      {/* En-tête (Top Bar) */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4 sm:p-5">
        <span className="shrink-0 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md sm:text-[12px]">
          Tendance {String(index + 1).padStart(2, '0')}
        </span>
        <button 
          type="button" 
          aria-label="Ajouter aux favoris" 
          onClick={(eventClick) => eventClick.stopPropagation()} 
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/20 backdrop-blur-xl transition-transform hover:scale-105 active:scale-90 sm:h-10 sm:w-10"
        >
          <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Badge swipe optionnel */}
      <motion.div 
        style={{ opacity: likeOpacity }} 
        className="absolute left-4 top-20 z-10 rounded-full border border-lime-300/50 bg-lime-300/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-200 backdrop-blur-xl sm:left-5 sm:top-24"
      >
        À découvrir
      </motion.div>

      {/* Bloc d'informations inférieur */}
      <div className="absolute inset-x-4 bottom-4 z-10 max-h-[70%] overflow-hidden sm:inset-x-5 sm:bottom-5">
        {/* Meta (Date & Ville) */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-white/80 sm:mb-3 sm:gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 bg-black/20 px-2.5 py-1 backdrop-blur-xl">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white" /> 
            <span className="truncate">{formatDate(event.starts_at)}</span>
          </span>
          <span className="inline-flex min-w-0 max-w-[150px] items-center gap-1 rounded-full border border-white/10 bg-black/10 px-2 py-1 backdrop-blur-md">
            <Map className="h-3.5 w-3.5 shrink-0 text-[#a78dfa]" />
            <span className="truncate">{event.city}</span>
          </span>
        </div>

        {/* Titre avec clamp */}
        <h3 className="line-clamp-2 max-w-full break-words text-2xl font-black leading-[1.05] tracking-[-0.03em] sm:text-[2rem] sm:leading-[0.96]">
          {event.title}
        </h3>

        {/* Pied de carte (Lieu, Prix & Bouton) */}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2.5 sm:mt-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs text-white/60">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{event.location_name || 'Lieu à confirmer'}</span>
            </p>
            <p className="mt-0.5 truncate text-base font-black text-[#a78dfa] sm:mt-1 sm:text-[1.35em]">
              {event.price_min === 0 ? 'Entrée libre' : `Dès ${event.price_min.toLocaleString('fr-FR')} FCFA`}
            </p>
          </div>

          <button 
            type="button" 
            onClick={(eventClick) => { eventClick.stopPropagation(); onBook(); }} 
            className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-black text-[#17131d] transition-transform hover:scale-105 active:scale-95 sm:h-12 sm:px-4 sm:text-sm"
          >
            <Ticket className="h-4 w-4 shrink-0" /> Réserver
          </button>
        </div>
      </div>

      {/* Bouton décoratif coin inférieur droit */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-0 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl md:flex">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.article>
  );
}
