import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  CalendarDays,
  Flame,
  Heart,
  MapPin,
  Share2,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { isEventTerminated } from '@/services/events';
import { useFavorites } from '@/contexts/FavoritesContext';
import { shareEventNative } from '@/utils/share';
import { ShareModal } from '@/components/ShareModal';
import { prefetchEventDetail } from '@/utils/prefetchRoutes';

interface EventCardProps {
  event: Event;
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

export function EventCard({ event, onClick, onShare }: EventCardProps) {
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const prefersReducedMotion = useReducedMotion();
  const [showShareModal, setShowShareModal] = useState(false);

  const formattedPrice =
    event.price_min === 0
      ? 'Gratuit'
      : `${event.price_min.toLocaleString('fr-FR')} FCFA`;

  const terminated = isEventTerminated(event);
  const isCancelled = event.status === 'cancelled';
  const isPostponed = event.status === 'postponed';
  const isHot = (event.attendees_count || 0) >= 500 || (event.likes_count || 0) >= 200;

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
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
        whileHover={prefersReducedMotion ? undefined : { y: -6, scale: 1.012 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClick}
        onMouseEnter={prefetchEventDetail}
        onTouchStart={prefetchEventDetail}
        className="
          group relative isolate w-full
          aspect-[0.78] sm:aspect-[0.82] min-h-[full]
          overflow-hidden rounded-[1.5rem]
          bg-neutral-100 dark:bg-[#1E172E] text-white cursor-pointer
          shadow-[0_8px_30px_rgba(0,0,0,0.12)]
        "
        aria-label={`Découvrir ${event.title}`}
      >
        {/* IMAGE */}
        <motion.div
          className="absolute inset-0 bg-neutral-200 dark:bg-[#1E172E]"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <SmartImage
            src={event.cover_url || event.images?.[0]}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        </motion.div>

        {/* GRADIENT OVERLAY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

        {/* CONTENT LAYER */}
        <div className="absolute inset-0 flex flex-col justify-between p-3">
          
          {/* TOP LAYER */}
          <div className="flex flex-col gap-1.5">
            <div className="flex w-full items-start justify-between gap-2">
              {/* DATE PILL */}
              <div className="
                inline-flex h-7 min-w-0 max-w-[calc(100%-4.5rem)] 
                items-center gap-1.5 rounded-full 
                border border-white/20 bg-black/25 
                px-2 backdrop-blur-md
              ">
                <CalendarDays className="h-3 w-3 shrink-0 text-white/90" />
                <span className="truncate text-[10px] sm:text-[11px] font-semibold text-white">
                  {formatDate(event.starts_at)}
                </span>
              </div>

              {/* ACTION BUTTONS: SHARE + FAVORITE */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* SHARE */}
                <motion.button
                  type="button"
                  aria-label={`Partager ${event.title}`}
                  title="Partager"
                  whileTap={{ scale: 0.88 }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                  onClick={handleShare}
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center 
                    rounded-full border border-white/20 bg-black/35 
                    backdrop-blur-md transition-all hover:bg-white/25 active:scale-90 text-white shadow-xs
                  "
                >
                  <Share2 className="h-3.5 w-3.5" />
                </motion.button>

                {/* FAVORITE */}
                <motion.button
                  type="button"
                  aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                  whileTap={{ scale: 0.88 }}
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(event.id);
                  }}
                  className="
                    flex h-7 w-7 shrink-0 items-center justify-center 
                    rounded-full border border-white/20 bg-black/35 
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
            </div>

          {/* FUNCTIONAL HOT / STATUS BADGE */}
          {isCancelled ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-red-400/50 bg-red-600/40 px-2 backdrop-blur-md self-start text-[10px] font-bold text-red-100">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping mr-0.5" />
              Annulé
            </div>
          ) : isPostponed ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-600/40 px-2 backdrop-blur-md self-start text-[10px] font-bold text-amber-100">
              Reporté
            </div>
          ) : terminated ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-white/20 bg-black/50 px-2 backdrop-blur-md self-start text-[10px] font-semibold text-white/70">
              Terminé
            </div>
          ) : isHot ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-orange-400/60 bg-gradient-to-r from-orange-500/40 to-red-500/40 px-2 backdrop-blur-md self-start text-[10px] font-black text-orange-200 shadow-xs">
              <Flame className="h-3 w-3 text-orange-300 fill-orange-400 animate-bounce" />
              HOT
            </div>
          ) : event.is_featured ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-[#8B5CF6]/50 bg-[#6600FF]/40 px-2 backdrop-blur-md self-start text-[10px] font-bold text-purple-100">
              <Sparkles className="h-2.5 w-2.5 text-yellow-300" />
              Tendance
            </div>
          ) : event.price_min === 0 ? (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-600/40 px-2 backdrop-blur-md self-start text-[10px] font-bold text-emerald-100">
              Gratuit
            </div>
          ) : (
            <div className="inline-flex h-5 items-center gap-1 rounded-full border border-white/20 bg-black/25 px-2 backdrop-blur-md self-start text-[10px] font-semibold text-white/90">
              <Zap className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
              Populaire
            </div>
          )}
        </div>

        {/* BOTTOM LAYER */}
        <div className="flex w-full flex-col min-w-0 gap-1 mt-auto">
          
          {/* LOCATION */}
          <div className="flex min-w-0 items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#a78dfa]"/>
            <span className="truncate text-[11px] font-medium leading-tight text-white/90">
              {event.location_name || event.city || 'Lieu à confirmer'}
            </span>
          </div>

          {/* TITLE */}
          <h3 className="line-clamp-2 text-base sm:text-lg font-black leading-snug tracking-tight text-white">
            {event.title}
          </h3>

          {/* FOOTER */}
          <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
            {/* PRICE */}
            <div className="min-w-0 shrink">
              <p className="truncate text-[1rem] font-black leading-none tracking-tight text-[#a78dfa]">
                {formattedPrice}
              </p>
            </div>

            {/* ATTENDEES */}
            <div className="
              flex h-6 shrink-0 items-center gap-1 
              rounded-full border border-white/10 bg-white/10 
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
