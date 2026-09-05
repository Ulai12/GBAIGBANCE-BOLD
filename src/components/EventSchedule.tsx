import { useState, useEffect } from 'react';
import { Clock, MapPin, Music2, Calendar } from 'lucide-react';
import { fetchEventSchedule } from '@/services/events';
import type { Event, EventScheduleSlot, Artist } from '@/types';

interface EventScheduleProps {
  event: Event;
  onArtistClick?: (artist: Artist) => void;
  isDark?: boolean;
}

export function EventSchedule({ event, onArtistClick, isDark }: EventScheduleProps) {
  const [slots, setSlots] = useState<(EventScheduleSlot & { artist?: Artist })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<string | null>(null);

  useEffect(() => {
    fetchEventSchedule(event.id)
      .then((data) => {
        setSlots(data);
        if (data.length > 0) setActiveDay(data[0].day_label);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  if (loading) return null;
  if (slots.length === 0) return null;

  const days = [...new Set(slots.map((s) => s.day_label))];
  const daySlots = slots.filter((s) => s.day_label === activeDay);
  const isMultiDay = days.length > 1;

  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(237,232,255,0.5)';
  const textMain = isDark ? 'text-white' : 'text-[#1A1A2E]';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';

  return (
    <div>
      <h2 className={`flex items-center gap-2 text-lg font-extrabold mb-3 ${textMain}`}>
        <Calendar className="w-5 h-5 text-[#6600FF]" />
        Programme{isMultiDay ? ` (${days.length} jours)` : ''}
      </h2>

      {isMultiDay && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeDay === day ? 'bg-[#6600FF] text-white shadow-purple scale-105' : isDark ? 'bg-white/10 text-white/60' : 'bg-[#EDE8FF] text-gray-600'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[#6600FF]/15" />
        <div className="space-y-3 animate-stagger">
          {daySlots.map((slot) => {
            const time = new Date(slot.start_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const endTime = slot.end_time ? new Date(slot.end_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : null;
            return (
              <div key={slot.id} className="relative pl-12">
                <div className="absolute left-3 top-3 w-3 h-3 rounded-full bg-[#6600FF] ring-4 ring-[#6600FF]/10" />
                <div
                  className={`p-4 rounded-2xl transition-all ${slot.artist ? 'border-l-4 border-l-[#6600FF]' : ''}`}
                  style={{ background: cardBg, border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(200,190,255,0.3)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-sm font-bold text-[#6600FF]">
                      <Clock className="w-3.5 h-3.5" />
                      {time}{endTime && ` – ${endTime}`}
                    </span>
                    <span className={`flex items-center gap-1 text-xs ${textMuted}`}>
                      <MapPin className="w-3 h-3" />
                      {slot.stage_name}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold ${textMain}`}>{slot.title}</p>
                  {slot.artist && (
                    <button
                      onClick={() => onArtistClick?.(slot.artist!)}
                      className="flex items-center gap-2 mt-2 group"
                    >
                      <img
                        src={slot.artist.photo_url || `https://i.pravatar.cc/100?u=${slot.artist.id}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="text-left">
                        <span className={`flex items-center gap-1 text-sm font-semibold ${textMain} group-hover:text-[#6600FF] transition-colors`}>
                          <Music2 className="w-3.5 h-3.5 text-[#6600FF]" />
                          {slot.artist.name}
                        </span>
                        {slot.artist.genres && slot.artist.genres.length > 0 && <span className={`text-xs ${textMuted}`}>{slot.artist.genres.join(', ')}</span>}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
