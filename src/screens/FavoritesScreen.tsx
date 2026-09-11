import { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Music2,
  Building2,
  Search,
  X,
  BadgeCheck,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { supabase } from '@/services/supabase';
import { getCachedHomeData } from '@/services/cache';
import { isEventTerminated } from '@/services/events';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import type { Event, Artist, Organization } from '@/types';

interface FavoritesScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
  onArtistClick?: (artist: Artist) => void;
  onOrganizationClick?: (org: Organization) => void;
}

type FavTab = 'events' | 'artists' | 'organizations';
type EventStatusFilter = 'all' | 'upcoming' | 'past';

function getInitialFavEvents(likedIds: Set<string>): Event[] {
  if (likedIds.size === 0) return [];
  const list: Event[] = [];
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gba_fav_events_cache') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((e: Event) => {
          if (e && e.id && likedIds.has(e.id)) list.push(e);
        });
      }
    }
  } catch {
    // Ignore storage parse
  }
  const home = getCachedHomeData().data;
  if (home) {
    const homeEvents = [...(home.featured || []), ...(home.trending || []), ...(home.nearby || [])];
    homeEvents.forEach((e) => {
      if (e && e.id && likedIds.has(e.id) && !list.some((x) => x.id === e.id)) {
        list.push(e);
      }
    });
  }
  return list;
}

function getInitialFavArtists(artistIds: Set<string>): Artist[] {
  if (artistIds.size === 0) return [];
  const home = getCachedHomeData().data;
  if (home && home.artists) {
    return home.artists.filter((a) => artistIds.has(a.id));
  }
  return [];
}

function getInitialFavOrgs(orgIds: Set<string>): Organization[] {
  if (orgIds.size === 0) return [];
  const home = getCachedHomeData().data;
  if (home && home.organizations) {
    return home.organizations.filter((o) => orgIds.has(o.id));
  }
  return [];
}

export function FavoritesScreen({
  onEventClick,
  onLogin,
  onArtistClick,
  onOrganizationClick,
}: FavoritesScreenProps) {
  const { session, t } = useApp();
  const { likedEventIds, followedArtistIds, followedOrgIds, toggleFollowArtist, toggleFollowOrg } = useFavorites();

  const [activeTab, setActiveTab] = useState<FavTab>('events');
  const [eventFilter, setEventFilter] = useState<EventStatusFilter>('all');
  const [query, setQuery] = useState('');

  // Warm Data states
  const [events, setEvents] = useState<Event[]>(() => getInitialFavEvents(likedEventIds));
  const [artists, setArtists] = useState<Artist[]>(() => getInitialFavArtists(followedArtistIds));
  const [organizations, setOrganizations] = useState<Organization[]>(() => getInitialFavOrgs(followedOrgIds));
  const [loading, setLoading] = useState(() => likedEventIds.size > 0 && getInitialFavEvents(likedEventIds).length === 0);

  // Charger les événements favoris avec découpage en lots sécurisé (support des passés et actifs)
  useEffect(() => {
    let isCancelled = false;
    async function loadFavoriteEvents() {
      if (likedEventIds.size === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      try {
        const ids = Array.from(likedEventIds);
        const batches: string[][] = [];
        for (let i = 0; i < ids.length; i += 40) {
          batches.push(ids.slice(i, i + 40));
        }

        const loadedEvents: Event[] = [];
        for (const batch of batches) {
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .in('id', batch);

          if (!error && data) {
            loadedEvents.push(...(data as Event[]));
          }
        }

        if (!isCancelled) {
          setEvents((prev) => {
            const map = new Map<string, Event>();
            prev.forEach((e) => map.set(e.id, e));
            loadedEvents.forEach((e) => map.set(e.id, e));
            const merged = Array.from(map.values()).filter((e) => likedEventIds.has(e.id));
            try {
              localStorage.setItem('gba_fav_events_cache', JSON.stringify(merged));
            } catch {
              // Quota storage
            }
            return merged;
          });
        }
      } catch {
        // Ignorer erreur réseau
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadFavoriteEvents();
    return () => {
      isCancelled = true;
    };
  }, [likedEventIds]);

  // Charger les artistes et organisations suivis
  useEffect(() => {
    let isCancelled = false;
    async function loadFollowedEntities() {
      try {
        if (followedArtistIds.size > 0) {
          const artistIds = Array.from(followedArtistIds);
          const { data: artData } = await supabase
            .from('artists')
            .select('*')
            .in('id', artistIds);
          if (!isCancelled && artData) {
            setArtists(artData as Artist[]);
          }
        } else {
          setArtists([]);
        }

        if (followedOrgIds.size > 0) {
          const orgIds = Array.from(followedOrgIds);
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .in('id', orgIds);
          if (!isCancelled && orgData) {
            setOrganizations(orgData as Organization[]);
          }
        } else {
          setOrganizations([]);
        }
      } catch {
        // Silence
      }
    }

    loadFollowedEntities();
    return () => {
      isCancelled = true;
    };
  }, [followedArtistIds, followedOrgIds]);

  // Séparation organisée des événements en cours / à venir et des événements passés
  const { activeEvents, terminatedEvents } = useMemo(() => {
    const active: Event[] = [];
    const terminated: Event[] = [];

    const list = events.filter((e) => likedEventIds.has(e.id));
    const filtered = !query.trim()
      ? list
      : list.filter((e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.location_name?.toLowerCase().includes(query.toLowerCase()) ||
          e.category?.toLowerCase().includes(query.toLowerCase())
        );

    filtered.forEach((e) => {
      if (isEventTerminated(e)) {
        terminated.push(e);
      } else {
        active.push(e);
      }
    });

    // À venir : tri chronologique croissant (plus proche en premier)
    active.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    // Terminés : tri antichronologique (plus récent en premier)
    terminated.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

    return { activeEvents: active, terminatedEvents: terminated };
  }, [events, likedEventIds, query]);

  const filteredArtists = useMemo(() => {
    const list = artists.filter((a) => followedArtistIds.has(a.id));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((a) => a.name.toLowerCase().includes(q) || a.city?.toLowerCase().includes(q));
  }, [artists, followedArtistIds, query]);

  const filteredOrgs = useMemo(() => {
    const list = organizations.filter((o) => followedOrgIds.has(o.id));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((o) => o.name.toLowerCase().includes(q) || o.city?.toLowerCase().includes(q));
  }, [organizations, followedOrgIds, query]);

  const totalFavoritesCount = likedEventIds.size + followedArtistIds.size + followedOrgIds.size;
  const totalFavEventsCount = activeEvents.length + terminatedEvents.length;

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] dark:text-[#A78BFA] font-black">
          Vos Coups de Cœur
        </p>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-3xl font-black text-[#17131D] dark:text-white tracking-tight">
            Favoris & Suivis
          </h1>
          <span className="px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-black">
            {totalFavoritesCount}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Retrouvez vos sorties préférées, artistes et organisateurs abonnés
        </p>
      </div>

      {/* Barre de recherche iOS */}
      <div className="px-5 mt-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher dans votre sélection..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] text-xs font-semibold text-[#17131D] dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]/40 shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control iOS Principal */}
      <div className="px-5 mt-4">
        <div className="p-1 bg-gray-200/70 dark:bg-white/10 rounded-2xl flex items-center">
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'events'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${activeTab === 'events' ? 'fill-current' : ''}`} />
            <span>Événements ({likedEventIds.size})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('artists')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'artists'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>Artistes ({followedArtistIds.size})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('organizations')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'organizations'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Orgas ({followedOrgIds.size})</span>
          </button>
        </div>
      </div>

      {/* Sous-filtre intelligent iOS pour les événements (Tous / À venir / Terminés) */}
      {activeTab === 'events' && likedEventIds.size > 0 && (
        <div className="px-5 mt-3 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setEventFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
              eventFilter === 'all'
                ? 'bg-[#17131D] dark:bg-white text-white dark:text-[#17131D] shadow-xs'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/10'
            }`}
          >
            {t('events', 'favorites.all') || 'Tous'} ({totalFavEventsCount})
          </button>
          <button
            type="button"
            onClick={() => setEventFilter('upcoming')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              eventFilter === 'upcoming'
                ? 'bg-[#6600FF] text-white shadow-xs'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {t('events', 'favorites.upcoming') || 'À venir'} ({activeEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setEventFilter('past')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              eventFilter === 'past'
                ? 'bg-gray-700 dark:bg-gray-600 text-white shadow-xs'
                : 'bg-white dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-black/5 dark:border-white/10'
            }`}
          >
            <Clock className="w-3 h-3 text-gray-400" />
            {t('events', 'favorites.past') || 'Terminés'} ({terminatedEvents.length})
          </button>
        </div>
      )}

      {/* Sync Banner if not logged in */}
      {!session && (
        <div className="px-5 mt-4">
          <div className="p-3.5 rounded-2xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 border border-[#6600FF]/25 flex items-center justify-between gap-3">
            <p className="text-xs text-[#17131D] dark:text-white font-medium">
              Synchronisez vos favoris et vos alertes sur tous vos appareils.
            </p>
            <button
              type="button"
              onClick={onLogin}
              className="px-3.5 py-1.5 rounded-full bg-[#6600FF] text-white text-xs font-bold shrink-0 hover:bg-[#5200cc] transition-all"
            >
              Se connecter
            </button>
          </div>
        </div>
      )}

      {/* Main List Area */}
      <div className="px-5 mt-4">
        {/* ONGLET 1 : ÉVÉNEMENTS AIMÉS */}
        {activeTab === 'events' && (
          <div>
            {loading ? (
              <div className="grid grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-[0.8] rounded-3xl bg-gray-200 dark:bg-[#1A1829] animate-pulse"
                  />
                ))}
              </div>
            ) : totalFavEventsCount === 0 ? (
              <EmptyState
                title={query ? 'Aucun événement correspondant' : (t('events', 'favorites.emptyAll') || 'Aucun événement aimé')}
                description={
                  query
                    ? 'Essayez avec un autre terme de recherche'
                    : 'Touchez le cœur sur une affiche ou carte pour retrouver vos événements préférés ici'
                }
                icon={<Heart className="w-12 h-12 text-[#6600FF]/40" />}
              />
            ) : (
              <div className="space-y-6">
                {/* 1. SECTION ÉVÉNEMENTS ACTIFS / À VENIR */}
                {(eventFilter === 'all' || eventFilter === 'upcoming') && activeEvents.length > 0 && (
                  <div>
                    {eventFilter === 'all' && (
                      <div className="flex items-center justify-between mb-3 px-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <h2 className="text-xs font-black uppercase tracking-wider text-[#17131D] dark:text-white">
                            {t('events', 'favorites.activeSection') || 'À venir & En cours'}
                          </h2>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {activeEvents.length}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3.5">
                      {activeEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* État vide spécifique filtre "À venir" */}
                {eventFilter === 'upcoming' && activeEvents.length === 0 && (
                  <EmptyState
                    title="Aucun événement à venir"
                    description="Tous vos événements favoris sont déjà passés."
                    icon={<Calendar className="w-12 h-12 text-emerald-500/40" />}
                  />
                )}

                {/* 2. SECTION ÉVÉNEMENTS PASSÉS / TERMINÉS */}
                {(eventFilter === 'all' || eventFilter === 'past') && terminatedEvents.length > 0 && (
                  <div>
                    {eventFilter === 'all' && (
                      <div className="flex items-center justify-between mb-3 px-0.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-gray-400" />
                          <h2 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t('events', 'favorites.pastSection') || 'Événements passés / Terminés'}
                          </h2>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-400">
                          {terminatedEvents.length}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3.5 opacity-90">
                      {terminatedEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onClick={() => onEventClick(event)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* État vide spécifique filtre "Terminés" */}
                {eventFilter === 'past' && terminatedEvents.length === 0 && (
                  <EmptyState
                    title="Aucun événement terminé"
                    description="Vous n'avez aucun événement passé dans votre sélection."
                    icon={<Clock className="w-12 h-12 text-gray-400/40" />}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ONGLET 2 : ARTISTES SUIVIS */}
        {activeTab === 'artists' && (
          <div className="space-y-3">
            {filteredArtists.length === 0 ? (
              <EmptyState
                title={query ? 'Aucun artiste trouvé' : 'Aucun artiste suivi'}
                description={
                  query
                    ? 'Aucun artiste ne correspond à votre filtre'
                    : 'Abonnez-vous à vos DJ et artistes préférés pour ne manquer aucune date'
                }
                icon={<Music2 className="w-12 h-12 text-[#6600FF]/40" />}
              />
            ) : (
              filteredArtists.map((art) => (
                <div
                  key={art.id}
                  className="p-3.5 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onArtistClick?.(art)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <img
                      src={art.photo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=150'}
                      alt={art.name}
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-[#6600FF]/20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-extrabold text-sm text-[#17131D] dark:text-white truncate">
                          {art.name}
                        </p>
                        {art.is_verified && (
                          <BadgeCheck className="w-4 h-4 text-[#6600FF] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {art.city || 'Côte d’Ivoire'} · {art.genres?.join(', ') || 'Afro'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFollowArtist(art.id)}
                    className="px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                  >
                    Abonné
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ONGLET 3 : ORGANISATIONS SUIVIES */}
        {activeTab === 'organizations' && (
          <div className="space-y-3">
            {filteredOrgs.length === 0 ? (
              <EmptyState
                title={query ? 'Aucun organisateur trouvé' : 'Aucun organisateur suivi'}
                description={
                  query
                    ? 'Aucun organisateur ne correspond à votre filtre'
                    : 'Suivez vos clubs, festivals et agences événementielles pour être les premiers informés'
                }
                icon={<Building2 className="w-12 h-12 text-[#6600FF]/40" />}
              />
            ) : (
              filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="p-3.5 rounded-3xl bg-white dark:bg-[#1A1829] border border-black/[0.05] dark:border-white/[0.08] shadow-xs flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onOrganizationClick?.(org)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left"
                  >
                    <div className="w-13 h-13 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center overflow-hidden shrink-0">
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-extrabold text-sm text-[#17131D] dark:text-white truncate">
                          {org.name}
                        </p>
                        {org.verification_status === 'verified' && (
                          <BadgeCheck className="w-4 h-4 text-[#6600FF] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {org.city || 'Abidjan'} · {org.events_count || 0} événements
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFollowOrg(org.id)}
                    className="px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
                  >
                    Abonné
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
