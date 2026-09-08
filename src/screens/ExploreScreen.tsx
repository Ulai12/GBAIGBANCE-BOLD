/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { SlidersHorizontal, MapPin } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { EventCard } from '@/components/EventCard';
import { EventCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { BottomSheet } from '@/components/BottomSheet';
import { useApp } from '@/hooks/useApp';
import { searchEvents, fetchUpcomingEvents } from '@/services/events';
import { EVENT_CATEGORIES, CITIES } from '@/constants';
import type { Event, EventCategory } from '@/types';

interface ExploreScreenProps { onEventClick: (event: Event) => void; }

export function ExploreScreen({ onEventClick }: ExploreScreenProps) {
  const { t } = useApp();
  const [query, setQuery] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<'any' | 'free' | 'paid'>('any');
  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { const timer = setTimeout(() => { loadEvents(); }, 300); return () => clearTimeout(timer); }, [query, selectedCategory, selectedCity, priceFilter]);
  const loadEvents = async () => { setLoading(true); try { let result = query ? await searchEvents(query) : await fetchUpcomingEvents(); if (selectedCategory) result = result.filter((e) => e.category === selectedCategory); if (selectedCity) result = result.filter((e) => e.city === selectedCity); if (priceFilter === 'free') result = result.filter((e) => e.price_min === 0); if (priceFilter === 'paid') result = result.filter((e) => e.price_min > 0); setEvents(result); } catch { setEvents([]); } finally { setLoading(false); } };
  const resetFilters = () => { setSelectedCategory(null); setSelectedCity(null); setPriceFilter('any'); setQuery(''); };
  const hasActiveFilters = selectedCategory || selectedCity || priceFilter !== 'any' || query;
  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 z-30 px-5 py-5 bg-[#EDE8FF]/80 backdrop-blur-xl border-b border-white/40"><div className="max-w-md mx-auto space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] font-bold">Découvrir</p><h1 className="mt-1 text-3xl font-extrabold text-[#171726] tracking-tight">Explorer</h1></div><button onClick={() => setShowFilters(true)} className="w-11 h-11 rounded-full glass-surface flex items-center justify-center relative"><SlidersHorizontal className="w-5 h-5 text-[#6600FF]" />{hasActiveFilters && <span className="absolute top-2 right-2 w-2 h-2 bg-[#6600FF] rounded-full" />}</button></div><SearchBar value={query} onChange={setQuery} placeholder="Rechercher..." onClear={() => setQuery('')} /><div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">{EVENT_CATEGORIES.map((cat) => (<button key={cat.value} onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)} className={`chip whitespace-nowrap ${selectedCategory === cat.value ? 'chip-active' : 'chip-inactive'}`}>{t('events', `categories.${cat.value}`)}</button>))}</div></div></div>
      <div className="max-w-md mx-auto px-5 mt-4">{loading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 6 }).map((_, i) => <EventCardSkeleton key={i} />)}</div>) : events.length === 0 ? (<EmptyState title="Aucun événement" description="Essayez de modifier vos filtres ou votre recherche" action={hasActiveFilters ? (<button onClick={resetFilters} className="btn-purple px-6 py-2.5 text-sm">Réinitialiser</button>) : undefined} />) : (<div className="grid grid-cols-2 gap-4 animate-stagger">{events.map((event) => (<EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />))}</div>)}</div>
      <BottomSheet open={showFilters} onClose={() => setShowFilters(false)} title="Filtres"><div className="space-y-6"><div><h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Catégorie</h3><div className="flex flex-wrap gap-2">{EVENT_CATEGORIES.map((cat) => (<button key={cat.value} onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)} className={`chip ${selectedCategory === cat.value ? 'chip-active' : 'chip-inactive'}`}>{t('events', `categories.${cat.value}`)}</button>))}</div></div><div><h3 className="flex items-center gap-1 text-sm font-semibold text-[#1A1A2E] mb-3"><MapPin className="w-4 h-4" /> Ville</h3><div className="flex flex-wrap gap-2">{CITIES.map((city) => (<button key={city.value} onClick={() => setSelectedCity(selectedCity === city.value ? null : city.value)} className={`chip ${selectedCity === city.value ? 'chip-active' : 'chip-inactive'}`}>{city.value}</button>))}</div></div><div><h3 className="text-sm font-semibold text-[#1A1A2E] mb-3">Prix</h3><div className="flex gap-2">{(['any', 'free', 'paid'] as const).map((p) => (<button key={p} onClick={() => setPriceFilter(p)} className={`chip flex-1 justify-center ${priceFilter === p ? 'chip-active' : 'chip-inactive'}`}>{t('events', `filters.${p}`)}</button>))}</div></div><div className="flex gap-3 pt-2"><button onClick={resetFilters} className="flex-1 py-3 rounded-full bg-white text-gray-600 font-semibold">Réinitialiser</button><button onClick={() => setShowFilters(false)} className="btn-purple flex-1 py-3">Appliquer</button></div></div></BottomSheet>
    </div>
  );
}
