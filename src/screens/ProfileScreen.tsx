import { useState, useEffect } from 'react';
import {
  Calendar,
  Settings,
  Music2,
  ChevronRight,
  Check,
  X,
  Loader2,
  BellRing,
  Heart,
  Sparkles,
  QrCode,
  UserCheck,
  PlusCircle,
  Layers,
} from 'lucide-react';
import { ProfileHeader } from '@/components/ProfileHeader';
import { EventCard } from '@/components/EventCard';
import { EditProfileModal } from '@/components/EditProfileModal';
import { SettingsModal } from '@/components/SettingsModal';
import { Modal } from '@/components/Modal';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/services/supabase';
import { fetchPendingInvitations, respondToInvitation } from '@/services/events';
import { ProfileScreenSkeleton } from '@/components/Skeleton';
import type { Event, EventCollaborator } from '@/types';
import type { ToastData } from '@/components/Toast';

interface ProfileScreenProps {
  onEventClick: (event: Event) => void;
  onLogin: () => void;
  onOrganizerDashboard: () => void;
  onOpenNotifications: () => void;
  onOpenNotificationSettings: () => void;
  onOpenSubscriptions: () => void;
  onOpenTickets?: () => void;
  onOpenAISettings?: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

type ProfileTab = 'events' | 'invitations' | 'activity';

function getInitialMyEvents(userId?: string): Event[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`gba_my_events_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
}

export function ProfileScreen({
  onEventClick,
  onLogin,
  onOrganizerDashboard,
  onOpenNotifications,
  onOpenNotificationSettings,
  onOpenSubscriptions,
  onOpenTickets,
  onOpenAISettings,
  onToast,
}: ProfileScreenProps) {
  const { user, session, refreshProfile } = useApp();
  const [myEvents, setMyEvents] = useState<Event[]>(() => getInitialMyEvents(user?.id));
  const [loading, setLoading] = useState(false);
  const [ticketsCount, setTicketsCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [invitations, setInvitations] = useState<(EventCollaborator & { event?: Event })[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>('events');

  useEffect(() => {
    if (!user) return;
    const cached = getInitialMyEvents(user.id);
    if (cached.length === 0 && (user.role === 'organizer' || user.role === 'artist')) {
      setLoading(true);
    }
    supabase
      .from('events')
      .select('*')
      .eq('organizer_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = (data as Event[]) || [];
        setMyEvents(list);
        try {
          localStorage.setItem(`gba_my_events_${user.id}`, JSON.stringify(list));
        } catch {
          // Storage quota
        }
      })
      .finally(() => setLoading(false));

    // Récupérer les nombres réels d'abonnements, abonnés et billets depuis la base de données
    void (async () => {
      try {
        const [ticketsRes, artRes, orgRes, userFollowingRes, userFollowersRes] = await Promise.all([
          supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('artist_follows').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('organization_follows').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
          supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
          supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        ]);

        setTicketsCount(ticketsRes.count || 0);
        const totalFollowing = (artRes.count || 0) + (orgRes.count || 0) + (userFollowingRes.count || 0);
        setFollowingCount(totalFollowing);
        setFollowersCount(userFollowersRes.count || 0);
      } catch {
        // En cas d'erreur de requête isolée, conserver 0
      }
    })();

    fetchPendingInvitations(user.id)
      .then(setInvitations)
      .catch(() => setInvitations([]));
  }, [user]);

  const handleRespond = async (invId: string, status: 'accepted' | 'declined') => {
    setResponding(invId);
    try {
      await respondToInvitation(invId, status);
      setInvitations(invitations.filter((i) => i.id !== invId));
      refreshProfile();
      onToast({
        message: status === 'accepted' ? 'Invitation acceptée !' : 'Invitation refusée.',
        type: 'success',
      });
    } catch {
      onToast({ message: 'Impossible de répondre à l’invitation.', type: 'error' });
    } finally {
      setResponding(null);
    }
  };

  if (!session || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-32">
        <div className="w-24 h-24 rounded-full bg-[#6600FF]/10 flex items-center justify-center mb-6">
          <Calendar className="w-12 h-12 text-[#6600FF]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] dark:text-white mb-2">
          Bienvenue sur Gbaigbance
        </h1>
        <p className="text-gray-500 text-center mb-8 max-w-xs text-sm">
          Connectez-vous pour réserver vos billets, suivre vos artistes et créer vos événements.
        </p>
        <button onClick={onLogin} className="btn-purple px-8 py-3.5 max-w-xs w-full rounded-full font-bold">
          Se connecter
        </button>
      </div>
    );
  }

  if (loading && myEvents.length === 0 && !user.bio) {
    return <ProfileScreenSkeleton />;
  }

  const isCreator = user.role === 'organizer' || user.role === 'artist';

  return (
    <div className="min-h-screen pb-40">
      <div className="max-w-md mx-auto">
        {/* Barre d'en-tête supérieure avec bouton Paramètres Stratégique */}
        <div className="px-5 pt-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-[#17131D] dark:text-white tracking-tight">
              Mon Espace
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-[10px] font-bold">
              v2.8
            </span>
          </div>

          {/* Bouton Paramètres Système Stratégique (En haut à droite de l'écran Profil) */}
          <button
            id="profile-strategic-settings-btn"
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Ouvrir les Paramètres de l'application"
            className="w-10 h-10 rounded-2xl bg-white dark:bg-[#1A1829] shadow-xs border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-[#6600FF]/10 hover:text-[#6600FF] active:scale-90 transition-all"
            title="Paramètres de l'application"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Composant Header Profil modernisé */}
        <ProfileHeader
          profile={user}
          eventsCount={myEvents.length}
          ticketsCount={ticketsCount}
          followersCount={isCreator ? followersCount : undefined}
          followingCount={followingCount}
          onEditClick={() => setEditOpen(true)}
          onOpenQR={() => setQrOpen(true)}
          onOpenSubscriptions={onOpenSubscriptions}
          onOpenTickets={onOpenTickets}
        />

        {/* Accès rapide Espace Organisateur / Artiste (Bannière moderne) */}
        {isCreator && (
          <div className="px-5 mt-2">
            <button
              type="button"
              onClick={onOrganizerDashboard}
              className="w-full p-4 rounded-[2rem] bg-gradient-to-r from-[#6600FF] via-[#7C3AED] to-[#9333EA] text-white flex items-center justify-between shadow-[0_12px_28px_rgba(102,0,255,0.25)] active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  {user.role === 'artist' ? <Music2 className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-black text-sm tracking-tight">
                      {user.role === 'artist' ? 'Espace Artiste Pro' : 'Dashboard Organisateur'}
                    </p>
                    <span className="px-1.5 py-0.5 rounded-full bg-white/25 text-[9px] font-black uppercase">
                      Admin
                    </span>
                  </div>
                  <p className="text-xs text-white/80">
                    Gérez vos billetteries, collaborateurs & statistiques
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/80" />
            </button>
          </div>
        )}

        {/* Segmented Control iOS pour organiser la page profil sans fouillis */}
        <div className="px-5 mt-6">
          <div className="p-1 bg-gray-200/70 dark:bg-white/10 rounded-2xl flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'events'
                  ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Mes Événements ({myEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invitations')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'invitations'
                  ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Invitations
              {invitations.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black">
                  {invitations.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              Raccourcis
            </button>
          </div>
        </div>

        {/* CONTENU ONGLET 1 : Mes Événements */}
        {activeTab === 'events' && (
          <div className="px-5 mt-5 space-y-4 animate-fade-in">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-gray-200 dark:bg-gray-800 animate-pulse h-52 rounded-3xl" />
                ))}
              </div>
            ) : myEvents.length === 0 ? (
              <div className="rounded-[2.2rem] bg-white dark:bg-[#1A1829] p-8 text-center border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-7 h-7" />
                </div>
                <p className="text-base font-extrabold text-[#17131D] dark:text-white">
                  Aucun événement publié
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  Créez des concerts, soirées ou festivals et vendez vos billets facilement.
                </p>
                {isCreator && (
                  <button
                    type="button"
                    onClick={onOrganizerDashboard}
                    className="mt-4 px-5 py-2.5 rounded-full bg-[#6600FF] text-white text-xs font-bold hover:bg-[#5800DC] shadow-purple transition-all inline-flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-4 h-4" /> Créer mon premier événement
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {myEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTENU ONGLET 2 : Invitations */}
        {activeTab === 'invitations' && (
          <div className="px-5 mt-5 space-y-3 animate-fade-in">
            {invitations.length === 0 ? (
              <div className="rounded-[2.2rem] bg-white dark:bg-[#1A1829] p-8 text-center border border-black/[0.05] dark:border-white/[0.08] shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-400 flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-7 h-7" />
                </div>
                <p className="text-sm font-extrabold text-[#17131D] dark:text-white">
                  Aucune invitation en attente
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Les demandes de collaboration pour co-organiser ou jouer lors d'un festival apparaîtront ici.
                </p>
              </div>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-[2rem] bg-white dark:bg-[#1A1829] border border-black/[0.05] dark:border-white/[0.08] shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <img
                      src={inv.event?.cover_url || ''}
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[#17131D] dark:text-white text-sm truncate">
                        {inv.event?.title}
                      </p>
                      <p className="text-xs text-[#6600FF] font-semibold mt-0.5">
                        {inv.role === 'performer' ? 'Artiste invité' : 'Co-organisateur'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3.5 pt-3 border-t border-black/[0.05] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => handleRespond(inv.id, 'accepted')}
                      disabled={responding === inv.id}
                      className="flex-1 py-2.5 rounded-xl bg-[#6600FF] text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {responding === inv.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Accepter
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRespond(inv.id, 'declined')}
                      disabled={responding === inv.id}
                      className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTENU ONGLET 3 : Raccourcis & Hub */}
        {activeTab === 'activity' && (
          <div className="px-5 mt-5 space-y-3 animate-fade-in">
            <div className="rounded-[2.2rem] bg-white dark:bg-[#1A1829] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.06] shadow-xs">
              {/* Abonnements */}
              <button
                type="button"
                onClick={onOpenSubscriptions}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center">
                    <Heart className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">
                      Mes Artistes & Abonnements
                    </p>
                    <p className="text-xs text-gray-400">
                      Notifications des prochaines dates
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Alertes de billets */}
              <button
                type="button"
                onClick={onOpenNotificationSettings}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-[#6600FF] flex items-center justify-center">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">
                      Rappels de Billetterie
                    </p>
                    <p className="text-xs text-gray-400">
                      Alertes d'accès avant le jour J
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Intelligence Artificielle */}
              <button
                type="button"
                onClick={onOpenAISettings}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] text-white flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">
                      Intelligence Artificielle (Gemini)
                    </p>
                    <p className="text-xs text-gray-400">
                      Assistant IA & Maps Grounding
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Paramètres de l'application */}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">
                      Centre de contrôle complet
                    </p>
                    <p className="text-xs text-gray-400">
                      Thème, langue, sécurité & compte
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale d'édition de profil */}
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onToast={onToast} />

      {/* Modale Paramètres Système Stratégique */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenAISettings={onOpenAISettings}
        onOpenNotifications={onOpenNotifications}
        onOpenNotificationSettings={onOpenNotificationSettings}
        onEditProfile={() => setEditOpen(true)}
      />

      {/* Modale Pass QR personnel */}
      <Modal open={qrOpen} onClose={() => setQrOpen(false)} title="Pass d'accès membre">
        <div className="p-6 text-center space-y-4">
          <div className="w-48 h-48 mx-auto bg-white p-4 rounded-3xl border-2 border-dashed border-[#6600FF]/30 flex items-center justify-center shadow-lg">
            <QrCode className="w-40 h-40 text-[#17131D]" />
          </div>
          <div>
            <p className="font-extrabold text-base text-[#17131D] dark:text-white">
              {user.name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Identifiant membre : #GB-{user.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto leading-relaxed">
            Présentez ce QR Code aux entrées sécurisées des événements Gbaigbance pour vérifier votre identité et vos billets réservés.
          </p>
          <button
            type="button"
            onClick={() => setQrOpen(false)}
            className="w-full py-3.5 rounded-2xl bg-[#6600FF] text-white font-bold text-sm"
          >
            Fermer mon pass
          </button>
        </div>
      </Modal>
    </div>
  );
}
