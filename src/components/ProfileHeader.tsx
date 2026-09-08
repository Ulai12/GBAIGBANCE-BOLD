import { BadgeCheck, MapPin } from 'lucide-react';
import type { Profile } from '@/types';
import { COUNTRY_FLAGS } from '@/constants';
import { useApp } from '@/hooks/useApp';

interface ProfileHeaderProps {
  profile: Profile;
  eventsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export function ProfileHeader({ profile, eventsCount, followersCount, followingCount }: ProfileHeaderProps) {
  const { t } = useApp();
  const flag = COUNTRY_FLAGS[profile.country] || '';

  return (
    <div className="relative px-4 pt-10 pb-4">
      <div className="relative glass-surface rounded-[2rem] p-6 pt-14 shadow-[0_18px_42px_rgba(76,29,149,0.12)]">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full ring-4 ring-white/90 dark:ring-[#1A1A2E] shadow-lg overflow-hidden glass-surface">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#6600FF] bg-[#6600FF]/10">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {profile.role !== 'participant' && (
            <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-1 ring-2 ring-white dark:ring-[#1A1A2E] shadow">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-[#171726] dark:text-white tracking-tight">
            {profile.name}
          </h1>
          <p className="flex items-center justify-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            {flag} {profile.city}
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold glass-surface text-[#6600FF] dark:text-[#8a42ff]">
            {t('common', profile.role)}
          </span>
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed px-2">
            {profile.bio}
          </p>
        )}

        {(eventsCount !== undefined || followersCount !== undefined || followingCount !== undefined) && (
          <div className="flex justify-center gap-8 mt-5 pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
            {eventsCount !== undefined && (
              <div className="text-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{eventsCount}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">événements</p>
              </div>
            )}
            {followersCount !== undefined && (
              <div className="text-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{followersCount}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">followers</p>
              </div>
            )}
            {followingCount !== undefined && (
              <div className="text-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{followingCount}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">abonnements</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
