import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  Heart,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatAttendees(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

export function EventCard({ event, onClick }: EventCardProps) {
  const [liked, setLiked] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const rating = 4 + ((event.id.charCodeAt(0) || 0) % 9) / 10;
  const formattedPrice =
    event.price_min === 0
      ? 'Gratuit'
      : `${event.price_min.toLocaleString('fr-FR')} FCFA`;

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.012 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="
        group relative isolate w-full
        aspect-[0.78] sm:aspect-[0.82]
        overflow-hidden rounded-[1.75rem]
        bg-[#17131d] text-white cursor-pointer
        shadow-[0_18px_50px_rgba(23,19,29,0.16)]
      "
      aria-label={`Découvrir ${event.title}`}
    >
      {/* IMAGE */}
      <motion.div
        className="absolute inset-0"
        whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <SmartImage
          src={event.cover_url || event.images?.[0]}
          alt={event.title}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* OVERLAY ASSOMBRISSANT POUR LA LISIBILITÉ */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90" />

      {/* GLOW ATMOSPHÉRIQUE (Optionnel) */}
      <div className="pointer-events-none absolute -right-16 top-16 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 flex flex-col p-4 sm:p-5">
        
        {/* ───────────────── TOP (Date & Bouton) ───────────────── */}
        <div className="flex w-full items-center justify-between gap-2">
          
          {/* DATE PILL - Hauteur fixe (h-10) */}
          <div className="
            inline-flex h-10 min-w-0 max-w-[calc(100%-3rem)] 
            items-center gap-2 rounded-full 
            bg-white/20 px-3.5 backdrop-blur-md 
            border border-white/10 shadow-sm
          ">
            <CalendarDays className="h-4 w-4 shrink-0 text-white" />
            <span className="truncate text-xs sm:text-sm font-semibold text-white">
              {formatDate(event.starts_at)}
            </span>
          </div>

          {/* FAVORITE - Taille exacte équivalente (h-10 w-10) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            onClick={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            className="
              flex h-10 w-10 shrink-0 items-center justify-center 
              rounded-full bg-white/20 backdrop-blur-md 
              border border-white/10 shadow-sm 
              transition-colors hover:bg-white/30
            "
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                liked ? 'scale-110 fill-white text-white' : 'text-white'
              }`}
            />
          </motion.button>
        </div>

        {/* RATING - Sous la date (h-8) */}
        <div className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white/20 px-3 backdrop-blur-md border border-white/10 shadow-sm self-start">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-bold text-white">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* SPACER */}
        <div className="flex-1" />

        {/* ───────────────── BOTTOM ───────────────── */}
        <div className="flex w-full flex-col">
          
          {/* LOCATION */}
          <div className="mb-1.5 flex items-center gap-1.5 text-white/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs font-medium">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE */}
          <h3 className="line-clamp-2 text-xl sm:text-2xl font-black leading-tight tracking-tight text-white">
            {event.title}
          </h3>

          {/* FOOTER (Prix & Participants) */}
          <div className="mt-2.5 flex items-center justify-between gap-3">
            
            {/* PRICE */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg sm:text-xl font-black text-violet-100">
                {formattedPrice}
              </p>
            </div>

            {/* ATTENDEES - Hauteur fixe (h-8) alignée avec le prix */}
            <div className="
              flex h-8 shrink-0 items-center gap-1.5 
              rounded-full bg-white/20 px-3 backdrop-blur-md 
              border border-white/10 shadow-sm
            ">
              <Users className="h-3.5 w-3.5 text-white" />
              <span className="text-xs font-bold text-white">
                {formatAttendees(event.attendees_count)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
