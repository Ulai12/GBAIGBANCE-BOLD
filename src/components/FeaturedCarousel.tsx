import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  MapPin,
  Sparkles,
  Ticket,
  Flame,
  ArrowRight,
} from 'lucide-react';
import type { Event, Language } from '@/types';
import { useApp } from '@/hooks/useApp';
import { isEventTerminated } from '@/features/events/status';
import { SmartImage } from '@/components/SmartImage';
import { OptimisticHeartButton } from '@/components/OptimisticHeartButton';
import { getDefaultEventCover } from '@/utils/defaultImages';
import { formatCurrency } from '@/utils/format';
import { preloadResponsiveImages } from '@/utils/preloadResponsiveImages';
import { useDataSaver } from '@/hooks/useDataSaver';

interface FeaturedCarouselProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBookEvent?: (event: Event) => void;
}

function formatDate(dateString: string | null | undefined, language: Language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
}

/** Verrouillage synchrone anti double-swipe (ms). */
const SLIDE_LOCK_MS = 360;

export function FeaturedCarousel({
  events,
  onEventClick,
  onBookEvent,
}: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden'
  );
  const [direction, setDirection] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideLockRef = useRef(false);
  const [isSliding, setIsSliding] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { isDataSaverActive } = useDataSaver();
  const { language, t } = useApp();

  const featuredList = useMemo(
    () =>
      Array.isArray(events)
        ? events.filter((e): e is Event => Boolean(e && e.id && !isEventTerminated(e))).slice(0, 6)
        : [],
    [events]
  );
  const total = featuredList.length;

  const safeIndex = total > 0 && currentIndex >= 0 && currentIndex < total ? currentIndex : 0;

  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, total]);

  const lockSlide = useCallback(() => {
    slideLockRef.current = true;
    setIsSliding(true);
    window.setTimeout(() => {
      slideLockRef.current = false;
      setIsSliding(false);
    }, SLIDE_LOCK_MS);
  }, []);

  const nextSlide = useCallback(() => {
    if (total <= 1 || slideLockRef.current) return;
    lockSlide();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total, lockSlide]);

  const prevSlide = useCallback(() => {
    if (total <= 1 || slideLockRef.current) return;
    lockSlide();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total, lockSlide]);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    if (isPaused || !isDocumentVisible || total <= 1) return;
    timerRef.current = setTimeout(nextSlide, 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [currentIndex, isPaused, isDocumentVisible, total, nextSlide]);

  useEffect(() => {
    if (!isDocumentVisible || total <= 1) return;
    const adjacentIndexes = [(safeIndex + 1) % total, (safeIndex - 1 + total) % total];
    const adjacentUrls = adjacentIndexes.map((index) => {
      const event = featuredList[index];
      return event
        ? event.cover_url || event.images?.[0] || getDefaultEventCover(event.id, event.category, event.title)
        : null;
    });
    preloadResponsiveImages(adjacentUrls, {
      widths: isDataSaverActive ? [240, 480] : [480, 768, 1080, 1440],
      sizes: '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px',
      dataSaver: isDataSaverActive,
      limit: 2,
    });
  }, [safeIndex, featuredList, total, isDocumentVisible, isDataSaverActive]);

  if (featuredList.length === 0) return null;
  const currentEvent = featuredList[safeIndex];
  if (!currentEvent) return null;

  const formattedPrice =
    currentEvent.price_min == null || currentEvent.price_min === 0
      ? t('events', 'free')
      : formatCurrency(Number(currentEvent.price_min), 'XOF', language);
  const rawCategory = String(currentEvent.category || '').trim();
  const categoryKey = rawCategory.toLowerCase();
  const categoryTranslation = categoryKey ? t('events', `categories.${categoryKey}`) : '';
  const categoryLabel =
    categoryTranslation && categoryTranslation !== `categories.${categoryKey}`
      ? categoryTranslation
      : rawCategory || t('events', 'event');

  const variants = {
    enter: (slideDirection: number) => ({
      x: slideDirection >= 0 ? '108%' : '-108%',
      rotateY: slideDirection >= 0 ? -13 : 13,
      scale: 0.94,
      opacity: 0.92,
    }),
    center: { x: '0%', rotateY: 0, scale: 1, opacity: 1 },
    exit: (slideDirection: number) => ({
      x: slideDirection >= 0 ? '-108%' : '108%',
      rotateY: slideDirection >= 0 ? 13 : -13,
      scale: 0.94,
      opacity: 0.92,
    }),
  };

  const coverUrl =
    currentEvent.cover_url ||
    currentEvent.images?.[0] ||
    getDefaultEventCover(currentEvent.id, currentEvent.category, currentEvent.title);

  return (
    <div
      className="relative w-full [perspective:1400px] group select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <div className="relative aspect-[16/10] sm:aspect-[21/10] w-full min-h-[330px] sm:min-h-[350px] bg-transparent">
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={currentEvent.id}
            custom={direction}
            variants={prefersReducedMotion ? undefined : variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: prefersReducedMotion ? 0.01 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              transformPerspective: 1400,
              transformStyle: 'preserve-3d',
              touchAction: isSliding ? 'auto' : 'none',
            }}
            drag={isSliding ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragMomentum={false}
            dragDirectionLock
            dragSnapToOrigin
            onDragStart={() => {
              if (slideLockRef.current) return;
              setIsPaused(true);
            }}
            onDragEnd={(_, info) => {
              setIsPaused(false);
              if (slideLockRef.current) return;
              if (info.offset.x < -90 || info.velocity.x < -500) {
                nextSlide();
              } else if (info.offset.x > 90 || info.velocity.x > 500) {
                prevSlide();
              }
            }}
            className="absolute inset-0 overflow-hidden rounded-[2rem] bg-[#111318] shadow-[0_18px_48px_rgba(0,0,0,0.28)] cursor-grab active:cursor-grabbing will-change-transform"
            onClick={() => {
              if (!slideLockRef.current) onEventClick(currentEvent);
            }}
          >
            <SmartImage
              src={coverUrl}
              alt={currentEvent.title}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
              widths={[480, 768, 1080, 1440]}
              className="w-full h-full object-cover pointer-events-none"
              loading="eager"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20 pointer-events-none" />
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center uppercase gap-1.5 px-3 py-1.5 rounded-full bg-[#6600FF]/30 text-white text-xs font-black tracking-wide backdrop-blur-md shadow-md border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  {t('events', 'featured')}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 text-white text-[11px] font-bold backdrop-blur-md border border-white/20">
                  {categoryLabel.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/50 text-white text-xs font-black backdrop-blur-md shadow-sm border border-white/20">
                  <Flame className="w-3.5 h-3.5 text-yellow-200 uppercase animate-pulse" />
                  <span>{t('events', 'hot')}</span>
                </div>
                <OptimisticHeartButton eventId={currentEvent.id} size="md" variant="glass" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-9 sm:px-7 sm:pb-10 flex flex-col gap-2.5 z-10">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-white/95">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/15 shadow-sm">
                  <CalendarDays className="w-3.5 h-3.5 text-[#A78BFA]" />
                  {formatDate(currentEvent.starts_at, language)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-md border border-white/15 shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">
                    {currentEvent.location_name || currentEvent.city}
                  </span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight line-clamp-2 max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {currentEvent.title}
              </h2>
              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-white/80 uppercase tracking-wider font-semibold drop-shadow-sm">
                    {t('events', 'entryPrice')}
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
                      className="px-4 py-2.5 rounded-full bg-white/95 border border-[#6600FF]/10 hover:bg-[#5200CC] text-[#17131D] hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-colors cursor-pointer"
                    >
                      <Ticket className="w-4 h-4 text-[#6600FF]" />
                      <span className="text-black uppercase">{t('events', 'bookNow')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(currentEvent);
                    }}
                    className="w-9 h-9 rounded-full bg-black/55 hover:bg-black/70 text-white flex items-center justify-center active:scale-90 transition-colors cursor-pointer"
                    aria-label={t('events', 'viewEvent')}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {total > 1 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 z-20 pointer-events-auto shadow-sm">
          {featuredList.map((evt, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={evt.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (slideLockRef.current) return;
                  lockSlide();
                  setDirection(idx > safeIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive ? 'w-6 bg-white shadow-xs' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={t('events', 'goToSlide').replace('{index}', String(idx + 1))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
