import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowUpRight, CalendarDays, Heart, MapPin, Ticket, Map } from 'lucide-react';
import { forwardRef, useRef } from 'react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { useFavorites } from '@/contexts/FavoritesContext';

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

export const TrendingDeckCard = forwardRef<HTMLElement, TrendingDeckCardProps>(function TrendingDeckCard(
  { event, index, total, active, onOpen, onBook, onAdvance }: TrendingDeckCardProps,
  ref
) {
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-10, 0, 10]);
  const imageScale = useTransform(x, [-260, 0, 260], [1.08, 1, 1.08]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const prefersReducedMotion = useReducedMotion();
  const dragging = useRef(false);
  const offset = index;
  const isBehind = !active;

  // Visual stack styling for depth
  const stackScale = 1 - Math.min(offset, 2) * 0.05;
  const stackY = Math.min(offset, 2) * 14;
  const stackRotate = offset === 1 ? 2.5 : offset === 2 ? -2 : 0;
  const stackOpacity = offset === 0 ? 1 : offset === 1 ? 0.88 : 0.65;

  return (
    <motion.article
      ref={ref}
      className="event-deck-card absolute inset-0 overflow-hidden rounded-[2rem] bg-[#1A162B] text-white shadow-2xl"
      style={{
        x: active ? x : 0,
        rotate: active ? rotate : stackRotate,
        scale: active ? 1 : stackScale,
        y: active ? 0 : stackY,
        zIndex: total - index,
        transformOrigin: '50% 90%',
        pointerEvents: active ? 'auto' : 'none',
        touchAction: active ? 'pan-y' : 'auto',
      }}
      initial={isBehind ? { opacity: 0.5, scale: stackScale * 0.96, y: stackY + 16 } : { opacity: 0, scale: 0.94, y: 24 }}
      animate={{
        opacity: stackOpacity,
        scale: active ? 1 : stackScale,
        y: active ? 0 : stackY,
        rotate: active ? 0 : stackRotate,
      }}
      exit={{
        opacity: 0,
        x: x.get() > 0 ? 420 : -420,
        rotate: x.get() > 0 ? 16 : -16,
        transition: { duration: 0.28, ease: 'easeIn' },
      }}
      transition={prefersReducedMotion ? { duration: 0.01 } : { type: 'spring', stiffness: 300, damping: 28, mass: 0.7 }}
      drag={active ? 'x' : false}
      dragConstraints={{ left: -30, right: 30 }}
      dragElastic={0.85}
      dragSnapToOrigin
      onDragStart={() => { dragging.current = true; }}
      onDragEnd={(_, info) => {
        const shouldAdvance = Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500;
        if (shouldAdvance) onAdvance();
        window.setTimeout(() => { dragging.current = false; }, 0);
      }}
      onClick={() => {
        if (!dragging.current) onOpen();
      }}
      aria-label={`Découvrir ${event.title}`}
    >
      <motion.div className="absolute inset-0" style={{ scale: active ? imageScale : 1 }}>
        <SmartImage
          src={event.cover_url || event.images?.[0]}
          alt={event.title}
          className="h-full w-full object-cover"
        />
      </motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,15,.10)_20%,rgba(10,7,15,.35)_42%,rgba(10,7,15,.95)_100%)]" />

      {/* Top Bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 z-10">
        <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
          Tendance {String(index + 1).padStart(2, '0')}
        </span>
        <button
          type="button"
          aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(event.id);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/30 backdrop-blur-xl transition-transform hover:scale-110 active:scale-90 text-white"
        >
          <Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
      </div>

      <motion.div style={{ opacity: likeOpacity }} className="absolute left-5 top-20 rounded-full border border-lime-300/50 bg-lime-400/30 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-200 backdrop-blur-xl">
        À découvrir
      </motion.div>

      {/* Bottom Content */}
      <div className="absolute inset-x-5 bottom-5 z-10">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 backdrop-blur-xl">
            <CalendarDays className="h-3.5 w-3.5 text-[#A78BFA]" /> 
            {formatDate(event.starts_at)}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 backdrop-blur-xl">
            <Map className="h-3.5 w-3.5 text-[#A78BFA]" />
            {event.city}
          </span>
        </div>
        <h3 className="max-w-[20rem] text-[1.75rem] sm:text-[2rem] font-black leading-[1.02] tracking-[-0.03em] drop-shadow-md">
          {event.title}
        </h3>
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-white/70">
              <MapPin className="h-3.5 w-3.5" />
              {event.location_name || 'Lieu à confirmer'}
            </p>
            <p className="mt-1 text-[1.3em] font-black text-[#A78BFA]">
              {event.price_min === 0 ? 'Entrée libre' : `${event.price_min.toLocaleString('fr-FR')} FCFA`}
            </p>
          </div>
          <button
            type="button"
            onClick={(eventClick) => {
              eventClick.stopPropagation();
              onBook();
            }}
            className="flex h-11 items-center gap-2 rounded-full bg-white/90 border border-1 border-[#6600FF]/10
             px-5 uppercase text-sm font-black text-[#17131D] transition-all hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-lg"
          >
            <Ticket className="h-4 w-4 text-[#6600FF]" /> Réserver
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-5 right-5 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl sm:flex">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.article>
  );
});
