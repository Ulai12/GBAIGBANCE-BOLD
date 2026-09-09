import { AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Event } from '@/types';
import { TrendingDeckCard } from '@/components/TrendingDeckCard';

interface TrendingDeckProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBookEvent: (event: Event) => void;
}

export function TrendingDeck({ events, onEventClick, onBookEvent }: TrendingDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const visibleEvents = events.filter((event) => event.status === 'published' && new Date(event.ends_at || event.starts_at) > new Date());

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(visibleEvents.length - 1, 0)));
  }, [visibleEvents.length]);

  if (visibleEvents.length === 0) return null;

  const advance = () => setActiveIndex((current) => (current + 1) % visibleEvents.length);
  const previous = () => setActiveIndex((current) => (current - 1 + visibleEvents.length) % visibleEvents.length);

  return (
    <div className="w-full" tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'ArrowRight') advance();
      if (event.key === 'ArrowLeft') previous();
    }}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#8B5CF6]"><Sparkles className="h-3.5 w-3.5" /> À vivre maintenant</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d] dark:text-white">Les tendances</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={previous} aria-label="Événement tendance précédent" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-[#17131d] dark:text-white transition-transform hover:scale-105 active:scale-90"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={advance} aria-label="Événement tendance suivant" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17131d] dark:bg-white text-white dark:text-[#17131d] transition-transform hover:scale-105 active:scale-90"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative h-[26rem] touch-pan-y" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          {(() => {
            const stackEvents: { event: Event; stackIndex: number }[] = [];
            const maxVisible = Math.min(3, visibleEvents.length);
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
                  total={events.length}
                  active={isActive}
                  onOpen={() => onEventClick(currentEvent)}
                  onBook={() => onBookEvent(currentEvent)}
                  onAdvance={advance}
                />
              );
            });
          })()}
        </AnimatePresence>
      </div>
      <div className="mt-6 flex items-center justify-center gap-1.5" aria-label={`Événement ${activeIndex + 1} sur ${visibleEvents.length}`}>
        {visibleEvents.map((event, index) => (
          <button key={event.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Afficher ${event.title}`} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-8 bg-[#17131d] dark:bg-white' : 'w-1.5 bg-black/20 dark:bg-white/25'}`} />
        ))}
      </div>
      <p className="mt-2.5 text-center text-xs font-medium text-black/45 dark:text-white/40">Glisse pour découvrir · touche une carte pour ouvrir</p>
    </div>
  );
}
