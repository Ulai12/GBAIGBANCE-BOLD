// ExploreScreen.tsx - Découverte et recherche d'événements et de participants.
// Les mises à jour de la liste reposent sur Supabase Realtime, sans polling périodique.
import { useState, useEffect, useCallback, useRef } from 'react';
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
  Briefcase,
  Flame,
  Trophy,
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
import { MAIN_CATEGORIES, CITIES, eventMatchesCategoryFilter, hydrateEventCategories, COUNTRY_FLAGS } from '@/constants';
import type { Event, Profile } from '@/types';
import { coreSearchIds, coreFuzzySearch } from '@/lib/rust-core';

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
  Briefcase,
  Flame,
  Trophy,
  Heart,
};

const SEARCH_WASM_THRESHOLD = 100;

function normalizeSearchText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');
}

function rankExploreResults(events: Event[], query: string): Event[] {
  const needle = normalizeSearchText(query.trim());
  if (!needle) return events;

  return events
    .map((event, index) => {
      const title = normalizeSearchText(event.title);
      const city = normalizeSearchText(event.city);
      const location = normalizeSearchText(event.location_name);
      const category = normalizeSearchText(event.category);
      const description = normalizeSearchText(event.description);
      const score =
        (title === needle ? 100 : title.startsWith(needle) ? 80 : title.includes(needle) ? 60 : 0) +
        (city.includes(needle) ? 25 : 0) +
        (location.includes(needle) ? 20 : 0) +
        (category.includes(needle) ? 15 : 0) +
        (description.includes(needle) ? 5 : 0);
      return { event, index, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ event }) => event);
}

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'paid'>('any');
  const hasLoadedEventsRef = useRef(events.length > 0);
  const eventRequestRef = useRef(0);
  const loadEventsRef = useRef<((isDefault?: boolean) => Promise<void>) | null>(null);
  const searchModeRef = useRef(searchMode);
  searchModeRef.current = searchMode;

  // Participants trouvés lors de la recherche
  const [participants, setParticipants] = useState<Profile[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const loadEvents = useCallback(async (isDefault = false) => {
    const requestId = ++eventRequestRef.current;
    if (!hasLoadedEventsRef.current) setLoading(true);
    try {
      const q = query.trim();
      const rawSql = q ? await searchEvents(q) : await fetchUpcomingEvents();
      // Le SQL ne plie pas les accents : on croise aussi le catalogue déjà chargé.
      const catalog = q.length >= 2 ? (exploreCache && exploreCache.length > 0 ? exploreCache : await fetchUpcomingEvents()) : [];
      const merged = new Map<string, Event>();
      for (const event of [...catalog, ...rawSql]) {
        if (event?.id) merged.set(event.id, event);
      }
      const applyFilters = (list: Event[]) => {
        let next = list.map(hydrateEventCategories).filter((e) => isRealEvent(e) && !isEventTerminated(e));
        if (selectedCategory) next = next.filter((e) => eventMatchesCategoryFilter(e, selectedCategory));
        if (selectedCity) next = next.filter((e) => e.city === selectedCity);
        if (priceFilter === 'free') next = next.filter((e) => e.price_min === 0 || e.is_free);
        if (priceFilter === 'paid') next = next.filter((e) => (e.price_min || 0) > 0 && !e.is_free);
        return next;
      };
      let result = applyFilters(q.length >= 2 ? [...merged.values()] : rawSql);
      if (q.length >= 2) {
        const eventsForRust = result.map((event) => ({
          id: event.id,
          title: event.title,
          city: event.city,
          category: event.category,
          description: event.description || '',
          location: event.location_name,
        }));
        if (eventsForRust.length >= SEARCH_WASM_THRESHOLD) {
          const ranked = (await coreFuzzySearch(q, eventsForRust)) || (await coreSearchIds(q, eventsForRust));
          if (ranked && ranked.length > 0) {
            const byId = new Map(result.map((event) => [event.id, event]));
            result = ranked.map((id) => byId.get(id)).filter((event): event is Event => !!event);
          } else {
            const localRanked = rankExploreResults(result, q);
            result = localRanked.length > 0 ? localRanked : applyFilters(rawSql);
          }
        } else {
          // Pour les petits catalogues, le tri JavaScript évite le téléchargement
          // et l'initialisation WASM pour une recherche de quelques dizaines d'items.
          const localRanked = rankExploreResults(result, q);
          result = localRanked.length > 0 ? localRanked : applyFilters(rawSql);
        }
      }
      if (requestId !== eventRequestRef.current) return;
      setEvents(result);
      hasLoadedEventsRef.current = true;
      if (isDefault) {
        exploreCache = result;
      }
    } catch {
      // Conserve les résultats déjà affichés en cas de perte réseau.
    } finally {
      if (requestId === eventRequestRef.current) {
        hasLoadedEventsRef.current = true;
        setLoading(false);
      }
    }
  }, [query, selectedCategory, selectedCity, priceFilter]);

  loadEventsRef.current = loadEvents;

  const loadParticipants = useCallback(async () => {
    const q = query.trim();
    // « a » renvoyait n'importe quel profil dès l'ouverture de l'onglet Amis.
    if (q.length < 2) {
      setParticipants([]);
      setLoadingParticipants(false);
      return;
    }
    setLoadingParticipants(true);
    try {
      const results = await searchProfiles(q);
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

  // Un seul canal global pendant la durée de vie de l'écran.
  // Les refs évitent de recréer le WebSocket à chaque frappe ou changement de filtre.
  useEffect(() => {
    const unsubscribe = subscribeToGlobalEventsLive(() => {
      if (searchModeRef.current === 'events') {
        void loadEventsRef.current?.(false);
      }
    }, ['events']);

    return () => {
      unsubscribe();
    };
  }, []);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setPriceFilter('any');
  };

  const hasActiveFilters = Boolean(selectedCategory || selectedCity || priceFilter !== 'any');
  const selectedMainCategory = MAIN_CATEGORIES.find((main) =>
    main.id === selectedCategory || main.subcategories.some((sub) => sub.id === selectedCategory)
  );

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
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-[1.7rem] font-black leading-none tracking-tight text-[#17131D] dark:text-white min-[380px]:text-3xl">
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
      <div className="px-5 pt-1 pb-3 space-y-3">
        {/* Segmented Control iOS Apple : Événements vs Participants / Amis */}
        <div className="flex items-center p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl max-w-md backdrop-blur-xl border border-black/[0.04] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => {
              haptic.selection();
              setSearchMode('events');
            }}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-black transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] min-[380px]:text-xs ${
              searchMode === 'events'
                ? 'bg-white text-[#6600FF] shadow-xs dark:bg-[#1A1829] dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
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
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-[11px] font-black transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] min-[380px]:text-xs ${
              searchMode === 'participants'
                ? 'bg-white text-[#6600FF] shadow-xs dark:bg-[#1A1829] dark:text-white'
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="min-[400px]:hidden">Amis</span>
            <span className="hidden min-[400px]:inline">Amis & Participants</span>
          </button>
        </div>

        {/* Barre de recherche fluide intégrée au fond */}
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
              className="min-h-11 w-full rounded-2xl border border-black/[0.05] bg-black/[0.03] py-3 pl-10 pr-12 text-xs font-semibold text-[#17131D] shadow-2xs backdrop-blur-xl transition-all placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6600FF]/30 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-white sm:text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] dark:hover:text-gray-200"
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
              className={`relative flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-2xl transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                hasActiveFilters
                  ? 'bg-[#6600FF] text-white shadow-purple'
                  : 'border border-black/[0.05] bg-black/[0.03] text-gray-700 backdrop-blur-xl hover:bg-black/[0.06] dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-200 dark:hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-white motion-reduce:animate-none animate-pulse" />
              )}
            </button>
          )}
        </div>

        {searchMode === 'events' && (
          <div className="space-y-2">
            <div
              className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pt-1 no-scrollbar"
              role="group"
              aria-label="Catégories principales"
            >
              <button
                type="button"
                aria-pressed={!selectedCategory}
                onClick={() => setSelectedCategory(null)}
                className={`flex min-h-11 shrink-0 snap-start cursor-pointer items-center gap-1.5 rounded-full px-4 text-xs font-black transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                  !selectedCategory
                    ? 'bg-[#6600FF] text-white shadow-[0_6px_18px_rgba(102,0,255,0.22)]'
                    : 'border border-black/[0.05] bg-black/[0.03] text-gray-600 backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('events', 'categories.all') && !t('events', 'categories.all').includes('categories.all') ? t('events', 'categories.all') : 'Tous'}</span>
              </button>
              {MAIN_CATEGORIES.map((main) => {
                const Icon = CATEGORY_ICONS[main.iconName] || Palette;
                const isFamily = selectedMainCategory?.id === main.id;
                const isExact = selectedCategory === main.id;
                return (
                  <button
                    key={main.id}
                    type="button"
                    aria-pressed={isFamily}
                    onClick={() => setSelectedCategory(isExact ? null : main.id)}
                    className={`flex min-h-11 shrink-0 snap-start cursor-pointer items-center gap-2 rounded-full px-4 text-xs font-bold transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                      isFamily
                        ? 'bg-[#6600FF] text-white shadow-[0_6px_18px_rgba(102,0,255,0.22)]'
                        : 'border border-black/[0.05] bg-black/[0.03] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{main.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {selectedMainCategory && (
              <div
                className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 no-scrollbar"
                role="group"
                aria-label={`Sous-catégories de ${selectedMainCategory.shortLabel}`}
              >
                <button
                  type="button"
                  aria-pressed={selectedCategory === selectedMainCategory.id}
                  onClick={() => setSelectedCategory(selectedMainCategory.id)}
                  className={`inline-flex min-h-11 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                    selectedCategory === selectedMainCategory.id
                      ? 'bg-[#6600FF] text-white'
                      : 'bg-black/[0.04] text-gray-700 dark:bg-white/[0.08] dark:text-gray-200'
                  }`}
                >
                  Toutes
                </button>
                {selectedMainCategory.subcategories.map((sub) => {
                  const isSelected = selectedCategory === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedCategory(isSelected ? selectedMainCategory.id : sub.id)}
                      className={`inline-flex min-h-11 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#14121E] ${
                        isSelected
                          ? 'bg-[#6600FF] text-white'
                          : 'bg-black/[0.04] text-gray-700 dark:bg-white/[0.08] dark:text-gray-200'
                      }`}
                    >
                      {sub.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
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
                title={query.trim().length < 2 ? 'Cherchez une personne' : 'Aucun participant trouvé'}
                description={
                  query.trim().length < 2
                    ? 'Saisissez au moins 2 lettres du prénom ou du nom.'
                    : 'Aucun profil ne correspond. Essayez une autre orthographe.'
                }
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
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
              {MAIN_CATEGORIES.map((main) => {
                const Icon = CATEGORY_ICONS[main.iconName] || Palette;
                const isFamily = selectedMainCategory?.id === main.id;
                const isExact = selectedCategory === main.id;
                return (
                  <button
                    key={main.id}
                    type="button"
                    aria-pressed={isFamily}
                    onClick={() => setSelectedCategory(isExact ? null : main.id)}
                    className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      isFamily
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="whitespace-nowrap">{main.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            {selectedMainCategory && (
              <div className="pt-3">
                <p className="mb-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                  Sous-catégories · {selectedMainCategory.shortLabel}
                </p>
                <div
                  className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 no-scrollbar"
                  role="group"
                  aria-label={`Sous-catégories de ${selectedMainCategory.shortLabel}`}
                >
                  <button
                    type="button"
                    aria-pressed={selectedCategory === selectedMainCategory.id}
                    onClick={() => setSelectedCategory(selectedMainCategory.id)}
                    className={`inline-flex min-h-11 shrink-0 snap-start items-center rounded-full px-3.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      selectedCategory === selectedMainCategory.id
                        ? 'bg-[#6600FF] text-white'
                        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    }`}
                  >
                    Toutes
                  </button>
                  {selectedMainCategory.subcategories.map((sub) => {
                    const isSelected = selectedCategory === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedCategory(isSelected ? selectedMainCategory.id : sub.id)}
                        className={`inline-flex min-h-11 shrink-0 snap-start items-center whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                          isSelected
                            ? 'bg-[#6600FF] text-white'
                            : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                        }`}
                      >
                        {sub.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                    className={`inline-flex min-h-11 cursor-pointer items-center rounded-full px-3.5 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      isSelected
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    }`}
                    aria-pressed={isSelected}
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
                    className={`min-h-11 flex-1 cursor-pointer rounded-xl px-2 py-2 text-center text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] ${
                      isSelected
                        ? 'bg-[#6600FF] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                    }`}
                    aria-pressed={isSelected}
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
              className="min-h-11 flex-1 cursor-pointer rounded-2xl bg-gray-100 py-3 text-xs font-black text-gray-700 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] dark:bg-white/10 dark:text-gray-300"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="min-h-11 flex-1 cursor-pointer rounded-2xl bg-[#6600FF] py-3 text-xs font-black text-white shadow-md transition-colors hover:bg-[#5200cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6600FF] focus-visible:ring-offset-2"
            >
              Voir les résultats
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
