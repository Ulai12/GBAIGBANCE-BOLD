/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  MapPin,
  Search,
  X,
  Sparkles,
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
import { useApp } from '@/hooks/useApp';
import { searchEvents, fetchUpcomingEvents } from '@/services/events';
import { getCachedHomeData } from '@/services/cache';
import { EVENT_CATEGORIES, CITIES } from '@/constants';
import type { Event, EventCategory } from '@/types';

interface ExploreScreenProps {
  onEventClick: (event: Event) => void;
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
  if (exploreCache && exploreCache.length > 0) return exploreCache;
  const home = getCachedHomeData().data;
  if (home) {
    const map = new Map<string, Event>();
    [...(home.featured || []), ...(home.trending || []), ...(home.nearby || [])].forEach((e) => {
      if (e && e.id) map.set(e.id, e);
    });
    const list = Array.from(map.values());
    if (list.length > 0) {
      exploreCache = list;
      return list;
    }
  }
  return [];
}

export function ExploreScreen({ onEventClick }: ExploreScreenProps) {
  const { t } = useApp();
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<Event[]>(() => getWarmExploreEvents());
  const [loading, setLoading] = useState(() => getWarmExploreEvents().length === 0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'paid'>('any');

  useEffect(() => {
    const isDefault = !query && !selectedCategory && !selectedCity && priceFilter === 'any';
    const timer = setTimeout(() => {
      loadEvents(isDefault);
    }, isDefault && exploreCache ? 100 : 250);
    return () => clearTimeout(timer);
  }, [query, selectedCategory, selectedCity, priceFilter]);

  const loadEvents = async (isDefault = false) => {
    if (events.length === 0) {
      setLoading(true);
    }
    try {
      let result = query ? await searchEvents(query) : await fetchUpcomingEvents();
      if (selectedCategory) result = result.filter((e) => e.category === selectedCategory);
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
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setPriceFilter('any');
    setQuery('');
  };

  const hasActiveFilters = selectedCategory || selectedCity || priceFilter !== 'any' || query;
  const activeFiltersCount = (selectedCategory ? 1 : 0) + (selectedCity ? 1 : 0) + (priceFilter !== 'any' ? 1 : 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Header — Coherent with Favorites & Tickets */}
      <div className="px-5 pt-8 pb-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
          Recherche & Découverte
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-black text-[#17131D] dark:text-white tracking-tight">
            Explorer
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-black">
            {events.length} {events.length > 1 ? 'événements' : 'événement'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Trouvez les meilleurs concerts, festivals, spectacles et sorties près de chez vous
        </p>
      </div>

      {/* Barre de recherche iOS & Bouton Filtres */}
      <div className="px-5 mt-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Événement, artiste, lieu, ambiance..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center relative active:scale-95 transition-transform shrink-0 cursor-pointer"
          aria-label="Filtres avancés"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#6600FF] dark:text-[#A78BFA]" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-[#6600FF] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Catégories harmonisées avec Home Screen (Icônes + Libellés) */}
      <div className="px-5 mt-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === null
                ? 'bg-[#6600FF] text-white shadow-xs'
                : 'bg-white dark:bg-[#1A1829] text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tous</span>
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
                    : 'bg-white dark:bg-[#1A1829] text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t('events', `categories.${cat.value}`)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Results */}
      <div className="max-w-md mx-auto px-5 mt-4">
        {loading && events.length === 0 ? (
          <div className="grid grid-cols-2 gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
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
          <div className="grid grid-cols-2 gap-3.5">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* BottomSheet Filtres avancés */}
      <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filtres de recherche">
        <div className="space-y-5 text-[#17131D] dark:text-white">
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
