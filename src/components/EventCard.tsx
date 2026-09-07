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

      {/* GRADIENT ASSOMBRISSANT RESTAURÉ POUR LA LISIBILITÉ DU TEXTE */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,14,.12)_0%,rgba(8,6,14,.04)_28%,rgba(8,6,14,.22)_48%,rgba(8,6,14,.96)_100%)]" />

      {/* SOFT GLOW */}
      <div className="pointer-events-none absolute -right-16 top-16 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-16 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 flex flex-col p-3 sm:p-4">
        
        {/* ───────────────── TOP (Date & Bouton) ───────────────── */}
        <div className="flex w-full items-start justify-between gap-2">
          
          {/* DATE PILL - Hauteur fixe h-9, padding optimisé pour le texte */}
          <div className="
            inline-flex h-9 min-w-0 max-w-[calc(100%-2.75rem)] 
            items-center gap-1.5 rounded-full 
            border border-white/15 bg-black/25 
            px-2.5 backdrop-blur-xl
          ">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-300" />
            <span className="truncate text-[11px] font-bold text-white sm:text-xs">
              {formatDate(event.starts_at)}
            </span>
          </div>

          {/* FAVORITE - Taille exacte équivalente (h-9 w-9) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
            onClick={(e) => {
              e.stopPropagation();
              setLiked((v) => !v);
            }}
            className="
              flex h-9 w-9 shrink-0 items-center justify-center 
              rounded-full border border-white/20 bg-black/20 
              backdrop-blur-xl transition-colors hover:bg-white/15
            "
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                liked ? 'scale-110 fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </motion.button>
        </div>

        {/* RATING - Hauteur réduite h-7 pour l'équilibre */}
        <div className="mt-2.5 inline-flex h-7 items-center gap-1 rounded-full border border-white/15 bg-black/20 px-2 backdrop-blur-xl self-start">
          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] font-black text-white">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* SPACER */}
        <div className="flex-1 min-h-4" />

        {/* ───────────────── BOTTOM ───────────────── */}
        <div className="flex w-full flex-col min-w-0">
          
          {/* LOCATION - Sécurisé contre les dépassements */}
          <div className="mb-1.5 flex min-w-0 items-center gap-1.5 text-white/70">
            <MapPin className="h-3 w-3 shrink-0 text-violet-300" />
            <span className="truncate text-[11px] font-medium sm:text-xs">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE - Limité à 2 lignes avec line-height serré */}
          <h3 className="line-clamp-2 text-xl sm:text-2xl font-black leading-[1.1] tracking-tight text-white">
            {event.title}
          </h3>

          {/* FOOTER (Prix & Participants) - Flex-wrap pour éviter la coupure du prix */}
          <div className="mt-2.5 flex flex-wrap items-end justify-between gap-2">
            
            {/* PRICE - Truncate retiré, shrink-0 pour forcer l'affichage */}
            <div className="shrink-0 max-w-[70%]">
              <p className="text-[1rem] sm:text-[1.15rem] font-black leading-none tracking-tight text-violet-300">
                {formattedPrice}
              </p>
            </div>

            {/* ATTENDEES - Badge condensé */}
            <div className="
              flex h-7 shrink-0 items-center gap-1.5 
              rounded-full border border-white/15 bg-white/10 
              px-2 backdrop-blur-xl
            ">
              <Users className="h-3 w-3 text-white/65" />
              <span className="text-[10px] font-bold text-white/85">
                {formatAttendees(event.attendees_count)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
