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
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }

  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }

  return count.toString();
}

export function EventCard({ event, onClick }: EventCardProps) {
  const [liked, setLiked] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const rating =
    4 + ((event.id.charCodeAt(0) || 0) % 9) / 10;

  const formattedPrice =
    event.price_min === 0
      ? 'Gratuit'
      : `${event.price_min.toLocaleString('fr-FR')} FCFA`;

  return (
    <motion.article
      initial={
        prefersReducedMotion
          ? false
          : { opacity: 0, y: 20, scale: 0.98 }
      }
      animate={
        prefersReducedMotion
          ? undefined
          : { opacity: 1, y: 0, scale: 1 }
      }
      whileHover={
        prefersReducedMotion
          ? undefined
          : {
              y: -6,
              scale: 1.012,
            }
      }
      transition={{
        duration: prefersReducedMotion ? 0 : 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className="
        group
        relative
        isolate
        w-full
        aspect-[0.78]
        sm:aspect-[0.82]
        overflow-hidden
        rounded-[1.75rem]
        bg-[#17131d]
        text-white
        cursor-pointer
        shadow-[0_18px_50px_rgba(23,19,29,0.16)]
      "
      aria-label={`Découvrir ${event.title}`}
    >
      {/* IMAGE */}
      <motion.div
        className="absolute inset-0"
        whileHover={
          prefersReducedMotion
            ? undefined
            : { scale: 1.06 }
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

      {/* ATMOSPHERIC OVERLAY */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,14,.12)_0%,rgba(8,6,14,.04)_28%,rgba(8,6,14,.22)_48%,rgba(8,6,14,.96)_100%)]" />

      {/* SOFT GLOW */}
      <div className="pointer-events-none absolute -right-16 top-16 h-36 w-36 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-16 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl" />

      {/* CONTENT LAYER */}
      <div className="absolute inset-0 flex flex-col p-3 sm:p-5">

        {/* ───────────────── TOP ───────────────── */}
        <div className="flex items-start justify-between gap-3">

          {/* DATE */}
          <div
            className="
              inline-flex
              min-w-0
              max-w-[calc(100%-3.5rem)]
              items-center
              gap-2
              rounded-full
              border
              border-white/15
              bg-black/25
              px-3
              py-2
              backdrop-blur-xl
            "
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-violet-300" />

            <span className="truncate text-[11px] font-bold text-white">
              {formatDate(event.starts_at)}
            </span>
          </div>

          {/* FAVORITE */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.88 }}
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
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-full
              border
              border-white/20
              bg-black/20
              backdrop-blur-xl
              transition-colors
              hover:bg-white/15
            "
          >
            <Heart
              className={`
                h-[17px]
                w-[17px]
                transition-all
                duration-300
                ${
                  liked
                    ? 'scale-110 fill-red-500 text-red-500'
                    : 'text-white'
                }
              `}
            />
          </motion.button>
        </div>

        {/* RATING */}
        <div className="mt-3 self-start">
          <div
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              border-white/15
              bg-black/20
              px-2.5
              py-1.5
              backdrop-blur-xl
            "
          >
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />

            <span className="text-[10px] font-black">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* SPACER */}
        <div className="flex-1 min-h-6" />

        {/* ───────────────── BOTTOM ───────────────── */}
        <div className="min-w-0">

          {/* LOCATION */}
          <div className="mb-2 flex min-w-0 items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-300" />

            <span className="truncate text-xs font-medium text-white/70">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE */}
          <h3
            className="
              max-w-full
              line-clamp-2
              text-[1.4rem]
              font-black
              leading-[0.95]
              tracking-[-0.045em]
              text-white
              sm:text-[1.8rem]
            "
          >
            {event.title}
          </h3>

          {/* FOOTER */}
          <div className="mt-3 flex items-end justify-between gap-2 sm:mt-4 sm:gap-3">

            {/* PRICE */}
            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-[1rem]
                  font-black
                  leading-none
                  tracking-[-0.02em]
                  text-violet-300
                  sm:text-[1.05rem]
                "
              >
                {formattedPrice}
              </p>
            </div>

            {/* ATTENDEES */}
            <div
              className="
                flex
                shrink-0
                items-center
                gap-1.5
                rounded-full
                border
                border-white/15
                bg-white/10
                px-2.5
                py-1.5
                backdrop-blur-xl
                sm:px-3
                sm:py-2
              "
            >
              <Users className="h-3.5 w-3.5 text-white/65" />

              <span className="text-[11px] font-bold text-white/85">
                {formatAttendees(event.attendees_count)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM EDGE */}
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