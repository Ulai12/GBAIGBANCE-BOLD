// ExploreScreen.tsx - Écran de découverte et de recherche enrichi (Événements & Participants/Amis),
// synchronisation silencieuse 3s en arrière-plan, filtres dynamiques et responsive layout Apple HIG (mobile, tablette, PC).
import { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  MapPin,
  Search,
  X,
  Sparkles,
  Users,
  Calendar,
  Heart,
  UserCheck,
  Music,
  PartyPopper,
  Mic,
  GraduationCap,
  Palette,
  Theater,
  Landmark,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { haptic } from '@/hooks/useHaptics';
import {
  searchEvents,
  fetchUpcomingEvents,
  isEventTerminated,
  isRealEvent,
  isRealProfile,
  subscribeToGlobalEventsLive,
  searchProfiles,
} from '@/services/events';
import { getCachedHomeData } from '@/services/cache';
import { EVENT_CATEGORIES, CITIES, eventMatchesCategoryFilter, hydrateEventCategories, COUNTRY_FLAGS } from '@/constants';
import type { Event, EventCategory, Profile } from '@/types';

interface ExploreScreenProps {
  onEventClick: (event: Event) => void;
  onUserClick?: (user: Profile) => void;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Music,
  PartyPopper,
  Mic,
  GraduationCap,
  Palette,
  Theater,
  Landmark,
  Lock,
};

let exploreCache: Event[] | null = null;

function getWarmExploreEvents(): Event[] {
  if (exploreCache && exploreCache.length > 0) {
    return exploreCache.filter((e) => !isEventTerminated(e));
  }
  const home = getCachedHomeData().data;
  if (home) {
    const map = new Map<string, Event>();
    [...(home.featured || []), ...(home.trending || []), ...(home.nearby || [])].forEach((e) => {
      if (e && e.id && !isEventTerminated(e)) map.set(e.id, hydrateEventCategories(e));
    });
    const list = Array.from(map.values());
    if (list.length > 0) {
      exploreCache = list;
      return list;
    }
  }
  return [];
}

export function ExploreScreen({ onEventClick, onUserClick }: ExploreScreenProps) {
  const { user: currentUser, t } = useApp();
  const { isFollowingUser, toggleFollowUser } = useFavorites();

  // Mode de recherche : événements ou participants/amis
  const [searchMode, setSearchMode] = useState<'events' | 'participants'>('events');

  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<Event[]>(() => getWarmExploreEvents());
  const [loading, setLoading] = useState(() => getWarmExploreEvents().length === 0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'paid'>('any');

  // Participants trouvés lors de la recherche
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadEvents = useCallback(async (isDefault = false) => {
    setLoading((prev) => (events.length === 0 ? true : prev));
    try {
      const rawResult = query ? await searchEvents(query) : await fetchUpcomingEvents();
      let result = rawResult
        .map(hydrateEventCategories)
        .filter((e) => isRealEvent(e) && !isEventTerminated(e));
      if (selectedCategory) result = result.filter((e) => eventMatchesCategoryFilter(e, selectedCategory));
      if (selectedCity) result = result.filter((e) => e.city === selectedCity);
      if (priceFilter === 'free') result = result.filter((e) => e.price_min === 0);
      if (priceFilter === 'paid') result = result.filter((e) => e.price_min > 0);
      setEvents(result);
      if (isDefault) {
        exploreCache = result;
      }
    } catch {
      // Retain warm cache on network failure
    } finally {
      setLoading(false);
    }
  }, [query, selectedCategory, selectedCity, priceFilter, events.length]);

  const loadParticipants = useCallback(async () => {
    setLoadingParticipants(true);
    try {
      const results = await searchProfiles(query || 'a');
      // Exclure l'utilisateur lui-même et les faux profils de test
      const filtered = results.filter((p) => p.id !== currentUser?.id && isRealProfile(p));
      setParticipants(filtered);
    } catch {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  }, [query, currentUser?.id]);

  useEffect(() => {
    if (searchMode === 'events') {
      const isDefault = !query && !selectedCategory && !selectedCity && priceFilter === 'any';
      const timer = setTimeout(() => {
        loadEvents(isDefault);
      }, isDefault && exploreCache ? 100 : 250);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        loadParticipants();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [searchMode, loadEvents, loadParticipants, query, selectedCategory, selectedCity, priceFilter]);

  // Rafraîchissement automatique en arrière-plan toutes les 3 secondes max (silencieux)
  useEffect(() => {
    const periodicSync = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        if (searchMode === 'events') {
          const isDefault = !query && !selectedCategory && !selectedCity && priceFilter === 'any';
          loadEvents(isDefault);
        } else if (query.trim()) {
          loadParticipants();
        }
      }
    }, 3000);

    const unsubscribe = subscribeToGlobalEventsLive(() => {
      if (searchMode === 'events') {
        loadEvents(false);
      }
    });

    const pruneTicker = setInterval(() => {
      setEvents((prev) => prev.filter((e) => !isEventTerminated(e)));
    }, 3000);

    return () => {
      clearInterval(periodicSync);
      clearInterval(pruneTicker);
      if (unsubscribe) unsubscribe();
    };
  }, [searchMode, loadEvents, loadParticipants, query, selectedCategory, selectedCity, priceFilter]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setPriceFilter('any');
  };

  const hasActiveFilters = Boolean(selectedCategory || selectedCity || priceFilter !== 'any');

  const handleToggleFollowUserInSearch = async (targetUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.selection();
    await toggleFollowUser(targetUserId);
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Header harmonisé style Favoris & Tickets */}
      <div className="px-5 pt-safe-header pb-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
          Découverte & Exploration
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-black text-[#17131D] dark:text-white tracking-tight">
            Recherche
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-black">
            {searchMode === 'events'
              ? `${events.length} résultat${events.length > 1 ? 's' : ''}`
              : `${participants.length} profil${participants.length > 1 ? 's' : ''}`}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Trouvez des concerts, festivals, artistes et amis à proximité
        </p>
      </div>

      {/* Barre de recherche et filtres directement sur le fond de la page (sans conteneur boîte) */}
      <div className="w-full bg-transparent">
        <div className="px-5 py-2 max-w-7xl mx-auto">
          {/* Segmented Control iOS Apple : Événements vs Participants / Amis */}
          <div className="flex items-center p-1 bg-black/[0.04] dark:bg-white/10 rounded-2xl mb-3 max-w-md mx-auto sm:mx-0 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setSearchMode('events');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                searchMode === 'events'
                  ? 'bg-white dark:bg-[#1A1829] text-[#6600FF] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Événements</span>
            </button>
            <button
              type="button"
              onClick={() => {
                haptic.selection();
                setSearchMode('participants');
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                searchMode === 'participants'
                  ? 'bg-white dark:bg-[#1A1829] text-[#6600FF] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Amis & Participants</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  searchMode === 'events'
                    ? (t('events', 'searchPlaceholder') && !t('events', 'searchPlaceholder').includes('searchPlaceholder')
                        ? t('events', 'searchPlaceholder')
                        : 'Rechercher un concert, festival, artiste...')
                    : 'Rechercher un ami ou participant...'
                }
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 text-[#17131D] dark:text-white text-xs font-semibold placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/30 transition-all shadow-2xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Effacer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchMode === 'events' && (
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                aria-label="Filtres avancés"
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative shrink-0 ${
                  hasActiveFilters
                    ? 'bg-[#6600FF] text-white shadow-purple'
                    : 'bg-white/70 dark:bg-white/10 backdrop-blur-md border border-black/5 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-white'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Barre de catégories horizontales si mode événements */}
        {searchMode === 'events' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3 pt-1 max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                !selectedCategory
                  ? 'bg-[#6600FF] text-white shadow-xs'
                  : 'bg-white/70 dark:bg-white/10 backdrop-blur-md text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('events', 'allCategories') && !t('events', 'allCategories').includes('allCategories') ? t('events', 'allCategories') : 'Tous'}</span>
            </button>
            {EVENT_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] || Music;
              const isActive = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(isActive ? null : cat.value)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#6600FF] text-white shadow-xs'
                      : 'bg-white/70 dark:bg-white/10 backdrop-blur-md text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] hover:bg-white/90'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t('events', `categories.${cat.value}`)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Contenu principal : Grille Événements OU Liste Participants */}
      <div className="px-5 mt-5">
        {searchMode === 'events' ? (
          loading && events.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="Aucun événement trouvé"
                description="Essayez de modifier vos filtres, votre mot-clé ou élargissez la ville."
                action={
                  hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-6 py-2.5 rounded-full bg-[#6600FF] text-white text-xs font-black shadow-md hover:bg-[#5200cc] transition-all cursor-pointer"
                    >
                      Réinitialiser les filtres
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          )
        ) : (
          /* Mode Participants / Amis */
          loadingParticipants && participants.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : participants.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                icon={<Users className="w-10 h-10 text-[#6600FF]" />}
                title="Aucun participant trouvé"
                description="Recherchez un ami par son prénom ou nom pour visiter son profil et voir ses sorties."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {participants.map((person) => {
                const isFollowing = isFollowingUser(person.id);
                return (
                  <div
                    key={person.id}
                    onClick={() => onUserClick?.(person)}
                    className="card p-4 flex items-center justify-between gap-3 hover:shadow-card-hover transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        id={person.id}
                        src={person.avatar_url}
                        name={person.name}
                        role={person.role}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate group-hover:text-[#6600FF] transition-colors">
                          {person.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                          {person.city ? (
                            <>
                              <span>{COUNTRY_FLAGS[person.country] || ''}</span>
                              <span>{person.city}</span>
                            </>
                          ) : (
                            <span>Participant Gbaigbance</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFollowUserInSearch(person.id, e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                        isFollowing
                          ? 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 border border-black/5 dark:border-white/10'
                          : 'bg-[#6600FF] hover:bg-[#5200cc] text-white shadow-xs'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-[#6600FF] dark:text-white" />
                          <span>Abonné</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-3.5 h-3.5" />
                          <span>Suivre</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* BottomSheet Filtres avancés pour les événements */}
      <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filtres de recherche">
        <div className="space-y-5 text-[#17131D] dark:text-white max-w-2xl mx-auto">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
              Catégorie
            </h3>
            <div className="flex flex-wrap gap-2">
              {EVENT_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.icon] || Music;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(isSelected ? null : cat.value)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t('events', `categories.${cat.value}`)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
              <MapPin className="w-3.5 h-3.5" /> Ville
            </h3>
            <div className="flex flex-wrap gap-2">
              {CITIES.map((city) => {
                const isSelected = selectedCity === city.value;
                return (
                  <button
                    key={city.value}
                    type="button"
                    onClick={() => setSelectedCity(isSelected ? null : city.value)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {city.value}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2.5">
              Tarif
            </h3>
            <div className="flex gap-2">
              {(['any', 'free', 'paid'] as const).map((p) => {
                const isSelected = priceFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceFilter(p)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t('events', `filters.${p}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={resetFilters}
              className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-black text-xs hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="flex-1 py-3 rounded-2xl bg-[#6600FF] text-white font-black text-xs shadow-md hover:bg-[#5200cc] transition-colors cursor-pointer"
            >
              Voir les résultats
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
