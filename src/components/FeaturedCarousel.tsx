import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Ticket,
  Flame,
  ArrowRight,
  Heart,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { useFavorites } from '@/contexts/FavoritesContext';

interface FeaturedCarouselProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBookEvent?: (event: Event) => void;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

export function FeaturedCarousel({
  events,
  onEventClick,
  onBookEvent,
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { isLiked, toggleLike } = useFavorites();
  const prefersReducedMotion = useReducedMotion();

  const featuredList = events.length > 0 ? events.slice(0, 6) : [];
  const total = featuredList.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Preload all featured event images into memory to completely eliminate black flashes on transitions
  useEffect(() => {
    if (featuredList.length === 0 || typeof window === 'undefined') return;
    featuredList.forEach((ev) => {
      const url = ev.cover_url || ev.images?.[0];
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, [featuredList]);

  // Auto-scroll loop
  useEffect(() => {
    if (isPaused || total <= 1) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total, nextSlide]);

  if (featuredList.length === 0) return null;

  const currentEvent = featuredList[currentIndex];
  const liked = isLiked(currentEvent.id);

  const formattedPrice =
    currentEvent.price_min === 0
      ? 'Gratuit'
      : `${currentEvent.price_min.toLocaleString('fr-FR')} FCFA`;

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.98,
    }),
  };

  const coverUrl = currentEvent.cover_url || currentEvent.images?.[0];

  return (
    <div
      className="relative w-full overflow-hidden rounded-[2rem] shadow-xl group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* SLIDE CONTAINER WITH DRAG / SWIPE */}
      <div className="relative aspect-[16/10] sm:aspect-[21/10] w-full min-h-[310px] overflow-hidden bg-gradient-to-br from-[#2D1B4E] via-[#1E172E] to-[#120E22]">
        {/* Ambient subtle color wash behind slides to prevent pitch black flash */}
        {coverUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 blur-2xl scale-110 opacity-30 pointer-events-none"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
        )}

        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentEvent.id}
            custom={direction}
            variants={prefersReducedMotion ? undefined : variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 320, damping: 32 },
              opacity: { duration: 0.22 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              const swipeThreshold = 50;
              if (info.offset.x < -swipeThreshold) {
                nextSlide();
              } else if (info.offset.x > swipeThreshold) {
                prevSlide();
              }
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onClick={() => onEventClick(currentEvent)}
          >
            {/* BACKGROUND COVER IMAGE */}
            <SmartImage
              src={coverUrl}
              alt={currentEvent.title}
              className="w-full h-full object-cover pointer-events-none"
              loading="eager"
              fetchPriority="high"
            />

            {/* LIGHT AND OPTICAL GRADIENT OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20 pointer-events-none" />

            {/* TOP BADGES & ACTIONS */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center uppercase gap-1.5 px-3 py-1.5 rounded-full bg-[#6600FF]/30 text-white text-xs font-black tracking-wide backdrop-blur-md shadow-md border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  À LA UNE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 text-white text-[11px] font-bold backdrop-blur-md border border-white/20">
                  {currentEvent.category.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/50 text-white text-xs font-black backdrop-blur-md shadow-sm border border-white/20">
                  <Flame className="w-3.5 h-3.5 text-yellow-200 uppercase animate-pulse" />
                  <span>HOT</span>
                </div>

                {/* LIKE BUTTON */}
                <motion.button
                  type="button"
                  aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(currentEvent.id);
                  }}
                  className="
                    h-8 w-8 rounded-full bg-black/40 border border-white/20
                    backdrop-blur-md flex items-center justify-center text-white
                    hover:bg-black/60 transition-colors
                  "
                >
                  <Heart
                    className={`w-4 h-4 transition-transform ${
                      liked ? 'scale-110 fill-red-500 text-red-500' : 'text-white'
                    }`}
                  />
                </motion.button>
              </div>
            </div>

            {/* CONTENT BOTTOM */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 flex flex-col gap-2.5 z-10">
              {/* DATE & VENUE */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/95">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/15 backdrop-blur-md border border-white/15 shadow-sm">
                  <CalendarDays className="w-3.5 h-3.5 text-[#A78BFA]" />
                  {formatDate(currentEvent.starts_at)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/15 backdrop-blur-md border border-white/15 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {currentEvent.location_name || currentEvent.city}
                  </span>
                </span>
              </div>

              {/* TITLE */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight line-clamp-2 max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentEvent.title}
              </h2>

              {/* ACTIONS & PRICE */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wider font-semibold drop-shadow-sm">
                    Tarif d'entrée
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-[#A78BFA] drop-shadow-md shadow-white">
                    {formattedPrice}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {onBookEvent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBookEvent(currentEvent);
                      }}
                      className="px-4 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-[#6600FF]/10 hover:bg-[#5200CC] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <Ticket className="w-4 h-4 text-[#6600FF]" />
                      <span className="text-black text-black uppercase">Réserver</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(currentEvent);
                    }}
                    className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-all"
                    aria-label="Voir l'événement"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

        {/* BOTTOM INDICATOR PILLS */}
        {total > 1 && (
          <div className="absolute bottom-3 left-2/4 -translate-x-1/2 flex items-center gap-1.5 z-20 pointer-events-auto">
            {featuredList.map((evt, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDirection(idx > currentIndex ? 1 : -1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-7 bg-white shadow-xs'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Aller au slide ${idx + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>
  );
}
