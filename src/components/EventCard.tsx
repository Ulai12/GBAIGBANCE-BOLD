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
        overflow-hidden rounded-[1.5rem]
        bg-[#17131d] text-white cursor-pointer
        shadow-[0_12px_40px_rgba(23,19,29,0.2)]
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

      {/* GRADIENT ASSOMBRISSANT - Vital pour lire le lieu, le titre et le prix */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10" />

      {/* CONTENT LAYER - Paddings réduits */}
      <div className="absolute inset-0 flex flex-col p-3">
        
        {/* ───────────────── TOP (Date & Bouton adaptatifs) ───────────────── */}
        <div className="flex w-full items-start justify-between gap-2">
          
          {/* DATE PILL - Moins gourmand (h-8), fond transparent pour capter l'image */}
          <div className="
            inline-flex h-8 min-w-0 max-w-[calc(100%-2.5rem)] 
            items-center gap-1.5 rounded-full 
            border border-white/20 bg-white/10 
            px-2.5 backdrop-blur-md
          ">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-white/90" />
            <span className="truncate text-[11px] font-semibold text-white">
              {formatDate(event.starts_at)}
            </span>
          </div>

          {/* FAVORITE - Taille minimale (h-8 w-8) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            onClick={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            className="
              flex h-8 w-8 shrink-0 items-center justify-center 
              rounded-full border border-white/20 bg-white/10 
              backdrop-blur-md transition-colors hover:bg-white/20
            "
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                liked ? 'scale-110 fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </motion.button>
        </div>

        {/* RATING - Extrêmement compact (h-6) */}
        <div className="mt-2 inline-flex h-6 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 backdrop-blur-md self-start">
          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-bold text-white">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* SPACER */}
        <div className="flex-1 min-h-2" />

        {/* ───────────────── BOTTOM ───────────────── */}
        <div className="flex w-full flex-col min-w-0 gap-1.5">
          
          {/* LOCATION - Couleur distincte (Cyan) pour se détacher */}
          <div className="flex min-w-0 items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6600FF]-400" />
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/90">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE - Sécurisé à 2 lignes maximum */}
          <h3 className="line-clamp-2 text-lg sm:text-xl font-black leading-tight tracking-tight text-white">
            {event.title}
          </h3>

          {/* FOOTER - Flex-wrap pour sécuriser les grands prix/chiffres */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            
            {/* PRICE - Couleur d'accentuation forte (Emerald) */}
            <div className="shrink-0">
              <p className="text-[1.1rem] font-black leading-none tracking-tight text-[#6600FF]-400">
                {formattedPrice}
              </p>
            </div>

            {/* ATTENDEES */}
            <div className="
              flex h-6 shrink-0 items-center gap-1.5 
              rounded-full border border-white/10 bg-white/5 
              px-2 backdrop-blur-sm
            ">
              <Users className="h-3 w-3 text-white/70" />
              <span className="text-[10px] font-semibold text-white/90">
                {formatAttendees(event.attendees_count)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
