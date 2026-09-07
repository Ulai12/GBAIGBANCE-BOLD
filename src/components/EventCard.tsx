import { useState } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion } from 'motion/react';
import { MapPin, Star, Users, Heart, Calendar, ArrowUpRight } from 'lucide-react';
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
  const prefersReducedMotion = useReducedMotion();

  // Micro-interaction de survol : légère rotation 3D + translation
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-4, 4]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 800 }}
      className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-500 hover:shadow-[0_25px_50px_-12px_rgba(102,0,255,0.25)] active:scale-[0.98]"
      whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Image de couverture */}
      <div className="relative h-44 overflow-hidden">
        <SmartImage
          src={event.cover_url}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        {/* Dégradé sombre en bas pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1025]/90 via-transparent to-transparent opacity-90" />

        {/* Badge note */}
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full border border-white/40 bg-white/20 px-3 py-1.5 text-[#fff] backdrop-blur-xl">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold">{rating.toFixed(1)}</span>
        </div>

        {/* Bouton favori */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-xl transition-all hover:scale-110 hover:bg-white/30 active:scale-90"
        >
          <Heart
            className={`h-4 w-4 transition-all duration-300 ${
              liked ? 'fill-red-500 text-red-500 scale-110 animate-heartbeat' : 'text-white'
            }`}
          />
        </button>
      </div>

      {/* Contenu */}
      <div className="p-4" style={{ transform: 'translateZ(20px)' }}>
        <h3 className="font-extrabold text-base text-[#17131d] line-clamp-1 transition-colors group-hover:text-[#6600FF]">
          {event.title}
        </h3>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{formatCardDate(event.starts_at)}</span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="truncate">{event.location_name || event.city}</span>
        </div>

        {/* Ligne de bas de carte */}
        <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3">
          <span className="text-base font-black text-[#6600FF]">
            {event.price_min === 0 ? 'Gratuit' : `${event.price_min.toLocaleString('fr-FR')} FCFA`}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
            <Users className="h-3.5 w-3.5" />
            {event.attendees_count > 1000
              ? `${(event.attendees_count / 1000).toFixed(1)}K`
              : event.attendees_count}
          </span>
        </div>
      </div>

      {/* Icône flottante "voir" */}
      <div className="pointer-events-none absolute bottom-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/30 bg-white/10 opacity-0 backdrop-blur-xl transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-[-4px]">
        <ArrowUpRight className="h-4 w-4 text-white" />
      </div>
    </motion.div>
  );
}