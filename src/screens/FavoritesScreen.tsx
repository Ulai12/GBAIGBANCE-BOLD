import { useState, useEffect, useMemo } from 'react';
import { Heart, Music2, Building2, Search, X, BadgeCheck } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { supabase } from '@/services/supabase';
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

export function FavoritesScreen({
  onEventClick,
  onLogin,
  onArtistClick,
  onOrganizationClick,
}: FavoritesScreenProps) {
  const { session } = useApp();
  const { likedEventIds, followedArtistIds, followedOrgIds, toggleFollowArtist, toggleFollowOrg } = useFavorites();

  const [activeTab, setActiveTab] = useState<FavTab>('events');
  const [query, setQuery] = useState('');

  // Data states
  const [events, setEvents] = useState<Event[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les événements favoris
  useEffect(() => {
    let isCancelled = false;
    async function loadFavoriteEvents() {
      if (likedEventIds.size === 0) {
        setEvents([]);
        return;
      }
      try {
        const ids = Array.from(likedEventIds);
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .in('id', ids);

        if (!error && data && !isCancelled) {
          setEvents(data as Event[]);
        }
      } catch {
        // Ignorer erreur réseau
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
      setLoading(true);
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
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadFollowedEntities();
    return () => {
      isCancelled = true;
    };
  }, [followedArtistIds, followedOrgIds]);

  // Filtrage
  const filteredEvents = useMemo(() => {
    const list = events.filter((e) => likedEventIds.has(e.id));
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((e) => e.title.toLowerCase().includes(q) || e.location_name?.toLowerCase().includes(q));
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

      {/* Segmented Control iOS */}
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
      <div className="px-5 mt-5">
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
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                title={query ? 'Aucun événement correspondant' : 'Aucun événement aimé'}
                description={
                  query
                    ? 'Essayez avec un autre terme de recherche'
                    : 'Touchez le cœur sur une affiche ou carte pour retrouver vos événements préférés ici'
                }
                icon={<Heart className="w-12 h-12 text-[#6600FF]/40" />}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
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
