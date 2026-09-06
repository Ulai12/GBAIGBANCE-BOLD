import { AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { Event } from '@/types';
import { TrendingDeckCard } from '@/components/TrendingDeckCard';

interface TrendingDeckProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onBookEvent: (event: Event) => void;
}

export function TrendingDeck({ events, onEventClick, onBookEvent }: TrendingDeckProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (events.length === 0) return null;

  const advance = () => setActiveIndex((current) => (current + 1) % events.length);
  const previous = () => setActiveIndex((current) => (current - 1 + events.length) % events.length);

  return (
    <section className="mt-8" aria-label="Événements tendance" tabIndex={0} onKeyDown={(event) => {
      if (event.key === 'ArrowRight') advance();
      if (event.key === 'ArrowLeft') previous();
    }}>
      <div className="mb-4 flex items-end justify-between px-5">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#8B5CF6]"><Sparkles className="h-3.5 w-3.5" /> À vivre maintenant</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#17131d]">Les tendances</h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={previous} aria-label="Événement tendance précédent" className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#17131d] transition-transform hover:scale-105 active:scale-90"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={advance} aria-label="Événement tendance suivant" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17131d] text-white transition-transform hover:scale-105 active:scale-90"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="relative mx-5 h-[26rem] touch-pan-y" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          {events.slice(0, 3).map((event, stackIndex) => {
            const eventIndex = (activeIndex + stackIndex) % events.length;
            const isActive = stackIndex === 0;
            return (
              <TrendingDeckCard
                key={event.id}
                event={events[eventIndex]}
                index={stackIndex}
                total={events.length}
                active={isActive}
                onOpen={() => onEventClick(events[eventIndex])}
                onBook={() => onBookEvent(events[eventIndex])}
                onAdvance={advance}
              />
            );
          })}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5" aria-label={`Événement ${activeIndex + 1} sur ${events.length}`}>
        {events.map((event, index) => (
          <button key={event.id} type="button" onClick={() => setActiveIndex(index)} aria-label={`Afficher ${event.title}`} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? 'w-8 bg-[#17131d]' : 'w-1.5 bg-black/20'}`} />
        ))}
      </div>
      <p className="mt-3 text-center text-xs font-medium text-black/45">Glisse pour découvrir · touche une carte pour ouvrir</p>
    </section>
  );
}
