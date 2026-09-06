import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/services/supabase';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { SearchBar } from '@/components/SearchBar';
import type { Event } from '@/types';

interface FavoritesScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
}

export function FavoritesScreen({ onEventClick, onLogin }: FavoritesScreenProps) {
  const { session, user } = useApp();
  const [favorites, setFavorites] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from('events').select('*, event_likes!inner(user_id)').eq('event_likes.user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { setFavorites((data as Event[]) || []); setLoading(false); });
  }, [user]);
  if (!session) {
    return (
      <div className="min-h-screen bg-[#EDE8FF] flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-20 h-20 rounded-full bg-[#6600FF]/10 flex items-center justify-center mb-5"><Heart className="w-10 h-10 text-[#6600FF]" /></div>
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Vos favoris</h1>
        <p className="text-gray-500 text-center text-sm mb-6 max-w-xs">Connectez-vous pour retrouver les événements que vous avez aimés</p>
        <button onClick={onLogin} className="btn-purple px-8 py-3">Se connecter</button>
      </div>
    );
  }
  const filtered = query ? favorites.filter((e) => e.title.toLowerCase().includes(query.toLowerCase())) : favorites;
  return (
    <div className="min-h-screen bg-[#EDE8FF] pb-32">
      <div className="px-5 pt-8 pb-5"><p className="text-xs uppercase tracking-[0.16em] text-[#6600FF] font-bold">Votre sélection</p><h1 className="mt-1 text-3xl font-extrabold text-[#171726] tracking-tight">Favoris</h1><p className="text-sm text-gray-500 mt-1">{favorites.length} événement{favorites.length > 1 ? 's' : ''} aimé{favorites.length > 1 ? 's' : ''}</p></div>
      {favorites.length > 0 && (<div className="px-5 mb-5"><SearchBar value={query} onChange={setQuery} placeholder="Rechercher dans vos favoris..." /></div>)}
      <div className="px-5 mt-2">
        {loading ? (<div className="grid grid-cols-2 gap-4">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}</div>) : filtered.length === 0 ? (
          <div className="mt-10"><EmptyState title={query ? "Aucun résultat" : "Aucun favori"} description={query ? "Essayez un autre mot-clé" : "Touchez le cœur sur un événement pour l'ajouter ici"} icon={<Heart className="w-12 h-12 text-[#6600FF]/30" />} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">{filtered.map((event) => (<EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />))}</div>
        )}
      </div>
    </div>
  );
}
