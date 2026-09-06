import { BadgeCheck, Music2 } from 'lucide-react';
import type { Artist } from '@/types';
import { formatNumber } from '@/utils/format';
import { useApp } from '@/hooks/useApp';
import { SmartImage } from '@/components/SmartImage';

interface ArtistCardProps {
  artist: Artist;
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export function ArtistCard({ artist, onClick, variant = 'default' }: ArtistCardProps) {
  const { language } = useApp();

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
            <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-0.5">
              <BadgeCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <span className="text-xs font-semibold text-[#171726] text-center line-clamp-1 w-full">
          {artist.name}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-3xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-56 shrink-0"
    >
      <div className="relative h-40 overflow-hidden">
        <SmartImage
          src={artist.cover_url || artist.photo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=400'}
          alt={artist.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <SmartImage
            src={artist.photo_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100'}
            alt={artist.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/50"
          />
          <div>
            <div className="flex items-center gap-1">
              <h3 className="text-white font-bold text-sm">{artist.name}</h3>
              {artist.is_verified && <BadgeCheck className="w-4 h-4 text-[#A885FF]" />}
            </div>
            <p className="text-white/70 text-xs">{formatNumber(artist.followers_count, language)} followers</p>
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-1">
          {artist.genres.slice(0, 2).map((genre) => (
            <span key={genre} className="glass-surface flex items-center gap-1 text-xs px-2 py-1 rounded-full text-[#4d4d5d]">
              <Music2 className="w-3 h-3" />
              {genre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
