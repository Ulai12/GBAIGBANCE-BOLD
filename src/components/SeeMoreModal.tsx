import { useState, useMemo } from 'react';
import {
  ChevronLeft, Search, Navigation, Sparkles, Gift, Flame, Music, Building2, X
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { OrganizerCard } from '@/components/OrganizerCard';
import { EmptyState } from '@/components/EmptyState';
import type { Event, Artist, Organization } from '@/types';
import { formatDistance } from '@/utils/geo';

export type SeeMoreSectionType =
  | 'nearby'
  | 'preferences'
  | 'free'
  | 'unmissable'
  | 'artists'
  | 'organizations';

interface SeeMoreModalProps {
  type: SeeMoreSectionType | null;
  onClose: () => void;
  events: (Event & { distanceKm?: number })[];
  artists: Artist[];
  organizations: Organization[];
  onEventClick: (event: Event) => void;
  onArtistClick?: (artist: Artist) => void;
  onOrganizationClick?: (org: Organization) => void;
}

export function SeeMoreModal({
  type,
  onClose,
  events,
  artists,
  organizations,
  onEventClick,
  onArtistClick,
  onOrganizationClick,
}: SeeMoreModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceFilter, setDistanceFilter] = useState<number | 'all'>(5);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const sectionMeta = useMemo(() => {
    switch (type) {
      case 'nearby':
        return {
          title: 'À moins de 5 km',
          subtitle: 'Événements autour de votre position',
          icon: Navigation,
          badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        };
      case 'preferences':
        return {
          title: 'Selon vos préférences',
          subtitle: 'Sélection personnalisée selon vos goûts',
          icon: Sparkles,
          badgeColor: 'bg-purple-500/15 text-[#6600FF] dark:text-purple-400',
        };
      case 'free':
        return {
          title: 'Événements Gratuits',
          subtitle: 'Entrée 100% libre sans frais',
          icon: Gift,
          badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        };
      case 'unmissable':
        return {
          title: 'À ne pas manquer',
          subtitle: 'Les rendez-vous les plus attendus',
          icon: Flame,
          badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        };
      case 'artists':
        return {
          title: 'Artistes du moment',
          subtitle: 'Talents et créateurs de la communauté',
          icon: Music,
          badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
        };
      case 'organizations':
        return {
          title: 'Organisateurs officiels',
          subtitle: 'Collectifs et créateurs d’expériences',
          icon: Building2,
          badgeColor: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
        };
      default:
        return {
          title: 'Explorer',
          subtitle: 'Découvrez plus de contenus',
          icon: Sparkles,
          badgeColor: 'bg-purple-500/15 text-[#6600FF] dark:text-purple-400',
        };
    }
  }, [type]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    let list = events;

    if (type === 'nearby') {
      if (distanceFilter !== 'all') {
        list = list.filter((e) => typeof e.distanceKm === 'number' && e.distanceKm <= distanceFilter);
      }
    } else if (type === 'free') {
      list = list.filter((e) => e.price_min === 0);
    }

    if (categoryFilter !== 'all') {
      list = list.filter((e) => (e.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.location_name && e.location_name.toLowerCase().includes(q)) ||
          (e.city && e.city.toLowerCase().includes(q))
      );
    }

    return list;
  }, [events, type, distanceFilter, categoryFilter, searchQuery]);

  // Filtered Artists
  const filteredArtists = useMemo(() => {
    let list = artists;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.bio && a.bio.toLowerCase().includes(q)) ||
          (a.city && a.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [artists, searchQuery]);

  // Filtered Organizations
  const filteredOrganizations = useMemo(() => {
    let list = organizations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          (o.description && o.description.toLowerCase().includes(q)) ||
          (o.city && o.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [organizations, searchQuery]);

  if (!type) return null;

  const totalCount =
    type === 'artists'
      ? filteredArtists.length
      : type === 'organizations'
      ? filteredOrganizations.length
      : filteredEvents.length;

  const Icon = sectionMeta.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FAFAFC] dark:bg-[#0D0B12] animate-slide-up">
      {/* Top sticky iOS bar */}
      <header className="sticky top-0 z-20 px-5 pt-5 pb-4 bg-white/85 dark:bg-[#0D0B12]/85 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm font-bold text-[#6600FF] active:scale-95 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            <span>Retour</span>
          </button>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-black/[0.04] dark:bg-white/[0.08] text-gray-600 dark:text-gray-300">
            {totalCount}{' '}
            {type === 'artists'
              ? 'artiste' + (totalCount > 1 ? 's' : '')
              : type === 'organizations'
              ? 'organisateur' + (totalCount > 1 ? 's' : '')
              : 'événement' + (totalCount > 1 ? 's' : '')}
          </span>
        </div>

        {/* Section title & badge */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${sectionMeta.badgeColor} flex items-center justify-center shrink-0 shadow-2xs`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-[-0.04em] text-[#17131D] dark:text-white">
              {sectionMeta.title}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {sectionMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3.5 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              type === 'artists'
                ? 'Rechercher un artiste...'
                : type === 'organizations'
                ? 'Rechercher un organisateur...'
                : 'Rechercher un événement...'
            }
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-100/90 dark:bg-white/[0.07] border border-transparent focus:border-[#6600FF]/40 text-sm font-medium text-[#17131D] dark:text-white placeholder-gray-400 outline-hidden transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Distance Pills for Nearby */}
        {type === 'nearby' && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar py-0.5">
            {[5, 10, 25, 'all' as const].map((dist) => (
              <button
                key={String(dist)}
                type="button"
                onClick={() => setDistanceFilter(dist)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  distanceFilter === dist
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.14]'
                }`}
              >
                {dist === 'all' ? 'Tout Lomé' : `< ${dist} km`}
              </button>
            ))}
          </div>
        )}

        {/* Preferences Quick Filter */}
        {type === 'preferences' && (
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar py-0.5">
            {['all', 'concert', 'party', 'festival', 'culture', 'spectacle'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap capitalize transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-[#6600FF] text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.14]'
                }`}
              >
                {cat === 'all' ? 'Tous les genres' : cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main Grid Content */}
      <main className="px-5 py-6 pb-28">
        {type === 'artists' ? (
          filteredArtists.length === 0 ? (
            <EmptyState
              title="Aucun artiste trouvé"
              description="Aucun artiste ne correspond à votre recherche"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {filteredArtists.map((artist) => (
                <div
                  key={artist.id}
                  onClick={() => {
                    onClose();
                    onArtistClick?.(artist);
                  }}
                  className="glass-card p-4 rounded-2xl flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <img
                    src={artist.photo_url || 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200'}
                    alt={artist.name}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-[#6600FF]/30 shadow-xs mb-3"
                  />
                  <h3 className="font-bold text-sm text-[#17131D] dark:text-white line-clamp-1">
                    {artist.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                    {artist.city || 'Lomé, Togo'}
                  </p>
                  <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] text-[11px] font-bold">
                    {artist.events_count ?? 0} événement{(artist.events_count ?? 0) > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : type === 'organizations' ? (
          filteredOrganizations.length === 0 ? (
            <EmptyState
              title="Aucun organisateur trouvé"
              description="Aucun organisateur ne correspond à votre recherche"
            />
          ) : (
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
              {filteredOrganizations.map((org) => (
                <OrganizerCard
                  key={org.id}
                  organization={org}
                  onClick={() => {
                    onClose();
                    onOrganizationClick?.(org);
                  }}
                />
              ))}
            </div>
          )
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Aucun événement trouvé"
            description="Aucun événement ne correspond à ce filtre pour le moment"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="relative group">
                <EventCard
                  event={event}
                  onClick={() => {
                    onClose();
                    onEventClick(event);
                  }}
                />
                {typeof event.distanceKm === 'number' && (
                  <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600/90 text-white backdrop-blur-md shadow-xs">
                      <Navigation className="w-2.5 h-2.5" />
                      {formatDistance(event.distanceKm)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
