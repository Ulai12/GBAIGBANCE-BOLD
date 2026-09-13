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
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { supabase } from '@/services/supabase';
import { getCachedHomeData } from '@/services/cache';
import { isEventTerminated } from '@/services/events';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import type { Event, Artist, Organization, Profile } from '@/types';

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
  const found: Organization[] = [];
  if (home && home.organizations) {
    found.push(...home.organizations.filter((o) => orgIds.has(o.id)));
  }
  return found;
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

  // Charger les artistes et organisations suivis avec leurs vrais comptes
  useEffect(() => {
    let isCancelled = false;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    async function loadFollowedEntities() {
      try {
        // --- 1. CHARGEMENT DES ARTISTES SUIVIS ---
        if (followedArtistIds.size > 0) {
          const rawArtistIds = Array.from(followedArtistIds);
          const validUuids = rawArtistIds.filter((id) => UUID_REGEX.test(id));
          const loadedArtists: Artist[] = [];
          const foundIds = new Set<string>();

          // a) Recherche dans la table artists (UUIDs valides uniquement)
          if (validUuids.length > 0) {
            const { data: artData } = await supabase
              .from('artists')
              .select('*')
              .in('id', validUuids);
            if (artData && artData.length > 0) {
              (artData as Artist[]).forEach((a) => {
                loadedArtists.push(a);
                foundIds.add(a.id);
              });
            }
          }

          // b) Recherche dans les profiles pour les profils créateurs/artistes
          const missingForProfiles = rawArtistIds.filter((id) => !foundIds.has(id) && UUID_REGEX.test(id));
          if (missingForProfiles.length > 0) {
            const { data: profileArts } = await supabase
              .from('profiles')
              .select('*')
              .in('id', missingForProfiles)
              .eq('role', 'artist');
            if (profileArts && profileArts.length > 0) {
              (profileArts as unknown as Profile[]).forEach((p) => {
                loadedArtists.push({
                  id: p.id,
                  user_id: p.id,
                  name: p.name || 'Artiste Gbaïgbancê',
                  bio: p.bio || 'Artiste de la communauté',
                  photo_url: p.avatar_url || null,
                  cover_url: '',
                  genres: ['Afrobeats', 'Live'],
                  city: p.city || 'Lomé',
                  country: p.country || 'TG',
                  followers_count: 1,
                  events_count: 0,
                  is_verified: true,
                  created_at: p.created_at || new Date().toISOString(),
                });
                foundIds.add(p.id);
              });
            }
          }

          // c) Recherche dans le cache local (pour les artistes mis en avant)
          const cachedArtists = getCachedHomeData().data?.artists || [];
          cachedArtists.forEach((ca) => {
            if (followedArtistIds.has(ca.id) && !foundIds.has(ca.id)) {
              loadedArtists.push(ca);
              foundIds.add(ca.id);
            }
          });

          // d) Récupération du nombre RÉEL de followers depuis artist_follows pour chaque artiste
          const enrichedArtists = await Promise.all(
            loadedArtists.map(async (art) => {
              if (UUID_REGEX.test(art.id)) {
                try {
                  const { count } = await supabase
                    .from('artist_follows')
                    .select('id', { count: 'exact', head: true })
                    .eq('artist_id', art.id);
                  const realCount = typeof count === 'number' && count > 0 ? count : (art.followers_count || 1);
                  return { ...art, followers_count: realCount };
                } catch {
                  return { ...art, followers_count: Math.max(1, art.followers_count || 1) };
                }
              }
              return { ...art, followers_count: Math.max(1, art.followers_count || 1) };
            })
          );

          if (!isCancelled) {
            setArtists(enrichedArtists);
          }
        } else {
          if (!isCancelled) setArtists([]);
        }

        // --- 2. CHARGEMENT DES ORGANISATIONS SUIVIES ---
        if (followedOrgIds.size > 0) {
          const rawOrgIds = Array.from(followedOrgIds);
          const validOrgUuids = rawOrgIds.filter((id) => UUID_REGEX.test(id));
          const loadedOrgs: Organization[] = [];
          const foundIds = new Set<string>();

          // a) Recherche dans la table organizations
          if (validOrgUuids.length > 0) {
            const { data: orgData } = await supabase
              .from('organizations')
              .select('*')
              .in('id', validOrgUuids);
            if (orgData && orgData.length > 0) {
              (orgData as Organization[]).forEach((o) => {
                loadedOrgs.push(o);
                foundIds.add(o.id);
              });
            }
          }

          // b) Recherche dans profiles pour les comptes organisateurs
          const missingOrgUuids = rawOrgIds.filter((id) => !foundIds.has(id) && UUID_REGEX.test(id));
          if (missingOrgUuids.length > 0) {
            const { data: profileOrgs } = await supabase
              .from('profiles')
              .select('*')
              .in('id', missingOrgUuids)
              .eq('role', 'organizer');

            if (profileOrgs && profileOrgs.length > 0) {
              (profileOrgs as unknown as Profile[]).forEach((p) => {
                loadedOrgs.push({
                  id: p.id,
                  owner_id: p.id,
                  name: p.name || 'Organisateur',
                  description: p.bio || 'Organisateur sur Gbaïgbancê',
                  logo_url: p.avatar_url || null,
                  cover_url: null,
                  city: p.city || 'Lomé',
                  country: p.country || 'TG',
                  verification_status: 'verified',
                  followers_count: 1,
                  events_count: 0,
                  created_at: p.created_at || new Date().toISOString(),
                });
                foundIds.add(p.id);
              });
            }
          }

          // c) Recherche dans le cache local
          const cachedOrgs = getCachedHomeData().data?.organizations || [];
          cachedOrgs.forEach((co) => {
            if (followedOrgIds.has(co.id) && !foundIds.has(co.id)) {
              loadedOrgs.push(co);
              foundIds.add(co.id);
            }
          });

          // d) Récupération du nombre RÉEL de followers depuis organization_follows
          const enrichedOrgs = await Promise.all(
            loadedOrgs.map(async (org) => {
              if (UUID_REGEX.test(org.id)) {
                try {
                  const { count } = await supabase
                    .from('organization_follows')
                    .select('id', { count: 'exact', head: true })
                    .eq('organization_id', org.id);
                  const realCount = typeof count === 'number' && count > 0 ? count : (org.followers_count || 1);
                  return { ...org, followers_count: realCount };
                } catch {
                  return { ...org, followers_count: Math.max(1, org.followers_count || 1) };
                }
              }
              return { ...org, followers_count: Math.max(1, org.followers_count || 1) };
            })
          );

          if (!isCancelled) {
            setOrganizations(enrichedOrgs);
          }
        } else {
          if (!isCancelled) setOrganizations([]);
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

      {/* Segmented Control iOS Principal - Texte entier lisible sans troncature */}
      <div className="px-5 mt-4">
        <div className="p-1 bg-black/[0.05] dark:bg-white/[0.08] backdrop-blur-md rounded-2xl flex items-center gap-1 border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex-1 min-w-[124px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'events'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'events' ? 'fill-current text-red-500 dark:text-white' : ''}`} />
            <span className="font-extrabold">Événements</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'events'
                ? 'bg-black/5 dark:bg-white/20 text-[#17131D] dark:text-white'
                : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
            }`}>
              {likedEventIds.size}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('artists')}
            className={`flex-1 min-w-[108px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'artists'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Music2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold">Artistes</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'artists'
                ? 'bg-black/5 dark:bg-white/20 text-[#17131D] dark:text-white'
                : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
            }`}>
              {followedArtistIds.size}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('organizations')}
            className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'organizations'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="font-extrabold">Organisateurs</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'organizations'
                ? 'bg-black/5 dark:bg-white/20 text-[#17131D] dark:text-white'
                : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400'
            }`}>
              {followedOrgIds.size}
            </span>
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
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#6600FF]/20 shrink-0"
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
                        {art.city || 'Lomé'} · {art.followers_count ?? 1} {(art.followers_count ?? 1) > 1 ? 'abonnés' : 'abonné'} · {art.genres?.slice(0, 2).join(', ') || 'Afro'}
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
                    <div className="w-14 h-14 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center overflow-hidden shrink-0">
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
                        {org.city || 'Lomé'} · {org.followers_count ?? 1} {(org.followers_count ?? 1) > 1 ? 'abonnés' : 'abonné'} · {org.events_count || 0} événement{(org.events_count || 0) > 1 ? 's' : ''}
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
