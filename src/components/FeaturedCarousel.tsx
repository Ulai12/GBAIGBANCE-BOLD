import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  Ticket,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const featuredList = events.length > 0 ? events.slice(0, 6) : [];
  const total = featuredList.length;

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-scroll effect
  useEffect(() => {
    if (isPaused || total <= 1) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, 4500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total, nextSlide]);

  if (featuredList.length === 0) return null;

  const currentEvent = featuredList[currentIndex];
  const formattedPrice =
    currentEvent.price_min === 0
      ? 'Gratuit'
      : `${currentEvent.price_min.toLocaleString('fr-FR')} FCFA`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[2rem] shadow-xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* SLIDE CONTAINER */}
      <div className="relative aspect-[16/10] sm:aspect-[21/10] w-full min-h-[300px] overflow-hidden bg-gradient-to-br from-[#2D1B4E] via-[#1E172E] to-[#120E1E]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentEvent.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 cursor-pointer"
            onClick={() => onEventClick(currentEvent)}
          >
            {/* BACKGROUND COVER */}
            <SmartImage
              src={currentEvent.cover_url || currentEvent.images?.[0]}
              alt={currentEvent.title}
              className="w-full h-full object-cover"
            />

            {/* GRADIENT OVERLAYS */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/30" />

            {/* BADGES TOP */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6600FF]/85 text-white text-xs font-black tracking-wide backdrop-blur-md shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  À LA UNE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-md">
                  {currentEvent.category.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/80 text-white text-xs font-black backdrop-blur-md">
                <Flame className="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
                <span>HOT</span>
              </div>
            </div>

            {/* CONTENT BOTTOM */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 flex flex-col gap-2.5">
              {/* DATE & LOCATION */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/90">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md">
                  <CalendarDays className="w-3.5 h-3.5 text-[#a78dfa]" />
                  {formatDate(currentEvent.starts_at)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md">
                  <MapPin className="w-3.5 h-3.5 text-[#a78dfa]" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {currentEvent.location_name || currentEvent.city}
                  </span>
                </span>
              </div>

              {/* TITLE */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight line-clamp-2 max-w-2xl drop-shadow-sm">
                {currentEvent.title}
              </h2>

              {/* ACTIONS & PRICE */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-white/70 uppercase tracking-wider font-semibold">
                    Tarif d'entrée
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-[#a78dfa]">
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
                      className="px-4 py-2.5 rounded-full bg-[#6600FF] hover:bg-[#5200CC] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Réserver</span>
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

        {/* LEFT / RIGHT NAV ARROWS */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 opacity-80 group-hover:opacity-100 z-10"
              aria-label="Événement précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-all active:scale-90 opacity-80 group-hover:opacity-100 z-10"
              aria-label="Événement suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* BOTTOM INDICATOR PILLS */}
        {total > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-auto">
            {featuredList.map((evt, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={evt.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
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
    </div>
  );
}
