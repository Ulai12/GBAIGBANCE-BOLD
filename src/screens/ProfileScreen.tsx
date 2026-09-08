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
    try { 
      await respondToInvitation(invId, status); 
      setInvitations(invitations.filter((i) => i.id !== invId)); 
      refreshProfile(); 
    } catch { 
      onToast({ message: 'Impossible de répondre à l’invitation.', type: 'error' }); 
    } finally { 
      setResponding(null); 
    }
  };

  if (!session || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32 bg-[#F8F9FA] dark:bg-[#0F0F1A]">
        <div className="w-28 h-28 rounded-full bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-lg border border-white/20 flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#6600FF]/10 flex items-center justify-center">
            <Calendar className="w-10 h-10 text-[#6600FF]" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-[#1A1A2E] dark:text-white mb-3 tracking-tight">Bienvenue</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xs text-sm leading-relaxed">
          Connectez-vous pour réserver vos billets, suivre vos artistes et créer vos événements.
        </p>
        <button onClick={onLogin} className="w-full max-w-xs py-4 rounded-full bg-[#6600FF] text-white font-bold shadow-lg shadow-[#6600FF]/30 hover:opacity-90 transition-all active:scale-95">
          Se connecter
        </button>
      </div>
    );
  }

  const isCreator = user.role === 'organizer' || user.role === 'artist';

  return (
    <div className="min-h-screen pb-32 bg-[#F8F9FA] dark:bg-[#0F0F1A] selection:bg-[#6600FF]/20">
      <div className="max-w-md mx-auto">
        <ProfileHeader profile={user!} eventsCount={myEvents.length} />
        
        {/* Rôle Badge */}
        <div className="px-5 mt-4 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-md shadow-sm border border-gray-100 dark:border-gray-800">
            {user.role === 'artist' ? <Music2 className="w-4 h-4 text-[#6600FF]" /> : <Building2 className="w-4 h-4 text-[#6600FF]" />}
            <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">
              {user.role === 'artist' ? 'Artiste' : user.role === 'organizer' ? 'Organisateur' : 'Participant'}
            </span>
            {user.role !== 'participant' && <BadgeCheck className="w-4 h-4 text-[#6600FF]" />}
          </div>
        </div>

        {/* Menu Actions Groupées */}
        <div className="px-5 mt-6">
          <div className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button onClick={() => setEditOpen(true)} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-[#6600FF]" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">Modifier le profil</p>
                  <p className="text-xs text-gray-500">Nom, photo, bio, localisation</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            
            {isCreator && (
              <>
                <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4" />
                <button onClick={onOrganizerDashboard} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {user.role === 'artist' ? <Music2 className="w-5 h-5 text-[#6600FF]" /> : <Settings className="w-5 h-5 text-[#6600FF]" />}
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">{user.role === 'artist' ? 'Espace artiste' : 'Dashboard organisateur'}</p>
                      <p className="text-xs text-gray-500">Gérez vos événements</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Invitations (Style Carte Flottante) */}
        {invitations.length > 0 && (
          <div className="px-5 mt-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Invitations en attente</h2>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-xl p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <img src={inv.event?.cover_url || ''} alt="" className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{inv.event?.title}</p>
                      <p className="text-xs text-[#6600FF] font-medium mt-0.5">{inv.role === 'performer' ? "Artiste invité" : 'Co-organisateur'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => handleRespond(inv.id, 'accepted')} disabled={responding === inv.id} className="flex-1 py-2.5 rounded-full bg-[#1A1A2E] dark:bg-white text-white dark:text-[#1A1A2E] text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                      {responding === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accepter</>}
                    </button>
                    <button onClick={() => handleRespond(inv.id, 'declined')} disabled={responding === inv.id} className="flex-1 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50">
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu Préférences & Abonnements */}
        <div className="px-5 mt-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Préférences</h2>
          <div className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button onClick={onOpenNotifications} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{t('common', 'notifications')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4" />
            <button onClick={onOpenNotificationSettings} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <BellRing className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{t('settings', 'notifSettings.title')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4" />
            <button onClick={onOpenSubscriptions} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <Heart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">{t('settings', 'subscriptions.title')}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Mes Événements */}
        <div className="px-5 mt-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#1A1A2E] dark:text-white tracking-tight">
              Mes événements
            </h2>
            <div className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300">
              {myEvents.length}
            </div>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />)}
            </div>
          ) : myEvents.length === 0 ? (
            <div className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-100 dark:border-gray-800 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">Aucun événement</p>
              <p className="text-xs text-gray-500 mt-1">Créez votre premier événement</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}
            </div>
          )}
        </div>

        {/* Paramètres Système */}
        <div className="px-5 mt-8 mb-6">
          <div className="bg-white/80 dark:bg-[#1A1A2E]/80 backdrop-blur-xl rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <button onClick={toggleTheme} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
                <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">Thème</span>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4" />
            <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <Globe className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                <span className="font-semibold text-[#1A1A2E] dark:text-white text-sm">Langue</span>
              </div>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full uppercase">{language}</span>
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-gray-800 mx-4" />
            <button onClick={signOut} className="w-full p-4 flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group">
              <div className="flex items-center gap-4">
                <LogOut className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-red-500 text-sm">Se déconnecter</span>
              </div>
            </button>
          </div>
        </div>
      </div>
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onToast={onToast} />
    </div>
  );
}
