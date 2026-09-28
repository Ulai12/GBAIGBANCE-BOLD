// UserProfileScreen.tsx - Vue profil participant/ami avec synchronisation globale des abonnements,
// perspective adaptée (soi-même vs autre participant), rafraîchissement silencieux 3s et ergonomie responsive Apple HIG.
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, MapPin, Calendar, BadgeCheck, Music2, Building2, User, Heart, Ticket, Camera, Sparkles, UserCheck } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { fetchProfileById, fetchUserFollowersCount, fetchUserFollowingCount } from '@/services/events';
import { supabase } from '@/services/supabase';
import { formatRelativeDate, formatFullDate, formatNumber } from '@/utils/format';
import { COUNTRY_FLAGS } from '@/constants';
import { UserProfileScreenSkeleton } from '@/components/Skeleton';
import { UserAvatar } from '@/components/UserAvatar';
import { SmartImage } from '@/components/SmartImage';
import { ProfilePictureModal } from '@/components/ProfilePictureModal';
import type { Profile, Event } from '@/types';
import type { ToastData } from '@/components/Toast';

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

export function UserProfileScreen({ userId, onBack, onEventClick, onToast }: UserProfileScreenProps) {
  const { user: currentUser, t, language, refreshProfile } = useApp();
  const { isFollowingUser, toggleFollowUser } = useFavorites();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [pictureModalOpen, setPictureModalOpen] = useState(false);

  // Synchronisation globale du statut de suivi via FavoritesContext
  const following = isFollowingUser(userId);
  const isSelf = Boolean(currentUser?.id && currentUser.id === userId);

  // Chargement silencieux des données avec conservation de l'état visuel (aucun flicker)
  const refreshSilentData = useCallback(async () => {
    try {
      const [freshProf, fCount, fgCount, ticketsData] = await Promise.all([
        fetchProfileById(userId),
        fetchUserFollowersCount(userId),
        fetchUserFollowingCount(userId),
        supabase
          .from('tickets')
          .select('event:events(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(4),
      ]);

      if (freshProf) setProfile(freshProf);
      setFollowersCount(fCount);
      setFollowingCount(fgCount);

      if (ticketsData.data) {
        const events = (ticketsData.data as Array<{ event: Event | Event[] }>)
          .flatMap((row) => (Array.isArray(row.event) ? row.event : [row.event]))
          .filter(Boolean) as Event[];
        setRecentEvents(events);
      }
    } catch {
      // Ignorer les erreurs silencieuses pour ne pas interrompre l'expérience
    }
  }, [userId]);

  // Initialisation au montage
  useEffect(() => {
    setLoading(true);
    fetchProfileById(userId)
      .then((p) => {
        setProfile(p);
      })
      .catch(() => {
        onToast({ message: t('settings', 'userProfile.notFound') || 'Profil introuvable', type: 'error' });
      })
      .finally(() => {
        setLoading(false);
      });

    // Chargement initial des compteurs et billets
    refreshSilentData();
  }, [userId, refreshSilentData, onToast, t]);

  // Rafraîchissement automatique en arrière-plan toutes les 3 secondes max (uniquement si l'onglet est actif)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshSilentData();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshSilentData]);

  // Écoute de l'événement global de changement d'abonnement pour ajustement instantané des compteurs
  useEffect(() => {
    const handleFollowChange = (e: globalThis.Event) => {
      const customEvent = e as CustomEvent<{ followerId: string; followingId: string; willFollow: boolean }>;
      if (customEvent.detail && customEvent.detail.followingId === userId) {
        setFollowersCount((prev) => (customEvent.detail.willFollow ? prev + 1 : Math.max(0, prev - 1)));
      }
    };

    window.addEventListener('gba-user-follow-changed', handleFollowChange);
    return () => window.removeEventListener('gba-user-follow-changed', handleFollowChange);
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!currentUser) {
      onToast({ message: t('settings', 'userProfile.loginToFollow') || 'Connectez-vous pour suivre ce profil', type: 'info' });
      return;
    }
    if (isSelf) return;

    setToggling(true);
    try {
      const willFollow = !following;
      await toggleFollowUser(userId);
      setFollowersCount((prev) => (willFollow ? prev + 1 : Math.max(0, prev - 1)));
      onToast({
        message: willFollow
          ? (t('settings', 'userProfile.following') || 'Abonnement confirmé')
          : (t('settings', 'userProfile.unfollowed') || 'Désabonné'),
        type: willFollow ? 'success' : 'info',
      });
    } catch {
      onToast({ message: 'Une erreur est survenue lors de la synchronisation', type: 'error' });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <UserProfileScreenSkeleton />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center px-6">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {t('settings', 'userProfile.notFound') || 'Profil introuvable'}
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-6 py-2.5 rounded-full text-xs font-bold text-[#6600FF] bg-[#6600FF]/10 hover:bg-[#6600FF]/20 active:scale-95 transition-all"
        >
          Retour
        </button>
      </div>
    );
  }

  const roleIcon = profile.role === 'artist' ? Music2 : profile.role === 'organizer' ? Building2 : User;
  const RoleIcon = roleIcon;

  return (
    <div className="min-h-screen pb-32">
      {/* En-tête avec dégradé Apple et bouton retour */}
      <div className="relative h-52 bg-gradient-to-br from-[#6600FF]/25 via-[#9D4EDD]/20 to-[#EDE8FF] dark:to-[#141022]">
        <div className="max-w-2xl mx-auto px-5 pt-safe-header">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-[#1A1A2E] dark:text-white" />
          </button>
        </div>
      </div>

      {/* Conteneur principal responsive adapté mobile, tablette et PC */}
      <div className="max-w-2xl mx-auto px-5 -mt-16 relative">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <UserAvatar
              id={profile.id}
              src={profile.avatar_url}
              name={profile.name}
              role={profile.role}
              size="2xl"
              className="w-28 h-28 sm:w-32 sm:h-32 border-4 border-white dark:border-[#14121E] shadow-2xl"
            />
            {isSelf && (
              <button
                type="button"
                onClick={() => setPictureModalOpen(true)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#6600FF] text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#14121E] active:scale-90 transition-transform cursor-pointer"
                title="Modifier ma photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            <h1 className="text-xl sm:text-2xl font-black text-[#1A1A2E] dark:text-white tracking-tight">
              {profile.name}
            </h1>
            {(profile.role === 'organizer' || profile.role === 'artist') && (
              <BadgeCheck className="w-5 h-5 text-[#6600FF] dark:text-[#A78BFA]" />
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-6 h-6 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 flex items-center justify-center">
              <RoleIcon className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA]" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
              {profile.role === 'artist'
                ? t('common', 'artist') || 'Artiste'
                : profile.role === 'organizer'
                ? t('common', 'organizer') || 'Organisateur'
                : t('common', 'participant') || 'Participant'}
            </span>
          </div>

          {profile.city && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="w-3.5 h-3.5" />
              <span>{COUNTRY_FLAGS[profile.country] || ''} {profile.city}, {profile.country}</span>
            </div>
          )}

          {/* Badge perspective utilisateur (si l'utilisateur regarde son propre profil) */}
          {isSelf && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] text-xs font-bold border border-[#6600FF]/20">
              <Sparkles className="w-3 h-3" />
              <span>Votre profil public (visible par les autres)</span>
            </div>
          )}
        </div>

        {/* Statistiques abonnés et abonnements synchronisées */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
          <div className="card p-3.5 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-[#1A1A2E] dark:text-white">{followingCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t('settings', 'userProfile.followingCount') || 'Abonnements'}</p>
          </div>
          <div className="card p-3.5 sm:p-4 text-center">
            <p className="text-xl sm:text-2xl font-black text-[#1A1A2E] dark:text-white">{followersCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{t('settings', 'userProfile.followers') || 'Abonnés'}</p>
          </div>
        </div>

        {/* Bouton d'action contextuel : Suivre / Abonné(e) pour un ami, ou Modifier pour soi-même */}
        <div className="mt-5">
          {isSelf ? (
            <button
              type="button"
              onClick={() => setPictureModalOpen(true)}
              className="w-full py-3.5 rounded-full font-bold text-sm bg-white dark:bg-white/10 text-[#6600FF] dark:text-white border border-[#6600FF]/30 dark:border-white/20 hover:bg-gray-50 dark:hover:bg-white/15 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Mettre à jour ma photo de profil</span>
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={toggling}
                className={`flex-1 py-3.5 rounded-full font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-md disabled:opacity-50 ${
                  following
                    ? 'bg-white dark:bg-white/10 text-[#6600FF] dark:text-white border-2 border-[#6600FF]'
                    : 'bg-[#6600FF] hover:bg-[#5200cc] text-white'
                }`}
              >
                {following ? <UserCheck className="w-4 h-4 text-[#6600FF] dark:text-white" /> : <Heart className="w-4 h-4" />}
                <span>{following ? 'Abonné(e) · Ne plus suivre' : 'Suivre ce participant'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Biographie du participant */}
        {profile.bio && (
          <div className="card p-4 mt-5">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('settings', 'userProfile.bio') || 'À propos'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4 text-xs text-gray-400 px-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>{t('settings', 'userProfile.memberSince') || 'Membre depuis'} {formatRelativeDate(profile.created_at, language)}</span>
        </div>

        {/* Événements récents réservés ou partagés */}
        {recentEvents.length > 0 && (
          <div className="mt-7">
            <h2 className="text-sm font-black text-[#1A1A2E] dark:text-white mb-3.5 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-[#6600FF] dark:text-[#A78BFA]" />
              <span>{language === 'fr' ? 'Sorties & événements récents' : 'Recent events'}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {recentEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick(ev)}
                  className="w-full card p-3 flex items-center gap-3 hover:shadow-card-hover transition-all text-left cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/5">
                    <SmartImage src={ev.cover_url} alt={ev.title} className="w-full h-full object-cover" sizes="56px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1A1A2E] dark:text-white text-sm truncate">{ev.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{formatFullDate(ev.starts_at, language)} · {ev.city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
                    <Heart className="w-3 h-3" />
                    <span>{formatNumber(ev.likes_count, language)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProfilePictureModal
        open={pictureModalOpen}
        onClose={() => setPictureModalOpen(false)}
        onSuccess={async (url: string) => {
          if (profile) setProfile({ ...profile, avatar_url: url });
          await refreshProfile();
        }}
        onToast={onToast}
      />
    </div>
  );
}

