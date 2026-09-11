import { motion, useReducedMotion } from 'motion/react';
import {
  Navigation,
  Calendar,
  Heart,
  MapPin,
  ArrowUpRight,
  Footprints,
  Car,
} from 'lucide-react';
import type { Event } from '@/types';
import { SmartImage } from '@/components/SmartImage';
import { formatDistanceKm } from '@/utils/geo';
import { useFavorites } from '@/contexts/FavoritesContext';
import { prefetchEventDetail } from '@/utils/prefetchRoutes';

interface NearbyEventTileProps {
  event: Event & { distanceKm?: number };
  isActualLocation?: boolean;
  onClick?: () => void;
  onBook?: () => void;
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateString));
}

function getTravelEstimate(distanceKm?: number): { label: string; isWalk: boolean } | null {
  if (distanceKm === undefined || isNaN(distanceKm)) return null;
  if (distanceKm > 50) return null; // Too far for walk/short drive estimate
  if (distanceKm <= 1.5) {
    const mins = Math.max(3, Math.round(distanceKm * 12));
    return { label: `~${mins} min à pied`, isWalk: true };
  }
  const mins = Math.max(4, Math.round(distanceKm * 3));
  return { label: `~${mins} min en voiture`, isWalk: false };
}

export function NearbyEventTile({ event, isActualLocation = false, onClick, onBook }: NearbyEventTileProps) {
  const { isLiked, toggleLike } = useFavorites();
  const liked = isLiked(event.id);
  const prefersReducedMotion = useReducedMotion();

  const formattedPrice =
    event.price_min === 0
      ? 'Gratuit'
      : `${event.price_min.toLocaleString('fr-FR')} F`;

  const travel = isActualLocation ? getTravelEstimate(event.distanceKm) : null;
  const showRealDistance = isActualLocation && typeof event.distanceKm === 'number' && event.distanceKm < 50;

  return (
    <motion.article
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.015 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      onMouseEnter={prefetchEventDetail}
      onTouchStart={prefetchEventDetail}
      className="
        group relative w-[235px] sm:w-[255px] shrink-0 snap-start
        rounded-[1.6rem] p-2.5
        bg-white/90 dark:bg-[#1A1829]/90 backdrop-blur-xl
        border border-black/[0.06] dark:border-white/[0.08]
        shadow-xs hover:shadow-md
        cursor-pointer select-none transition-all flex flex-col justify-between
      "
    >
      {/* Visual Cover Header - Compact & Enclosed */}
      <div className="relative h-32 w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5">
        <SmartImage
          src={event.cover_url || event.images?.[0]}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Top Floating Controls */}
        <div className="absolute inset-x-2.5 top-2.5 flex items-center justify-between">
          {/* Badge: Real Distance if GPS active, or City if default */}
          {showRealDistance ? (
            <div className="
              inline-flex items-center gap-1 rounded-full
              bg-black/55 border border-white/20 px-2 py-0.5
              backdrop-blur-md text-white text-[10px] font-bold shadow-xs
            ">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <Navigation className="w-2.5 h-2.5 text-emerald-300" />
              <span>{formatDistanceKm(event.distanceKm)}</span>
            </div>
          ) : (
            <div className="
              inline-flex items-center gap-1 rounded-full
              bg-black/55 border border-white/20 px-2 py-0.5
              backdrop-blur-md text-white text-[10px] font-semibold shadow-xs
            ">
              <MapPin className="w-2.5 h-2.5 text-blue-300" />
              <span className="truncate max-w-[110px]">{event.city || 'Lomé'}</span>
            </div>
          )}

          {/* Like Heart Button */}
          <motion.button
            type="button"
            aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            whileTap={{ scale: 0.85 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(event.id);
            }}
            className="
              h-7 w-7 rounded-full bg-black/45 border border-white/20
              backdrop-blur-md flex items-center justify-center
              text-white transition-colors hover:bg-black/65
            "
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform ${
                liked ? 'scale-110 fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </motion.button>
        </div>

        {/* Bottom Tag inside Image: Travel estimate or Category */}
        <div className="absolute inset-x-2.5 bottom-2 flex items-center justify-between text-[10px] font-semibold text-white/95">
          {travel ? (
            <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/15">
              {travel.isWalk ? <Footprints className="w-2.5 h-2.5 text-cyan-300" /> : <Car className="w-2.5 h-2.5 text-cyan-300" />}
              <span>{travel.label}</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/10">
              {event.category || 'Sortie'}
            </span>
          )}

          {travel && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#6600FF]/80 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider">
              {event.category || 'Sortie'}
            </span>
          )}
        </div>
      </div>

      {/* Card Content Details */}
      <div className="pt-2 px-1 flex flex-col justify-between">
        <div>
          {/* Date */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#6600FF] dark:text-[#A78BFA]">
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">{formatDate(event.starts_at)}</span>
          </div>

          {/* Title */}
          <h3 className="text-xs sm:text-sm font-black text-[#17131D] dark:text-white line-clamp-1 mt-0.5 group-hover:text-[#6600FF] dark:group-hover:text-[#A78BFA] transition-colors">
            {event.title}
          </h3>

          {/* Venue */}
          <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500" />
            <span className="truncate">{event.location_name || event.city || 'Lomé'}</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="mt-2.5 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Dès
            </span>
            <span className="text-xs font-black text-[#17131D] dark:text-white">
              {formattedPrice}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onBook) onBook();
              else if (onClick) onClick();
            }}
            className="
              inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full
              bg-[#6600FF]/10 dark:bg-[#6600FF]/25 hover:bg-[#6600FF] hover:text-white
              text-[#6600FF] dark:text-[#A78BFA] text-[11px] font-bold
              transition-all active:scale-95
            "
          >
            <span>Voir</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}
