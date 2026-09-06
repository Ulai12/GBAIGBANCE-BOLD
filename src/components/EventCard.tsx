import { useState } from 'react';
import { MapPin, Star, Users, Heart, Calendar } from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';

function formatCardDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} – ${time}`;
}

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const [liked, setLiked] = useState(false);
  const rating = 4 + ((event.id.charCodeAt(0) || 0) % 9) / 10;

  return (
    <div
      onClick={onClick}
      className="card overflow-hidden cursor-pointer group transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover active:scale-[0.97] animate-slide-up"
    >
      <div className="relative h-36 overflow-hidden">
        <SmartImage
          src={event.cover_url}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10101c]/55 via-transparent to-transparent opacity-80" />
        <div className="absolute top-3 left-3 rating-badge text-[#1A1A2E]">
          <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
          {rating.toFixed(1)}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
          aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-3 right-3 w-8 h-8 rounded-full glass-surface flex items-center justify-center hover:scale-110 active:scale-90 transition-transform"
        >
          <Heart className={`w-3.5 h-3.5 transition-all ${liked ? 'fill-red-500 text-red-500 scale-110 animate-heartbeat' : 'text-gray-600'}`} />
        </button>
      </div>
      <div className="p-4">
        <h3 className="font-extrabold text-sm text-[#171726] line-clamp-1 group-hover:text-[#6600FF] transition-colors">{event.title}</h3>
        <div className="flex items-center gap-1.5 mt-2">
          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{formatCardDate(event.starts_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 truncate">{event.location_name || event.city}</span>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/[0.06]">
          <span className="text-sm font-bold text-[#6600FF] flex items-center">
            {event.price_min === 0 ? 'Gratuit' : `${event.price_min.toLocaleString('fr-FR')} FCFA`}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-gray-500">
            <Users className="w-3 h-3" />
            {event.attendees_count > 1000 ? `${(event.attendees_count/1000).toFixed(1)}K` : event.attendees_count}
          </span>
        </div>
      </div>
    </div>
  );
}
