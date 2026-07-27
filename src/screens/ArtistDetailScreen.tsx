import { useState, useEffect } from 'react';
import { ChevronLeft, BadgeCheck, Music2, Calendar, Share2, Heart, Eye, Flame, TrendingUp } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useApp } from '@/hooks/useApp';
import { fetchArtistById, fetchEventsByArtist, toggleArtistFollow, fetchArtistStats, isFollowingArtist } from '@/services/events';
import { formatNumber } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import type { Artist, Event } from '@/types';
import type { ToastData } from '@/components/Toast';

interface ArtistDetailScreenProps {
  artist: Artist;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function ArtistDetailScreen({ artist, onBack, onEventClick, onToast }: ArtistDetailScreenProps) {
  const { language, user, t } = useApp();
  const [fullArtist, setFullArtist] = useState<Artist>(artist);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  useEffect(() => {
    fetchArtistById(artist.id).then((data) => { if (data) setFullArtist(data); });
    fetchEventsByArtist(artist.id).then(setEvents).finally(() => setLoading(false));
    if (user) isFollowingArtist(artist.id, user.id).then(setFollowing);
  }, [artist.id, user]);
  const handleFollow = async () => {
    if (!user) { onToast({ message: 'Connectez-vous pour suivre', type: 'info' }); return; }
    try { const isFollowing = await toggleArtistFollow(artist.id, user.id); setFollowing(isFollowing); onToast({ message: isFollowing ? 'Abonné' : 'Désabonné', type: 'success' }); } catch { onToast({ message: 'Erreur', type: 'error' }); }
  };
  const flag = COUNTRY_FLAGS[fullArtist.country] || '';
  return (
    <div className="min-h-screen pb-32 bg-[#EDE8FF]">
      <div className="relative h-64"><img src={fullArtist.cover_url || fullArtist.photo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800'} alt={fullArtist.name} className="w-full h-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#EDE8FF] via-transparent to-black/30" /><button onClick={onBack} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md"><ChevronLeft className="w-5 h-5 text-[#1A1A2E]" /></button><button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md"><Share2 className="w-5 h-5 text-[#1A1A2E]" /></button></div>
      <div className="max-w-md mx-auto px-5 -mt-16 relative"><div className="flex items-end gap-4"><div className="relative"><img src={fullArtist.photo_url || ''} alt={fullArtist.name} className="w-28 h-28 rounded-full object-cover ring-4 ring-white" />{fullArtist.is_verified && <div className="absolute bottom-1 right-1 bg-[#6600FF] rounded-full p-1"><BadgeCheck className="w-5 h-5 text-white" /></div>}</div><div className="flex-1 pb-2"><h1 className="text-2xl font-extrabold text-[#1A1A2E]">{fullArtist.name}</h1><p className="text-sm text-gray-500">{flag} {fullArtist.city}</p></div></div>
        <div className="grid grid-cols-3 gap-3 mt-4"><div className="card p-3 text-center"><Heart className="w-4 h-4 text-[#6600FF] mx-auto mb-1" /><p className="text-lg font-extrabold text-[#1A1A2E] animate-pop">{formatNumber(fullArtist.followers_count, language)}</p><p className="text-[10px] text-gray-500">Followers</p></div><div className="card p-3 text-center"><Calendar className="w-4 h-4 text-[#6600FF] mx-auto mb-1" /><p className="text-lg font-extrabold text-[#1A1A2E] animate-pop">{formatNumber(fullArtist.events_count, language)}</p><p className="text-[10px] text-gray-500">Événements</p></div><div className="card p-3 text-center"><Eye className="w-4 h-4 text-[#6600FF] mx-auto mb-1" /><p className="text-lg font-extrabold text-[#1A1A2E] animate-pop">{formatNumber(events.reduce((s, e) => s + e.views_count, 0), language)}</p><p className="text-[10px] text-gray-500">Vues</p></div></div>
        {fullArtist.genres.length > 0 && (<div className="flex flex-wrap gap-2 mt-4">{fullArtist.genres.map((genre) => (<span key={genre} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-white text-gray-700"><Music2 className="w-3.5 h-3.5 text-[#6600FF]" />{genre}</span>))}</div>)}
        <button onClick={handleFollow} className={`w-full mt-6 py-3.5 rounded-full font-bold transition-all ${following ? 'bg-white text-[#6600FF] shadow-sm' : 'btn-purple'}`}>{following ? 'Abonné' : 'Suivre'}</button>
        {fullArtist.bio && (<div className="mt-6"><h2 className="text-lg font-bold text-[#1A1A2E] mb-2">Biographie</h2><p className="text-sm text-gray-600 leading-relaxed">{fullArtist.bio}</p></div>)}
        <div className="mt-8"><h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A2E] mb-4"><Calendar className="w-5 h-5 text-[#6600FF]" /> Événements</h2>{loading ? (<div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => (<div key={i} className="card overflow-hidden"><Skeleton className="rounded-none h-32 w-full" /><div className="p-3 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>))}</div>) : events.length === 0 ? (<EmptyState title="Aucun événement" description="Cet artiste n'a pas d'événements à venir" />) : (<div className="grid grid-cols-2 gap-4">{events.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}</div>
      </div>
    </div>
  );
}
