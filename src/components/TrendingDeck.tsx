import { AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/hooks/useApp';
import type { Event } from '@/types';
import { TrendingDeckCard } from '@/components/TrendingDeckCard';
import { useDataSaver } from '@/hooks/useDataSaver';
import { getDefaultEventCover } from '@/utils/defaultImages';
import { preloadResponsiveImages } from '@/utils/preloadResponsiveImages';

interface TrendingDeckProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBookEvent: (event: Event) => void;
}

/** Durée de verrouillage parent après un advance (couvre l'exit + re-mount). */
const ADVANCE_LOCK_MS = 380;

export function TrendingDeck({ events, onEventClick, onBookEvent }: TrendingDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [parentLocked, setParentLocked] = useState(false);
  const parentLockedRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useApp();
  const { isDataSaverActive } = useDataSaver();
  const visibleEvents = useMemo(
    () => events.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at) > new Date()),
    [events]
  );

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(visibleEvents.length - 1, 0)));
  }, [visibleEvents.length]);

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Précharge seulement les deux événements voisins, à basse priorité.
  useEffect(() => {
    if (visibleEvents.length <= 1) return;

    const nextIndex = (activeIndex + 1) % visibleEvents.length;
    const previousIndex = (activeIndex - 1 + visibleEvents.length) % visibleEvents.length;
    const adjacentUrls = [nextIndex, previousIndex].map((index) => {
      const event = visibleEvents[index];
      return event
        ? event.cover_url || event.images?.[0] || getDefaultEventCover(event.id, event.category, event.title)
        : null;
    });

    preloadResponsiveImages(adjacentUrls, {
      widths: isDataSaverActive ? [240, 480] : [480, 768, 1080, 1440],
      sizes: '(max-width: 640px) calc(100vw - 2rem), 90vw',
      dataSaver: isDataSaverActive,
      limit: 2,
    });
  }, [activeIndex, visibleEvents, isDataSaverActive]);

  const lockAdvance = useCallback(() => {
    parentLockedRef.current = true;
    setParentLocked(true);
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = window.setTimeout(() => {
      parentLockedRef.current = false;
      setParentLocked(false);
      lockTimerRef.current = null;
    }, ADVANCE_LOCK_MS);
  }, []);

  const advance = useCallback(() => {
    if (parentLockedRef.current) return;
    lockAdvance();
    setActiveIndex((current) => (current + 1) % visibleEvents.length);
  }, [lockAdvance, visibleEvents.length]);

  const previous = useCallback(() => {
    if (parentLockedRef.current) return;
    lockAdvance();
    setActiveIndex((current) => (current - 1 + visibleEvents.length) % visibleEvents.length);
  }, [lockAdvance, visibleEvents.length]);

  if (visibleEvents.length === 0) return null;

  return (
    <div
      className="w-full"
      role="region"
      aria-label={t('events', 'trending')}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          advance();
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          previous();
        }
      }}
    >
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#8B5CF6]">
            <Sparkles className="h-3.5 w-3.5" /> {t('events', 'trendingNow')}
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">
            {t('events', 'trending')}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={previous}
            disabled={parentLocked}
            aria-label={t('events', 'previousTrendingEvent')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-[#17131d] dark:text-white transition-transform hover:scale-105 active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={parentLocked}
            aria-label={t('events', 'nextTrendingEvent')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17131d] dark:bg-white text-white dark:text-[#17131d] transition-transform hover:scale-105 active:scale-90 disabled:opacity-50 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative h-[26rem] touch-pan-y" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          {(() => {
            const stackEvents: { event: Event; stackIndex: number }[] = [];
            const maxVisible = Math.min(2, visibleEvents.length);
            for (let i = 0; i < maxVisible; i++) {
              const eventIndex = (activeIndex + i) % visibleEvents.length;
              const currentEvent = visibleEvents[eventIndex];
              if (currentEvent && !stackEvents.some((s) => s.event.id === currentEvent.id)) {
                stackEvents.push({ event: currentEvent, stackIndex: i });
              }
            }
            return stackEvents.map(({ event: currentEvent, stackIndex }) => {
              const isActive = stackIndex === 0;
              return (
                <TrendingDeckCard
                  key={currentEvent.id}
                  event={currentEvent}
                  index={stackIndex}
                  total={visibleEvents.length}
                  active={isActive}
                  parentLocked={parentLocked}
                  onOpen={() => onEventClick(currentEvent)}
                  onBook={() => onBookEvent(currentEvent)}
                  onAdvance={advance}
                />
              );
            });
          })()}
        </AnimatePresence>
      </div>
      <div
        className="mt-6 flex items-center justify-center gap-1.5"
        role="group"
        aria-label={t('events', 'eventPosition')
          .replace('{current}', String(activeIndex + 1))
          .replace('{total}', String(visibleEvents.length))}
      >
        {visibleEvents.map((event, index) => (
          <button
            key={event.id}
            type="button"
            onClick={() => {
              if (parentLockedRef.current) return;
              lockAdvance();
              setActiveIndex(index);
            }}
            aria-label={t('events', 'showEvent').replace('{title}', event.title)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'w-8 bg-[#17131d] dark:bg-white' : 'w-1.5 bg-black/20 dark:bg-white/25'
            }`}
          />
        ))}
      </div>
      <p className="mt-2.5 text-center text-xs font-medium text-black/45 dark:text-white/40">
        {t('events', 'swipeToDiscover')}
      </p>
    </div>
  );
}
