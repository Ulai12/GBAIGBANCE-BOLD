import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, Music2, Building2, Users, Heart, LogIn, Sparkles, UserCheck } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { supabase } from '@/services/supabase';
import {
  fetchFollowedArtists,
  fetchFollowedOrganizations,
  fetchFollowingUsers,
  fetchFollowersUsers,
  isRealArtist,
  isRealOrganization,
  isRealProfile,
} from '@/services/events';
import {
  getCachedSubscriptionsMemory,
  setCachedSubscriptionsMemory,
  clearCachedSubscriptions,
} from '@/services/cache';
import { ArtistCard } from '@/components/ArtistCard';
import { OrganizerCard } from '@/components/OrganizerCard';
import { SubscriptionsScreenSkeleton } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import type { Artist, Organization, Profile } from '@/types';

export { clearCachedSubscriptions };

interface SubscriptionsScreenProps {
  onBack: () => void;
  onArtistClick: (artist: Artist) => void;
  onOrganizationClick: (org: Organization) => void;
  onUserClick: (profile: Profile) => void;
  onLogin?: () => void;
  initialTab?: 'artists' | 'organizers' | 'users' | 'followers';
}
type Tab = 'artists' | 'organizers' | 'users' | 'followers';

export function SubscriptionsScreen({
  onBack,
  onArtistClick,
  onOrganizationClick,
  onUserClick,
  onLogin,
  initialTab,
}: SubscriptionsScreenProps) {
  const { user, t } = useApp();
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as Tab | null;
  const { followedArtistIds, followedOrgIds, followedUserIds } = useFavorites();
  const [tab, setTab] = useState<Tab>(() => queryTab || initialTab || 'artists');

  const cachedSub = user ? getCachedSubscriptionsMemory(user.id) : null;
  const hasCache = Boolean(cachedSub);
  const [artists, setArtists] = useState<Artist[]>(() => (hasCache ? cachedSub!.artists : []));
  const [orgs, setOrgs] = useState<Organization[]>(() => (hasCache ? cachedSub!.orgs : []));
  const [users, setUsers] = useState<Profile[]>(() => (hasCache ? cachedSub!.users : []));
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(!hasCache);

  useEffect(() => {
    if (queryTab) {
      setTab(queryTab);
    }
  }, [queryTab]);

  useEffect(() => {
    const handleSignedOut = () => {
      clearCachedSubscriptions();
      setArtists([]);
      setOrgs([]);
      setUsers([]);
      setFollowers([]);
      setLoading(false);
    };
    window.addEventListener('gba-user-signed-out', handleSignedOut);
    return () => {
      window.removeEventListener('gba-user-signed-out', handleSignedOut);
    };
  }, []);

  const refreshSubscriptions = useCallback(() => {
    if (!user) {
      const artIds = Array.from(followedArtistIds);
      const orgIds = Array.from(followedOrgIds);
      const uIds = Array.from(followedUserIds);
      if (artIds.length === 0 && orgIds.length === 0 && uIds.length === 0) {
        setArtists([]);
        setOrgs([]);
        setUsers([]);
        setFollowers([]);
        setLoading(false);
        return;
      }
      Promise.all([
        artIds.length > 0 ? supabase.from('artists').select('*').in('id', artIds) : Promise.resolve({ data: [] }),
        orgIds.length > 0 ? supabase.from('organizations').select('*').in('id', orgIds) : Promise.resolve({ data: [] }),
        uIds.length > 0 ? supabase.from('profiles').select('*').in('id', uIds) : Promise.resolve({ data: [] }),
      ])
        .then(([artRes, orgRes, uRes]) => {
          setArtists(((artRes.data as Artist[]) || []).filter(isRealArtist));
          setOrgs(((orgRes.data as Organization[]) || []).filter(isRealOrganization));
          setUsers(((uRes.data as Profile[]) || []).filter(isRealProfile));
        })
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([
      fetchFollowedArtists(user.id),
      fetchFollowedOrganizations(user.id),
      fetchFollowingUsers(user.id),
      fetchFollowersUsers(user.id),
    ])
      .then(([a, o, u, f]) => {
        const cleanA = a.filter(isRealArtist);
        const cleanO = o.filter(isRealOrganization);
        const cleanU = u.filter(isRealProfile);
        const cleanF = f.filter(isRealProfile);
        setArtists(cleanA);
        setOrgs(cleanO);
        setUsers(cleanU);
        setFollowers(cleanF);
        setCachedSubscriptionsMemory(user.id, {
          artists: cleanA,
          orgs: cleanO,
          users: cleanU,
        });
      })
      .finally(() => setLoading(false));
  }, [user, followedArtistIds, followedOrgIds, followedUserIds]);

  useEffect(() => {
    refreshSubscriptions();
  }, [refreshSubscriptions]);

  // Écoute des événements système de mise à jour des abonnements pour une synchronisation immédiate
  useEffect(() => {
    const handleFollowChange = () => {
      clearCachedSubscriptions();
      refreshSubscriptions();
    };
    window.addEventListener('gba-user-follow-changed', handleFollowChange);
    window.addEventListener('gba-follows-updated', handleFollowChange);
    return () => {
      window.removeEventListener('gba-user-follow-changed', handleFollowChange);
      window.removeEventListener('gba-follows-updated', handleFollowChange);
    };
  }, [refreshSubscriptions]);

  // Polling silencieux 3s max
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshSubscriptions();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshSubscriptions]);

  if (!user && artists.length === 0 && orgs.length === 0 && !loading) {
    return (
      <div className="min-h-screen pb-32">
        <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#14121E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
          <div className="max-w-md mx-auto px-5 pt-safe-header pb-4 flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A2E] dark:text-white" />
            </button>
            <h1 className="text-base font-black text-[#17131D] dark:text-white">Abonnements</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-[#17131D] dark:text-white mb-2">
            Vos abonnements & artistes suivis
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Connectez-vous pour retrouver et gérer tous vos artistes, organisateurs et profils suivis sur tous vos appareils.
          </p>
          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="px-6 py-3.5 rounded-full bg-[#6600FF] text-white font-black text-xs inline-flex items-center gap-2 shadow-md hover:bg-[#5200cc] transition-all"
            >
              <LogIn className="w-4 h-4" /> Se connecter à mon compte
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading && !hasCache) {
    return <SubscriptionsScreenSkeleton />;
  }

  const tabs: { id: Tab; label: string; icon: typeof Music2; count: number }[] = [
    { id: 'artists', label: t('settings', 'subscriptions.artists') || 'Artistes', icon: Music2, count: artists.length },
    { id: 'organizers', label: t('settings', 'subscriptions.organizers') || 'Organisateurs', icon: Building2, count: orgs.length },
    { id: 'users', label: t('settings', 'subscriptions.users') || 'Abonnements', icon: Users, count: users.length },
    { id: 'followers', label: 'Abonnés', icon: UserCheck, count: followers.length },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#14121E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 pt-safe-header pb-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5 text-[#1A1A2E] dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-[#6600FF] dark:text-[#A78BFA]" />
            <h1 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white">
              {t('settings', 'subscriptions.title')}
            </h1>
          </div>
        </div>

        {!user && (
          <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 pb-2">
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] text-xs font-semibold">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="flex-1">Abonnements enregistrés sur cet appareil.</span>
              {onLogin && (
                <button
                  type="button"
                  onClick={onLogin}
                  className="px-2.5 py-1 rounded-full bg-[#6600FF] text-white text-[10px] font-black shrink-0 hover:bg-[#5200cc]"
                >
                  Synchroniser
                </button>
              )}
            </div>
          </div>
        )}

        <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 pb-3 flex gap-2">
          {tabs.map((tb) => {
            const Icon = tb.icon;
            const isActive = tab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#6600FF] text-white shadow-xs'
                    : 'bg-white dark:bg-white/10 text-gray-500 dark:text-gray-400 border border-black/5 dark:border-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tb.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tb.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-3xl lg:max-w-5xl mx-auto px-5 py-4 pb-32">
        {tab === 'artists' ? (
          artists.length === 0 ? (
            <EmptyState
              icon={Music2}
              title={t('settings', 'subscriptions.noArtists')}
              description={t('settings', 'subscriptions.noArtistsDesc')}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} onClick={() => onArtistClick(artist)} />
              ))}
            </div>
          )
        ) : tab === 'organizers' ? (
          orgs.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t('settings', 'subscriptions.noOrganizers')}
              description={t('settings', 'subscriptions.noOrganizersDesc')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {orgs.map((org) => (
                <OrganizerCard key={org.id} organization={org} onClick={() => onOrganizationClick(org)} />
              ))}
            </div>
          )
        ) : tab === 'followers' ? (
          followers.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Aucun abonné pour le moment"
              description="Vos amis et d'autres membres apparaîtront ici dès qu'ils s'abonneront à votre profil."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {followers.map((f) => (
                <button
                  key={f.id}
                  onClick={() => onUserClick(f)}
                  className="w-full card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all text-left cursor-pointer"
                >
                  <UserAvatar
                    id={f.id}
                    src={f.avatar_url}
                    name={f.name}
                    role={f.role}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{f.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {f.city || 'Lomé'}
                      {f.bio ? ` · ${f.bio.slice(0, 40)}${f.bio.length > 40 ? '...' : ''}` : ''}
                    </p>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 rotate-180 shrink-0" />
                </button>
              ))}
            </div>
          )
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('settings', 'subscriptions.noUsers')}
            description={t('settings', 'subscriptions.noUsersDesc')}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => onUserClick(u)}
                className="w-full card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all text-left cursor-pointer"
              >
                <UserAvatar
                  id={u.id}
                  src={u.avatar_url}
                  name={u.name}
                  role={u.role}
                  size="md"
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{u.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {u.city}
                    {u.bio ? ` · ${u.bio.slice(0, 40)}${u.bio.length > 40 ? '...' : ''}` : ''}
                  </p>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-300 dark:text-gray-600 rotate-180 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: typeof Music2; title: string; description: string }) {
  return (<div className="flex flex-col items-center justify-center py-20"><div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4"><Icon className="w-10 h-10 text-gray-300" /></div><p className="text-base font-bold text-[#1A1A2E] mb-1">{title}</p><p className="text-sm text-gray-500 text-center max-w-xs">{description}</p></div>);
}
