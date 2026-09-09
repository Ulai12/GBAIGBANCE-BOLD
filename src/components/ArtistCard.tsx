import { BadgeCheck, Music2, Share2, UserCheck, UserPlus } from 'lucide-react';
import type { Artist } from '@/types';
import { formatNumber } from '@/utils/format';
import { useApp } from '@/hooks/useApp';
import { SmartImage } from '@/components/SmartImage';
import { useFavorites } from '@/contexts/FavoritesContext';

interface ArtistCardProps {
  artist: Artist;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export function ArtistCard({ artist, onClick, variant = 'default' }: ArtistCardProps) {
  const { language } = useApp();
  const { isFollowingArtist, toggleFollowArtist } = useFavorites();
  const following = isFollowingArtist(artist.id);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = `${artist.name} sur Gbaïgbancê`;
    const text = `Découvrez le profil de ${artist.name} et ses prochains événements !`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      } catch {
        // Silence
      }
    }
  };

  if (variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className="flex flex-col items-center gap-2 w-24 shrink-0 cursor-pointer group"
      >
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#6600FF]/30 group-hover:ring-[#6600FF] transition-all">
          <SmartImage
            src={artist.photo_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200'}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {artist.is_verified && (
            <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5 shadow-xs">
              <BadgeCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <span className="text-xs font-bold text-[#17131D] dark:text-white text-center line-clamp-1 w-full">
          {artist.name}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="rounded-3xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-60 shrink-0 bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col"
    >
      <div className="relative h-36 overflow-hidden">
        <SmartImage
          src={artist.cover_url || artist.photo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Share Button Floating */}
        <button
          type="button"
          onClick={handleShare}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
          title="Partager l'artiste"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>

        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
          <SmartImage
            src={artist.photo_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100'}
            alt={artist.name}
            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white/60 shrink-0 shadow-xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="text-white font-black text-sm truncate">{artist.name}</h3>
              {artist.is_verified && <BadgeCheck className="w-4 h-4 text-[#A885FF] shrink-0" />}
            </div>
            <p className="text-white/80 text-[11px] font-medium">
              {formatNumber(artist.followers_count, language)} followers
            </p>
          </div>
        </div>
      </div>

      <div className="p-3.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 min-w-0 flex-1">
          {artist.genres.slice(0, 1).map((genre) => (
            <span
              key={genre}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 truncate"
            >
              <Music2 className="w-3 h-3 text-[#6600FF] dark:text-[#A78BFA]" />
              <span className="truncate">{genre}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFollowArtist(artist.id);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
            following
              ? 'bg-gray-100 dark:bg-white/10 text-[#6600FF] dark:text-[#A78BFA]'
              : 'bg-[#6600FF] text-white shadow-xs hover:bg-[#5200cc]'
          }`}
        >
          {following ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              <span>Suivi</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              <span>Suivre</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
