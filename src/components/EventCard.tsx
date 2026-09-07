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
function formatCardDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
function formatAttendees(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}
export function EventCard({ event, onClick }: EventCardProps) {
  const [liked, setLiked] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const rating =
    4 + ((event.id.charCodeAt(0) || 0) % 9) / 10;
  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -7,
              scale: 1.015,
            }
      }
      transition={{
        duration: prefersReducedMotion ? 0 : 0.45,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className="
        group
        relative
        overflow-hidden
        rounded-[1.75rem]
        bg-[#17131d]
        text-white
        shadow-[0_18px_50px_rgba(23,19,29,0.16)]
        cursor-pointer
        isolate
      "
      aria-label={`Découvrir ${event.title}`}
    >
      <div className="relative aspect-[0.82] overflow-hidden">
        {/* IMAGE */}
        <motion.div
          className="absolute inset-0"
          whileHover={
            prefersReducedMotion
              ? undefined
              : { scale: 1.07 }
          }
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <SmartImage
            src={event.cover_url || event.images?.[0]}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </motion.div>
        {/* CINEMATIC GRADIENT */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,12,.06)_0%,rgba(7,5,12,.12)_30%,rgba(7,5,12,.32)_52%,rgba(7,5,12,.96)_100%)]" />
        {/* ATMOSPHERIC GLOW */}
        <div className="absolute -right-16 top-20 h-40 w-40 rounded-full bg-[#7c3aed]/20 blur-3xl" />
        <div className="absolute -left-20 bottom-20 h-40 w-40 rounded-full bg-[#a855f7]/10 blur-3xl" />
        {/* TOP CONTROLS */}
        <div className="absolute inset-x-4 top-4 flex items-center justify-between">
          {/* RATING */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 backdrop-blur-xl">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[11px] font-black tracking-wide text-white">
              {rating.toFixed(1)}
            </span>
          </div>
          {/* FAVORITE */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            whileHover={
              prefersReducedMotion
                ? undefined
                : { scale: 1.08 }
            }
            onClick={(e) => {
              e.stopPropagation();
              setLiked((value) => !value);
            }}
            aria-label={
              liked
                ? 'Retirer des favoris'
                : 'Ajouter aux favoris'
            }
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-full
              border border-white/20
              bg-black/20
              backdrop-blur-xl
              transition-colors
              hover:bg-white/15
            "
          >
            <Heart
              className={`
                h-4 w-4
                transition-all duration-300
                ${
                  liked
                    ? 'scale-110 fill-red-500 text-red-500'
                    : 'text-white'
                }
              `}
            />
          </motion.button>
        </div>
        {/* CONTENT */}
        <div className="absolute inset-x-4 bottom-4">
          {/* DATE + CITY */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className="
                rounded-full
                border border-white/10
                bg-white/10
                px-2.5 py-1
                text-[10px]
                font-bold
                text-white/90
                backdrop-blur-xl
              "
            >
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-violet-300" />
                {formatCardDate(event.starts_at)}
              </span>
            </span>
            <span
              className="
                flex items-center gap-1
                text-[10px]
                font-semibold
                text-white/65
              "
            >
              <MapPin className="h-3 w-3 text-violet-300" />
              {event.city}
            </span>
          </div>
          {/* TITLE */}
          <h3
            className="
              max-w-[90%]
              text-[1.55rem]
              font-black
              leading-[0.98]
              tracking-[-0.045em]
              text-white
              line-clamp-2
            "
          >
            {event.title}
          </h3>
          {/* BOTTOM INFORMATION */}
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-[11px] font-medium text-white/55">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {event.location_name || 'Lieu à confirmer'}
              </p>
              <p className="mt-1 text-sm font-black text-violet-300">
                {event.price_min === 0
                  ? 'Entrée libre'
                  : `Dès ${event.price_min.toLocaleString('fr-FR')} FCFA`}
              </p>
            </div>
            {/* ATTENDEES */}
            <div
              className="
                flex shrink-0
                items-center gap-1.5
                rounded-full
                border border-white/10
                bg-white/10
                px-2.5 py-1.5
                backdrop-blur-xl
              "
            >
              <Users className="h-3 w-3 text-white/60" />
              <span className="text-[10px] font-bold text-white/80">
                {formatAttendees(event.attendees_count)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* SUBTLE BOTTOM GLOW */}
      <div
        className="
          pointer-events-none
          absolute
          inset-x-0
          bottom-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-violet-400/60
          to-transparent
          opacity-0
          transition-opacity
          duration-500
          group-hover:opacity-100
        "
      />
    </motion.article>
  );
}