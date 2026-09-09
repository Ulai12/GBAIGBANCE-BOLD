import { useState, useEffect } from 'react';
import { ChevronLeft, Music2, Building2, Users, BadgeCheck, Heart } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchFollowedArtists, fetchFollowedOrganizations, fetchFollowingUsers } from '@/services/events';
import { ArtistCard } from '@/components/ArtistCard';
import { OrganizerCard } from '@/components/OrganizerCard';
import { SubscriptionsScreenSkeleton } from '@/components/Skeleton';
import type { Artist, Organization, Profile } from '@/types';

interface SubscriptionsScreenProps {
  onBack: () => void;
  onArtistClick: (artist: Artist) => void;
  onOrganizationClick: (org: Organization) => void;
  onUserClick: (profile: Profile) => void;
}
type Tab = 'artists' | 'organizers' | 'users';

let cachedSubscriptions: {
  userId: string;
  artists: Artist[];
  orgs: Organization[];
  users: Profile[];
} | null = null;

export function SubscriptionsScreen({
  onBack,
  onArtistClick,
  onOrganizationClick,
  onUserClick,
}: SubscriptionsScreenProps) {
  const { user, t } = useApp();
  const [tab, setTab] = useState<Tab>('artists');

  const hasCache = cachedSubscriptions && cachedSubscriptions.userId === user?.id;
  const [artists, setArtists] = useState<Artist[]>(() => hasCache ? cachedSubscriptions!.artists : []);
  const [orgs, setOrgs] = useState<Organization[]>(() => hasCache ? cachedSubscriptions!.orgs : []);
  const [users, setUsers] = useState<Profile[]>(() => hasCache ? cachedSubscriptions!.users : []);
  const [loading, setLoading] = useState(!hasCache);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchFollowedArtists(user.id),
      fetchFollowedOrganizations(user.id),
      fetchFollowingUsers(user.id),
    ])
      .then(([a, o, u]) => {
        setArtists(a);
        setOrgs(o);
        setUsers(u);
        cachedSubscriptions = {
          userId: user.id,
          artists: a,
          orgs: o,
          users: u,
        };
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading && !hasCache) {
    return <SubscriptionsScreenSkeleton />;
  }

  const tabs: { id: Tab; labelKey: string; icon: typeof Music2; count: number }[] = [
    { id: 'artists', labelKey: 'artists', icon: Music2, count: artists.length },
    { id: 'organizers', labelKey: 'organizers', icon: Building2, count: orgs.length },
    { id: 'users', labelKey: 'users', icon: Users, count: users.length },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <div className="sticky top-0 z-20 bg-white/85 dark:bg-[#14121E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3">
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

        <div className="max-w-md mx-auto px-5 pb-3 flex gap-2">
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
                {t('settings', `subscriptions.${tb.labelKey}`)}
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

      <div className="max-w-md mx-auto px-5 py-4 pb-32">
        {tab === 'artists' ? (
          artists.length === 0 ? (
            <EmptyState
              icon={Music2}
              title={t('settings', 'subscriptions.noArtists')}
              description={t('settings', 'subscriptions.noArtistsDesc')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-3">
              {orgs.map((org) => (
                <OrganizerCard key={org.id} organization={org} onClick={() => onOrganizationClick(org)} />
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
          <div className="space-y-2">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => onUserClick(u)}
                className="w-full card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all text-left"
              >
                <img
                  src={u.avatar_url || `https://i.pravatar.cc/100?u=${u.id}`}
                  alt={u.name}
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{u.name}</p>
                    {(u.role === 'organizer' || u.role === 'artist') && (
                      <BadgeCheck className="w-4 h-4 text-[#6600FF] dark:text-[#A78BFA] shrink-0" />
                    )}
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
