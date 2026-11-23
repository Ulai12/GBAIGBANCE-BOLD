import { motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { ArrowUpRight, CalendarDays, Heart, MapPin, Ticket, Map } from 'lucide-react';
import { forwardRef, useRef } from 'react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { useFavorites } from '@/contexts/FavoritesContext';
import { formatDate } from '@/utils/format';
import { getDefaultEventCover } from '@/utils/defaultImages';
import { useApp } from '@/hooks/useApp';
import { formatCurrency } from '@/utils/format';

interface TrendingDeckCardProps {
  event: Event;
  index: number;
  active: boolean;
  onOpen: () => void;
  onBook: () => void;
  onAdvance: (direction: 1 | -1) => void;
}

export const TrendingDeckCard = forwardRef<HTMLElement, TrendingDeckCardProps>(function TrendingDeckCard(
  { event, index, active, onOpen, onBook, onAdvance }: TrendingDeckCardProps,
  ref
) {
  const { isLiked, toggleLike } = useFavorites();
  const { language, t } = useApp();
  const liked = isLiked(event.id);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-10, 0, 10]);
  const likeOpacity = useTransform(x, [20, 130], [0, 1]);
  const prefersReducedMotion = useReducedMotion();
  const dragging = useRef(false);
  const offset = index;
  const isBehind = !active;

  // Visual stack styling for depth
  const stackScale = 1 - Math.min(offset, 2) * 0.05;
  const stackY = Math.min(offset, 2) * 14;
  const stackRotate = offset === 1 ? 2.5 : offset === 2 ? -2 : 0;
  const stackOpacity = offset === 0 ? 1 : 0.82;
  const cardVariants = {
    enter: (direction: number) => prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, x: direction > 0 ? 42 : -42, scale: 0.985, y: 8 },
    center: { opacity: 1, x: 0, scale: 1, y: 0 },
    exit: (direction: number) => prefersReducedMotion
      ? { opacity: 0, transition: { duration: 0.12 } }
      : {
          opacity: 0,
          x: direction > 0 ? -76 : 76,
          scale: 0.985,
          y: -3,
          transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
        },
  };

  return (
    <motion.article
      ref={ref}
      className="event-deck-card absolute inset-0 overflow-hidden rounded-[2rem] bg-[#1A162B] text-white shadow-2xl"
      style={{
        rotate: active ? rotate : stackRotate,
        zIndex: active ? 3 : 2,
        transformOrigin: '50% 90%',
        pointerEvents: active ? 'auto' : 'none',
        touchAction: active ? 'pan-y' : 'auto',
      }}
      variants={cardVariants}
      initial={active ? "enter" : false}
      animate={active ? "center" : { opacity: stackOpacity, scale: stackScale, y: stackY }}
      exit="exit"
      transition={prefersReducedMotion
        ? { duration: 0 }
        : { type: 'spring', stiffness: 360, damping: 34, mass: 0.72 }}
      drag={active ? 'x' : false}
      dragConstraints={{ left: -360, right: 360 }}
      dragElastic={0.18}
      dragMomentum={false}
      dragSnapToOrigin
      onDragStart={() => { dragging.current = true; x.set(0); }}
      onDrag={(_, info) => { x.set(info.offset.x); }}
      onDragEnd={(_, info) => {
        const shouldAdvance = Math.abs(info.offset.x) > 82 || Math.abs(info.velocity.x) > 560;
        if (shouldAdvance) {
          const swipeDirection = Math.abs(info.offset.x) > 12
            ? (info.offset.x < 0 ? 1 : -1)
            : (info.velocity.x < 0 ? 1 : -1);
          onAdvance(swipeDirection);
        }
        x.set(0);
        window.setTimeout(() => { dragging.current = false; }, 0);
      }}
      onClick={() => {
        if (!dragging.current) onOpen();
      }}
      role="group"
      tabIndex={active ? 0 : -1}
      aria-hidden={!active}
      aria-label={t('events', 'discoverEvent').replace('{title}', event.title)}
    >
      <div className="absolute inset-0">
        <SmartImage
          src={event.cover_url || event.images?.[0] || getDefaultEventCover(event.id, event.category, event.title)}
          alt={event.title}
          className="h-full w-full object-cover"
          widths={[480, 768, 1080, 1440]}
          sizes="(max-width: 640px) calc(100vw - 2rem), 90vw"
          loading={active ? 'eager' : 'lazy'}
          fetchPriority={active ? 'high' : 'low'}
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,7,15,.10)_20%,rgba(10,7,15,.35)_42%,rgba(10,7,15,.95)_100%)]" />

      {/* Top Bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 z-10">
        <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white">
          {t('events', 'trendNumber').replace('{number}', String(index + 1).padStart(2, '0'))}
        </span>
        <button
          type="button"
          disabled={!active}
          aria-label={liked ? t('events', 'removeFavorite') : t('events', 'addFavorite')}
          onClick={(e) => {
            e.stopPropagation();
            toggleLike(event.id);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/55 transition-transform hover:scale-105 active:scale-95 text-white"
        >
          <Heart className={`h-5 w-5 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
      </div>

      <motion.div style={{ opacity: likeOpacity }} className="absolute left-5 top-20 rounded-full border border-lime-300/50 bg-lime-400/30 px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-lime-200 ">
        {t('events', 'discover')}
      </motion.div>

      {/* Bottom Content */}
      <div className="absolute inset-x-5 bottom-5 z-10">
        <div className="mb-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/85">
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/55 px-2.5 py-1">
            <CalendarDays className="h-3.5 w-3.5 text-[#A78BFA]" /> 
            {formatDate(event.starts_at, language)}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 ">
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
              {event.location_name || t('events', 'locationToConfirm')}
            </p>
            <p className="mt-1 text-[1.3em] font-black text-[#A78BFA]">
              {event.price_min == null || Number(event.price_min) === 0
                ? t('events', 'free')
                : formatCurrency(Number(event.price_min), 'XOF', language)}
            </p>
          </div>
          <button
            type="button"
            disabled={!active}
            onClick={(eventClick) => {
              eventClick.stopPropagation();
              onBook();
            }}
            className="flex min-h-11 items-center gap-2 rounded-full border border-[#6600FF]/10 bg-white/95 px-4 uppercase text-xs font-black text-[#17131D] shadow-md transition-transform hover:scale-[1.02] active:scale-95 motion-reduce:transform-none"
          >
            <Ticket className="h-4 w-4 text-[#6600FF]" /> {t('events', 'bookNow')}
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-5 right-5 hidden h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 sm:flex">
        <ArrowUpRight className="h-4 w-4" />
      </div>
    </motion.article>
  );
});
