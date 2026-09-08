import { useState, useEffect } from 'react';
import { Moon, Sun, Globe, LogOut, Calendar, Settings, BadgeCheck, Music2, ChevronRight, Building2, Mail, Check, X, Loader2, Bell, Pencil, BellRing, Heart } from 'lucide-react';
import { ProfileHeader } from '@/components/ProfileHeader';
import { EventCard } from '@/components/EventCard';
import { EditProfileModal } from '@/components/EditProfileModal';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/services/supabase';
import { fetchPendingInvitations, respondToInvitation } from '@/services/events';
import type { Event, EventCollaborator } from '@/types';
import type { ToastData } from '@/components/Toast';

interface ProfileScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
  onOrganizerDashboard: () => void;
  onOpenNotifications: () => void;
  onOpenNotificationSettings: () => void;
  onOpenSubscriptions: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function ProfileScreen({ onEventClick, onLogin, onOrganizerDashboard, onOpenNotifications, onOpenNotificationSettings, onOpenSubscriptions, onToast }: ProfileScreenProps) {
  const { user, session, theme, toggleTheme, language, setLanguage, signOut, t, refreshProfile } = useApp();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<(EventCollaborator & { event?: Event })[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.from('events').select('*').eq('organizer_user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => { setMyEvents((data as Event[]) || []); setLoading(false); });
    fetchPendingInvitations(user.id).then(setInvitations).catch(() => setInvitations([]));
  }, [user]);

  const handleRespond = async (invId: string, status: 'accepted' | 'declined') => {
    setResponding(invId);
    try { await respondToInvitation(invId, status); setInvitations(invitations.filter((i) => i.id !== invId)); refreshProfile(); } catch { onToast({ message: 'Impossible de répondre à l’invitation.', type: 'error' }); } finally { setResponding(null); }
  };

  if (!session || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-24 h-24 rounded-full bg-[#6600FF]/10 flex items-center justify-center mb-6"><Calendar className="w-12 h-12 text-[#6600FF]" /></div>
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] mb-2">Bienvenue sur Gbaigbance</h1>
        <p className="text-gray-500 text-center mb-8 max-w-xs">Connectez-vous pour réserver vos billets, suivre vos artistes et créer vos événements</p>
        <button onClick={onLogin} className="btn-purple px-8 py-3.5 max-w-xs w-full">Se connecter</button>
      </div>
    );
  }

  const isCreator = user.role === 'organizer' || user.role === 'artist';

  return (
    <div className="min-h-screen pb-32">
      <div className="max-w-md mx-auto">
        <ProfileHeader profile={user!} eventsCount={myEvents.length} />
        <div className="px-5 mt-3"><button onClick={() => setEditOpen(true)} className="w-full card p-4 flex items-center justify-between hover:shadow-card-hover transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center"><Pencil className="w-5 h-5 text-[#6600FF]" /></div><div className="text-left"><p className="font-bold text-[#171726]">Modifier le profil</p><p className="text-xs text-gray-500">Nom, photo, bio, localisation</p></div></div><ChevronRight className="w-5 h-5 text-gray-400" /></button></div>
        <div className="px-5 mt-3"><div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-surface">{user.role === 'artist' ? <Music2 className="w-4 h-4 text-[#6600FF]" /> : <Building2 className="w-4 h-4 text-[#6600FF]" />}<span className="text-sm font-semibold text-[#171726]">{user.role === 'artist' ? 'Artiste' : user.role === 'organizer' ? 'Organisateur' : 'Participant'}</span>{user.role !== 'participant' && <BadgeCheck className="w-4 h-4 text-[#6600FF]" />}</div></div>
        {invitations.length > 0 && (<div className="px-5 mt-6"><h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase mb-3"><Mail className="w-4 h-4" /> Invitations ({invitations.length})</h2><div className="space-y-2">{invitations.map((inv) => (<div key={inv.id} className="card p-4"><div className="flex items-start gap-3"><div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"><img src={inv.event?.cover_url || ''} alt="" className="w-full h-full object-cover" /></div><div className="flex-1 min-w-0"><p className="font-semibold text-[#1A1A2E] text-sm line-clamp-1">{inv.event?.title}</p><p className="text-xs text-gray-500">{inv.role === 'performer' ? "Invité en tant qu'artiste" : 'Invité en tant que co-organisateur'}</p></div></div><div className="flex gap-2 mt-3"><button onClick={() => handleRespond(inv.id, 'accepted')} disabled={responding === inv.id} className="flex-1 py-2.5 rounded-full bg-[#6600FF] text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40">{responding === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accepter</>}</button><button onClick={() => handleRespond(inv.id, 'declined')} disabled={responding === inv.id} className="flex-1 py-2.5 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"><X className="w-4 h-4" /> Refuser</button></div></div>))}</div></div>)}
        {isCreator && (<div className="px-5 mt-6"><button onClick={onOrganizerDashboard} className="w-full card p-4 flex items-center justify-between hover:shadow-card-hover transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center">{user.role === 'artist' ? <Music2 className="w-5 h-5 text-[#6600FF]" /> : <Settings className="w-5 h-5 text-[#6600FF]" />}</div><div className="text-left"><p className="font-bold text-[#1A1A2E]">{user.role === 'artist' ? 'Espace artiste' : 'Dashboard organisateur'}</p><p className="text-xs text-gray-500">Gérez vos événements et collaborations</p></div></div><ChevronRight className="w-5 h-5 text-gray-400" /></button></div>)}
        <div className="px-5 mt-4 space-y-2">
          <button onClick={onOpenNotifications} className="w-full card p-4 flex items-center justify-between hover:shadow-card-hover transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center"><Bell className="w-5 h-5 text-[#6600FF]" /></div><div className="text-left"><p className="font-bold text-[#1A1A2E]">{t('common', 'notifications')}</p><p className="text-xs text-gray-500">{language === 'fr' ? 'Voir vos notifications' : 'View your notifications'}</p></div></div><ChevronRight className="w-5 h-5 text-gray-400" /></button>
          <button onClick={onOpenNotificationSettings} className="w-full card p-4 flex items-center justify-between hover:shadow-card-hover transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center"><BellRing className="w-5 h-5 text-[#6600FF]" /></div><div className="text-left"><p className="font-bold text-[#1A1A2E]">{t('settings', 'notifSettings.title')}</p><p className="text-xs text-gray-500">{language === 'fr' ? 'Choisir les types à recevoir' : 'Choose which to receive'}</p></div></div><ChevronRight className="w-5 h-5 text-gray-400" /></button>
          <button onClick={onOpenSubscriptions} className="w-full card p-4 flex items-center justify-between hover:shadow-card-hover transition-all"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center"><Heart className="w-5 h-5 text-[#6600FF]" /></div><div className="text-left"><p className="font-bold text-[#1A1A2E]">{t('settings', 'subscriptions.title')}</p><p className="text-xs text-gray-500">{language === 'fr' ? 'Artistes et organisateurs suivis' : 'Followed artists and organizers'}</p></div></div><ChevronRight className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-5 mt-6"><div className="flex items-center justify-between mb-4"><h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A2E]"><Calendar className="w-5 h-5 text-[#6600FF]" /> Mes événements</h2><span className="text-sm text-gray-500">{myEvents.length}</span></div>{loading ? (<div className="grid grid-cols-2 gap-4">{[1,2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}</div>) : myEvents.length === 0 ? (<div className="card p-8 text-center"><Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm text-gray-500">Vous n'avez pas encore créé d'événement</p><p className="text-xs text-gray-400 mt-1">Utilisez le bouton + pour en créer un</p></div>) : (<div className="grid grid-cols-2 gap-4">{myEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}</div>)}</div>
        <div className="px-5 mt-8 space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Paramètres</h2>
          <button onClick={toggleTheme} className="w-full card p-4 flex items-center justify-between"><div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="w-5 h-5 text-[#6600FF]" /> : <Sun className="w-5 h-5 text-[#6600FF]" />}<span className="font-medium text-[#1A1A2E]">Thème</span></div><span className="text-sm text-gray-500">{theme === 'dark' ? 'Sombre' : 'Clair'}</span></button>
          <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="w-full card p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Globe className="w-5 h-5 text-[#6600FF]" /><span className="font-medium text-[#1A1A2E]">Langue</span></div><span className="text-sm text-gray-500">{language === 'fr' ? 'Français' : 'English'}</span></button>
          <button onClick={signOut} className="w-full card p-4 flex items-center gap-3 text-red-500"><LogOut className="w-5 h-5" /><span className="font-medium">Se déconnecter</span></button>
        </div>
      </div>
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onToast={onToast} />
    </div>
  );
}
