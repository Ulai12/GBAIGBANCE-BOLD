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
      <div className="absolute inset-0 flex flex-col p-2.5 max-[360px]:p-2 sm:p-5">

        {/* ───────────────── TOP ───────────────── */}
        <div className="flex items-center justify-between gap-2 max-[360px]:gap-1.5">

          {/* DATE */}
          <div
            className="
              inline-flex
              min-w-0
              max-w-[calc(100%-3.5rem)]
              items-center
              gap-1.5
              rounded-full
              border
              border-white/15
              bg-black/25
              px-2.5
              py-1.5
              backdrop-blur-xl
              max-[360px]:max-w-[calc(100%-3rem)]
              max-[360px]:px-2
              max-[360px]:py-1
            "
          >
            <CalendarDays className="h-3 w-3 shrink-0 text-violet-300 max-[360px]:h-2.5 max-[360px]:w-2.5" />

            <span className="truncate text-[10px] font-bold text-white max-[360px]:text-[9px]">
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
              h-9
              w-9
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
              max-[360px]:h-8
              max-[360px]:w-8
              sm:h-10
              sm:w-10
            "
          >
            <Heart
              className={`
                h-4
                w-4
                transition-all
                duration-300
                max-[360px]:h-3.5
                max-[360px]:w-3.5
                sm:h-[17px]
                sm:w-[17px]
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
        <div className="mt-2 self-start max-[360px]:mt-1.5">
          <div
            className="
              inline-flex
              items-center
              gap-1
              rounded-full
              border
              border-white/15
              bg-black/20
              px-2
              py-1
              backdrop-blur-xl
              max-[360px]:px-1.5
              max-[360px]:py-0.5
            "
          >
            <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400 max-[360px]:h-2 max-[360px]:w-2" />

            <span className="text-[9px] font-black max-[360px]:text-[8px]">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>

        {/* SPACER */}
        <div className="flex-1 min-h-4 max-[360px]:min-h-2" />

        {/* ───────────────── BOTTOM ───────────────── */}
        <div className="min-w-0">

          {/* LOCATION */}
          <div className="mb-1.5 flex min-w-0 items-center gap-1 max-[360px]:mb-1 max-[360px]:gap-0.5">
            <MapPin className="h-3 w-3 shrink-0 text-violet-300 max-[360px]:h-2.5 max-[360px]:w-2.5" />

            <span className="truncate text-[11px] font-medium text-white/70 max-[360px]:text-[10px]">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE */}
          <h3
            className="
              max-w-full
              line-clamp-2
              text-[1.3rem]
              font-black
              leading-[0.9]
              tracking-[-0.04em]
              text-white
              max-[360px]:text-[1.15rem]
              sm:text-[1.8rem]
            "
          >
            {event.title}
          </h3>

          {/* FOOTER */}
          <div className="mt-2.5 flex items-end justify-between gap-2 max-[360px]:mt-2 max-[360px]:gap-1.5">

            {/* PRICE */}
            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-[0.95rem]
                  font-black
                  leading-none
                  tracking-[-0.02em]
                  text-violet-300
                  max-[360px]:text-[0.85rem]
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
                gap-1
                rounded-full
                border
                border-white/15
                bg-white/10
                px-2
                py-1
                backdrop-blur-xl
                max-[360px]:px-1.5
                max-[360px]:py-0.5
                sm:px-3
                sm:py-2
              "
            >
              <Users className="h-3 w-3 text-white/65 max-[360px]:h-2.5 max-[360px]:w-2.5" />

              <span className="text-[10px] font-bold text-white/85 max-[360px]:text-[9px]">
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