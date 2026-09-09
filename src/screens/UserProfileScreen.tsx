import { useState, useEffect } from 'react';
import { ChevronLeft, MapPin, Calendar, BadgeCheck, Music2, Building2, User, Heart, MessageCircle, Ticket } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchProfileById, toggleUserFollow, isFollowingUser, fetchUserFollowersCount, fetchUserFollowingCount } from '@/services/events';
import { supabase } from '@/services/supabase';
import { formatRelativeDate, formatFullDate, formatNumber } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import { UserProfileScreenSkeleton } from '@/components/Skeleton';
import type { Profile, Event } from '@/types';
import type { ToastData } from '@/components/Toast';

interface UserProfileScreenProps { userId: string; onBack: () => void; onEventClick: (event: Event) => void; onToast: (toast: Omit<ToastData, 'id'>) => void; }

export function UserProfileScreen({ userId, onBack, onEventClick, onToast }: UserProfileScreenProps) {
  const { user: currentUser, t, language } = useApp();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  useEffect(() => {
    fetchProfileById(userId).then(setProfile).catch(() => onToast({ message: t('settings', 'userProfile.notFound'), type: 'error' })).finally(() => setLoading(false));
    if (currentUser) { isFollowingUser(currentUser.id, userId).then(setFollowing); fetchUserFollowersCount(userId).then(setFollowersCount); fetchUserFollowingCount(userId).then(setFollowingCount); }
    void (async () => {
      const { data } = await supabase.from('tickets').select('event:events(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(3);
      const events = ((data || []) as Array<{ event: Event | Event[] }>).flatMap((row) => Array.isArray(row.event) ? row.event : [row.event]).filter(Boolean);
      setRecentEvents(events);
    })();
  }, [userId, currentUser, onToast, t]);
  const handleFollow = async () => { if (!currentUser) { onToast({ message: t('settings', 'userProfile.loginToFollow'), type: 'info' }); return; } setToggling(true); try { const isNow = await toggleUserFollow(currentUser.id, userId); setFollowing(isNow); setFollowersCount((c) => c + (isNow ? 1 : -1)); onToast({ message: isNow ? t('settings', 'userProfile.following') : t('settings', 'userProfile.unfollowed'), type: isNow ? 'success' : 'info' }); } catch { onToast({ message: t('settings', 'userProfile.notFound'), type: 'error' }); } finally { setToggling(false); } };
  if (loading) { return <UserProfileScreenSkeleton />; }
  if (!profile) { return (<div className="min-h-screen bg-transparent flex flex-col items-center justify-center"><p className="text-sm text-gray-500 dark:text-gray-400">{t('settings', 'userProfile.notFound')}</p><button onClick={onBack} className="mt-4 text-sm font-semibold text-[#6600FF] dark:text-[#A78BFA]">{t('settings', 'userProfile.notFound')}</button></div>); }
  const isSelf = currentUser?.id === userId;
  const roleIcon = profile.role === 'artist' ? Music2 : profile.role === 'organizer' ? Building2 : User;
  const RoleIcon = roleIcon;
  return (
    <div className="min-h-screen pb-32">
      <div className="relative h-48 bg-gradient-to-br from-[#6600FF]/20 via-[#9D4EDD]/15 to-[#EDE8FF] dark:to-[#141022]"><div className="absolute top-4 left-0 right-0 px-5"><button onClick={onBack} className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur flex items-center justify-center shadow-md active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5 text-[#1A1A2E] dark:text-white" /></button></div></div>
      <div className="max-w-md mx-auto px-5 -mt-16 relative">
        <div className="flex flex-col items-center text-center"><img src={profile.avatar_url || `https://i.pravatar.cc/200?u=${profile.id}`} alt={profile.name} className="w-28 h-28 rounded-full object-cover border-4 border-white dark:border-[#14121E] shadow-lg" /><div className="flex items-center gap-1.5 mt-3"><h1 className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{profile.name}</h1>{(profile.role === 'organizer' || profile.role === 'artist') && <BadgeCheck className="w-5 h-5 text-[#6600FF] dark:text-[#A78BFA]" />}</div><div className="flex items-center gap-1.5 mt-1"><div className="w-7 h-7 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 flex items-center justify-center"><RoleIcon className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA]" /></div><span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{profile.role === 'artist' ? t('common', 'artist') : profile.role === 'organizer' ? t('common', 'organizer') : t('common', 'participant')}</span></div>{profile.city && (<div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400"><MapPin className="w-3.5 h-3.5" /><span>{COUNTRY_FLAGS[profile.country] || ''} {profile.city}, {profile.country}</span></div>)}</div>
        <div className="grid grid-cols-2 gap-3 mt-5"><div className="card p-3 text-center"><p className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{followingCount}</p><p className="text-xs text-gray-500 dark:text-gray-400">{t('settings', 'userProfile.followingCount')}</p></div><div className="card p-3 text-center"><p className="text-xl font-extrabold text-[#1A1A2E] dark:text-white">{followersCount}</p><p className="text-xs text-gray-500 dark:text-gray-400">{t('settings', 'userProfile.followers')}</p></div></div>
        {profile.bio && (<div className="card p-4 mt-4"><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">{t('settings', 'userProfile.bio')}</p><p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">{profile.bio}</p></div>)}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400"><Calendar className="w-3.5 h-3.5" /><span>{t('settings', 'userProfile.memberSince')} {formatRelativeDate(profile.created_at, language)}</span></div>
        {recentEvents.length > 0 && (<div className="mt-5"><h2 className="text-sm font-bold text-[#1A1A2E] dark:text-white mb-3 flex items-center gap-2"><Ticket className="w-4 h-4 text-[#6600FF] dark:text-[#A78BFA]" />{language === 'fr' ? 'Derniers événements' : 'Recent events'}</h2><div className="space-y-2">{recentEvents.map((ev) => (<button key={ev.id} onClick={() => onEventClick(ev)} className="w-full card p-3 flex items-center gap-3 hover:shadow-card-hover transition-all text-left"><img src={ev.cover_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=200'} alt={ev.title} className="w-14 h-14 rounded-xl object-cover shrink-0" /><div className="flex-1 min-w-0"><p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{ev.title}</p><p className="text-xs text-gray-500 dark:text-gray-400">{formatFullDate(ev.starts_at, language)} · {ev.city}</p></div><div className="flex items-center gap-1 text-xs text-gray-400"><Heart className="w-3 h-3" />{formatNumber(ev.likes_count, language)}</div></button>))}</div></div>)}
        {!isSelf && (<div className="flex gap-3 mt-5"><button onClick={handleFollow} disabled={toggling} className={`flex-1 py-3.5 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${following ? 'bg-white dark:bg-white/10 text-[#6600FF] dark:text-white border-2 border-[#6600FF]' : 'btn-purple'}`}><Heart className={`w-4 h-4 ${following ? 'fill-[#6600FF] dark:fill-white' : ''}`} />{following ? t('settings', 'userProfile.following') : t('settings', 'userProfile.follow')}</button><button className="w-14 h-14 rounded-full bg-white dark:bg-white/10 shadow-md flex items-center justify-center active:scale-90 transition-transform"><MessageCircle className="w-5 h-5 text-[#6600FF] dark:text-[#A78BFA]" /></button></div>)}
      </div>
    </div>
  );
}
