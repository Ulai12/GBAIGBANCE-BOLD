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
    <div className="relative px-5 pt-14 pb-4">
      <div className="relative bg-white dark:bg-[#1A1A2E] rounded-[2rem] p-6 pt-14 shadow-sm border border-black/5 dark:border-white/5">
        
        {/* Avatar avec gestion des bordures selon le thème du fond global */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <div className="w-24 h-24 rounded-full ring-4 ring-gray-50 dark:ring-[#0F0F1A] overflow-hidden bg-white dark:bg-[#1A1A2E]">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#6600FF] bg-[#6600FF]/10 dark:bg-[#6600FF]/20">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {profile.role !== 'participant' && (
            <div className="absolute bottom-0 right-0 bg-[#6600FF] rounded-full p-1 ring-4 ring-gray-50 dark:ring-[#0F0F1A]">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Informations principales */}
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white tracking-tight">
            {profile.name}
          </h1>
          <p className="flex items-center justify-center gap-1.5 mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
            <MapPin className="w-3.5 h-3.5" />
            {flag} {profile.city}
          </p>
          <span className="inline-block mt-3 px-3.5 py-1 rounded-full text-xs font-bold bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#9966FF]">
            {t('common', profile.role)}
          </span>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center leading-relaxed px-2">
            {profile.bio}
          </p>
        )}

        {/* Statistiques (affichage conditionnel optimisé) */}
        {(eventsCount !== undefined || followersCount !== undefined || followingCount !== undefined) && (
          <div className="flex justify-center gap-8 mt-6 pt-5 border-t border-gray-100 dark:border-white/10">
            {eventsCount !== undefined && (
              <div className="text-center">
                <span className="block text-lg font-extrabold text-[#1A1A2E] dark:text-white">{eventsCount}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{t('common', 'events')}</span>
              </div>
            )}
            {followersCount !== undefined && (
              <div className="text-center">
                <span className="block text-lg font-extrabold text-[#1A1A2E] dark:text-white">{followersCount}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{t('common', 'followers')}</span>
              </div>
            )}
            {followingCount !== undefined && (
              <div className="text-center">
                <span className="block text-lg font-extrabold text-[#1A1A2E] dark:text-white">{followingCount}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{t('common', 'following')}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
