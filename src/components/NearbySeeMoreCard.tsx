import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  MapPin,
  Share2,
  Users,
  Navigation,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { shareEventNative } from '@/utils/share';
import { ShareModal } from '@/components/ShareModal';
import { prefetchEventDetail } from '@/utils/prefetchRoutes';
import { formatDistance, getAccurateTravelEstimate } from '@/utils/geo';
import { OptimisticHeartButton } from '@/components/OptimisticHeartButton';

interface NearbySeeMoreCardProps {
  event: Event & { distanceKm?: number };
  onClick?: () => void;
  onShare?: (event: Event) => void;
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

export function NearbySeeMoreCard({ event, onClick, onShare }: NearbySeeMoreCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [showShareModal, setShowShareModal] = useState(false);

  const formattedPrice =
    event.price_min === 0
      ? 'Gratuit'
      : `${event.price_min.toLocaleString('fr-FR')} FCFA`;

  const hasDistance = typeof event.distanceKm === 'number';
  const travel = hasDistance ? getAccurateTravelEstimate(event.distanceKm) : null;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(event);
      return;
    }
    const status = await shareEventNative(event);
    if (status !== 'shared' && status !== 'cancelled') {
      setShowShareModal(true);
    }
  };

  return (
    <>
      <motion.article
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClick}
        onMouseEnter={prefetchEventDetail}
        onTouchStart={prefetchEventDetail}
        className="
          group relative isolate w-full
          aspect-[0.72] sm:aspect-[0.75] min-h-full
          overflow-hidden rounded-[1.5rem]
          bg-neutral-100 dark:bg-[#1E172E] text-white cursor-pointer
          shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        "
        aria-label={`Événement à proximité : ${event.title}`}
      >
        {/* COVER IMAGE */}
        <motion.div
          className="absolute inset-0 bg-neutral-200 dark:bg-[#1E172E]"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <SmartImage
            src={event.cover_url || event.images?.[0]}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </motion.div>

        {/* REFINED GRADIENT: Subtle top shadow, deep bottom protection for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/25 pointer-events-none" />

        {/* CONTENT STRUCTURE */}
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          
          {/* TOP HEADER: Clean date & actions, keeping image clear */}
          <div className="flex w-full items-center justify-between gap-2">
            {/* DATE BADGE */}
            <div className="
              inline-flex h-7 min-w-0 max-w-[calc(100%-4.5rem)]
              items-center gap-1.5 rounded-full
              border border-white/20 bg-black/35
              px-2.5 backdrop-blur-md shadow-xs
            ">
              <CalendarDays className="h-3 w-3 shrink-0 text-white/90" />
              <span className="truncate text-[10px] sm:text-[11px] font-semibold text-white">
                {formatDate(event.starts_at)}
              </span>
            </div>

            {/* ACTION BUTTONS (Share & Favorite) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                type="button"
                aria-label={`Partager ${event.title}`}
                whileTap={{ scale: 0.88 }}
                onClick={handleShare}
                className="
                  flex h-7 w-7 shrink-0 items-center justify-center
                  rounded-full border border-white/20 bg-black/40
                  backdrop-blur-md transition-all hover:bg-white/25 active:scale-90 text-white shadow-xs
                "
              >
                <Share2 className="h-3.5 w-3.5" />
              </motion.button>

              <OptimisticHeartButton
                eventId={event.id}
                size="sm"
                variant="card"
              />
            </div>
          </div>

          {/* BOTTOM INFORMATION ZONE */}
          <div className="flex w-full flex-col min-w-0 gap-1.5 mt-auto">
            {/* DISTANCE & TRAVEL BADGE: Distinct, clean pill above location */}
            {hasDistance && (
              <div className="inline-flex h-5 items-center gap-1.5 rounded-full border border-cyan-400/40 bg-black/60 px-2 py-0.5 text-[10.5px] font-bold text-cyan-300 backdrop-blur-md self-start shadow-xs">
                <Navigation className="h-2.5 w-2.5 shrink-0 text-cyan-400" />
                <span className="tracking-tight">{formatDistance(event.distanceKm!)}</span>
                {travel && (
                  <>
                    <span className="text-white/40 text-[9px]">·</span>
                    <span className="text-white/90 font-medium">
                      ~{travel.minutes} min
                    </span>
                  </>
                )}
              </div>
            )}

            {/* LOCATION */}
            <div className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#a78dfa]" />
              <span className="truncate text-[11px] font-medium leading-tight text-white/90">
                {event.location_name || event.city || 'Lieu à confirmer'}
              </span>
            </div>

            {/* TITLE */}
            <h3 className="line-clamp-2 text-base sm:text-lg font-black leading-snug tracking-tight text-white drop-shadow-xs">
              {event.title}
            </h3>

            {/* FOOTER: Price & Attendees */}
            <div className="mt-0.5 flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0 shrink">
                <p className={`truncate text-[1rem] font-black leading-none tracking-tight ${
                  event.price_min === 0 ? 'text-emerald-400' : 'text-[#a78dfa]'
                }`}>
                  {formattedPrice}
                </p>
              </div>

              <div className="
                flex h-6 shrink-0 items-center gap-1
                rounded-full border border-white/15 bg-white/10
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

      <ShareModal
        isOpen={showShareModal}
        event={event}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}
