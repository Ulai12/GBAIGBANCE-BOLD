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
    <div className="relative">
      <div className="h-32 bg-gradient-to-br from-[#6600FF] via-[#7C3AED] to-[#A885FF] rounded-b-[2.5rem]" />
      <div className="px-5 -mt-16">
        <div className="relative inline-block">
          <div className="w-28 h-28 rounded-full ring-4 ring-white overflow-hidden bg-white">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-extrabold text-[#6600FF]">{profile.name.charAt(0).toUpperCase()}</div>}
          </div>
          <div className="absolute bottom-1 right-1 bg-[#6600FF] rounded-full p-1"><BadgeCheck className="w-5 h-5 text-white" /></div>
        </div>
        <div className="mt-3">
          <h1 className="text-2xl font-extrabold text-[#1A1A2E]">{profile.name}</h1>
          <p className="flex items-center gap-1 text-sm text-gray-500 mt-1"><MapPin className="w-4 h-4" />{flag} {profile.city}</p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-[#6600FF]/10 text-[#6600FF]">{t('common', profile.role)}</span>
        </div>
        {profile.bio && <p className="mt-4 text-sm text-gray-600 leading-relaxed">{profile.bio}</p>}
        {(eventsCount !== undefined || followersCount !== undefined || followingCount !== undefined) && (
          <div className="flex gap-6 mt-4">
            {eventsCount !== undefined && <div><span className="text-xl font-extrabold text-[#1A1A2E]">{eventsCount}</span><p className="text-xs text-gray-500">événements</p></div>}
            {followersCount !== undefined && <div><span className="text-xl font-extrabold text-[#1A1A2E]">{followersCount}</span><p className="text-xs text-gray-500">followers</p></div>}
            {followingCount !== undefined && <div><span className="text-xl font-extrabold text-[#1A1A2E]">{followingCount}</span><p className="text-xs text-gray-500">abonnements</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
