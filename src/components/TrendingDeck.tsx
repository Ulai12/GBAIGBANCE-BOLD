import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import type { Event } from '@/types';
import { TrendingDeckCard } from '@/components/TrendingDeckCard';

interface TrendingDeckProps { events: Event[]; onEventClick: (event: Event) => void; onBookEvent: (event: Event) => void; }

export function TrendingDeck({ events, onEventClick, onBookEvent }: TrendingDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useApp();
  const visibleEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at).getTime() > now);
  }, [events]);
  useEffect(() => { setActiveIndex((current) => Math.min(current, Math.max(visibleEvents.length - 1, 0))); }, [visibleEvents.length]);
  const safeIndex = Math.min(activeIndex, Math.max(visibleEvents.length - 1, 0));
  const advance = useCallback(() => setActiveIndex((current) => (current + 1) % visibleEvents.length), [visibleEvents.length]);
  const previous = useCallback(() => setActiveIndex((current) => (current - 1 + visibleEvents.length) % visibleEvents.length), [visibleEvents.length]);
  if (visibleEvents.length === 0) return null;
  const currentEvent = visibleEvents[safeIndex];
  if (!currentEvent) return null;
  const nextEvent = visibleEvents.length > 1 ? visibleEvents[(safeIndex + 1) % visibleEvents.length] : null;
  const positionLabel = t('events', 'eventPosition').replace('{current}', String(safeIndex + 1)).replace('{total}', String(visibleEvents.length));
  return (
    <section className="w-full" aria-label={t('events', 'trending')} onKeyDown={(event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); previous(); }
    }}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#8B5CF6]"><Sparkles className="h-3.5 w-3.5" /> {t('events', 'trendingNow')}</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">{t('events', 'trending')}</h2>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={previous} disabled={visibleEvents.length < 2} aria-label={t('events', 'previousTrendingEvent')} className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-[#17131d] transition-transform active:scale-95 disabled:opacity-40 dark:border-white/15 dark:bg-white/10 dark:text-white"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={advance} disabled={visibleEvents.length < 2} aria-label={t('events', 'nextTrendingEvent')} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17131d] text-white transition-transform active:scale-95 disabled:opacity-40 dark:bg-white dark:text-[#17131d]"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative h-[min(26rem,72svh)] min-h-[21rem] touch-pan-y" aria-live="polite" aria-atomic="true">
        {nextEvent && <TrendingDeckCard key={nextEvent.id} event={nextEvent} index={1} active={false} onOpen={() => onEventClick(nextEvent)} onBook={() => onBookEvent(nextEvent)} onAdvance={advance} />}
        <AnimatePresence initial={false} mode="sync">
          <TrendingDeckCard key={currentEvent.id} event={currentEvent} index={0} active onOpen={() => onEventClick(currentEvent)} onBook={() => onBookEvent(currentEvent)} onAdvance={advance} />
        </AnimatePresence>
      </div>
      <div className="mt-5 flex items-center justify-center gap-1.5" role="group" aria-label={positionLabel}>
        {visibleEvents.slice(0, 7).map((event, index) => {
          const isActive = index === safeIndex;
          return <button key={event.id} type="button" onClick={() => setActiveIndex(index)} aria-label={t('events', 'showEvent').replace('{title}', event.title)} aria-current={isActive ? 'true' : undefined} className={'h-1.5 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none ' + (isActive ? 'w-7 bg-[#17131d] dark:bg-white' : 'w-1.5 bg-black/20 dark:bg-white/25')} />;
        })}
        {visibleEvents.length > 7 && <span className="ml-1 text-[10px] font-semibold tabular-nums text-black/45 dark:text-white/45">{safeIndex + 1}/{visibleEvents.length}</span>}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-black/45 dark:text-white/40">{t('events', 'swipeToDiscover')}</p>
    </section>
  );
}
