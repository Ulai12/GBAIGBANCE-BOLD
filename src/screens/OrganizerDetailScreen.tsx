import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  MapPin,
  Globe,
  Phone,
  Mail,
  Calendar,
  Users,
  Heart,
  Share2,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { fetchOrganizationById, fetchEventsByOrganization } from '@/services/events';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useApp } from '@/hooks/useApp';
import { EventCard } from '@/components/EventCard';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
import { getDefaultOrgCover } from '@/utils/defaultImages';
import type { Organization, Event } from '@/types';

interface OrganizerDetailScreenProps {
  organization: Organization;
  onBack: () => void;
  onEventClick: (event: Event) => void;
  onToast: (toast: { message: string; type: 'success' | 'error' | 'info' }) => void;
  onLogin?: () => void;
}

export function OrganizerDetailScreen({
  organization,
  onBack,
  onEventClick,
  onToast,
  onLogin,
}: OrganizerDetailScreenProps) {
  const { session, user, t } = useApp();
  const { isFollowingOrg, toggleFollowOrg } = useFavorites();
  const [fullOrg, setFullOrg] = useState<Organization | null>(organization);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const following = isFollowingOrg(organization.id);
  const displayOrg = fullOrg || organization;

  const [coverSrc, setCoverSrc] = useState(
    () => displayOrg.cover_url || getDefaultOrgCover(displayOrg.id, displayOrg.name)
  );

  useEffect(() => {
    setCoverSrc(displayOrg.cover_url || getDefaultOrgCover(displayOrg.id, displayOrg.name));
  }, [displayOrg.cover_url, displayOrg.id, displayOrg.name]);

  // Perspective : l'utilisateur connecté est-il le propriétaire de cette organisation ?
  const isOwnProfile = Boolean(user && (user.id === displayOrg.owner_id || user.id === displayOrg.id));

  // Chargement silencieux en arrière-plan (aucun flicker)
  const refreshSilentData = useCallback(async () => {
    try {
      const [freshOrg, freshEvents] = await Promise.all([
        fetchOrganizationById(organization.id),
        fetchEventsByOrganization(organization.id),
      ]);
      if (freshOrg) setFullOrg(freshOrg);
      if (freshEvents) setEvents(freshEvents);
    } catch {
      // Ignorer
    }
  }, [organization.id]);

  useEffect(() => {
    setLoading(true);
    fetchOrganizationById(organization.id).then((data) => {
      if (data) setFullOrg(data);
    });
    fetchEventsByOrganization(organization.id)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [organization.id]);

  // Polling silencieux en arrière-plan toutes les 3 secondes max si l'onglet est actif
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshSilentData();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [refreshSilentData]);

  const handleFollow = async () => {
    if (!session) {
      onToast({
        message: t('events', 'organizer.followPromptLogin') || 'Connectez-vous pour vous abonner à cet organisateur.',
        type: 'info',
      });
      onLogin?.();
      return;
    }
    if (isOwnProfile) return;

    try {
      const willFollow = !following;
      await toggleFollowOrg(organization.id);
      onToast({
        message: willFollow
          ? (t('events', 'organizer.followedToast') || `Vous suivez désormais ${(fullOrg || organization).name}`)
          : (t('events', 'organizer.unfollowedToast') || `Désabonné de ${(fullOrg || organization).name}`),
        type: willFollow ? 'success' : 'info',
      });
    } catch {
      onToast({ message: t('common', 'error') || 'Erreur lors de la mise à jour', type: 'error' });
    }
  };

  const handleShare = async () => {
    const orgToShare = fullOrg || organization;
    const shareData = {
      title: `${orgToShare.name} sur Gbaigbance`,
      text: `Découvrez les événements organisés par ${orgToShare.name} sur Gbaigbance`,
      url: window.location.href,
    };
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share(shareData);
        onToast({ message: t('events', 'organizer.profileShared') || 'Profil partagé avec succès', type: 'success' });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        onToast({ message: t('events', 'organizer.linkCopied') || 'Lien copié dans le presse-papiers', type: 'success' });
      }
    } catch {
      // Annulation utilisateur
    }
  };

  const followersCount = (displayOrg.followers_count || 0) + (following ? 1 : 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Cover Header */}
      <div className="relative h-56 sm:h-64 lg:h-72 overflow-hidden bg-zinc-900">
        <img
          src={coverSrc}
          alt={displayOrg.name}
          onError={() => setCoverSrc(getDefaultOrgCover(displayOrg.id, displayOrg.name))}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Voiles très légers et discrets pour laisser l'image de couverture pleinement visible */}
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/25 via-black/10 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

        {/* Buttons */}
        <div className="absolute top-0 inset-x-4 max-w-4xl mx-auto pt-safe-header flex items-center justify-between z-10 pointer-events-auto">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {!isOwnProfile && (
              <button
                type="button"
                onClick={handleFollow}
                aria-label={following ? 'Ne plus suivre' : 'Suivre'}
                className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white cursor-pointer"
              >
                <Heart className={`w-5 h-5 ${following ? 'text-red-500 fill-red-500' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager l'organisateur"
              className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white cursor-pointer"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body responsive pour tablette et PC */}
      <div className="max-w-4xl mx-auto px-5 -mt-10 sm:-mt-12 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <UserAvatar
            src={displayOrg.logo_url}
            name={displayOrg.name}
            role="organizer"
            size="2xl"
            shape="squircle"
            className="w-24 h-24 sm:w-28 sm:h-28 shadow-xl ring-4 ring-white dark:ring-[#14121E]"
          />
          <div className="flex-1 pb-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#17131D] dark:text-white tracking-tight truncate">
                {displayOrg.name}
              </h1>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#6600FF]" />
              <span>{displayOrg.city || 'Abidjan'}, {displayOrg.country || 'Côte d’Ivoire'}</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-[#17131D] dark:text-white">
                {followersCount}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {t('events', 'organizer.followers') || 'Abonnés'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/80 dark:bg-white/10 border border-black/5 dark:border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6600FF]/10 text-[#6600FF] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black text-[#17131D] dark:text-white">
                {events.length}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {t('events', 'organizer.events') || 'Événements'}
              </p>
            </div>
          </div>
        </div>

        {/* Follow CTA ou Statut d'administration de son propre compte */}
        {isOwnProfile ? (
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 border border-[#6600FF]/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#6600FF] dark:text-[#A78BFA]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Votre organisation (Vue publique des participants)</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-black/30 px-2.5 py-1 rounded-full">
              Organisateur certifié
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleFollow}
            className={`w-full mt-4 py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.98] cursor-pointer shadow-md flex items-center justify-center gap-2 ${
              following
                ? 'bg-white dark:bg-white/15 text-[#6600FF] dark:text-white border border-[#6600FF]/30 dark:border-white/20'
                : 'bg-[#6600FF] text-white hover:bg-[#5200cc]'
            }`}
          >
            {following ? (
              <UserCheck className="w-4 h-4 text-[#6600FF] dark:text-white" />
            ) : (
              <Heart className={`w-4 h-4 ${following ? 'fill-[#6600FF] dark:fill-white' : ''}`} />
            )}
            <span>
              {following
                ? (t('events', 'organizer.unfollow') || 'Abonné · Ne plus suivre')
                : (t('events', 'organizer.follow') || 'Suivre cet organisateur')}
            </span>
          </button>
        )}

        {/* Description */}
        {displayOrg.description && (
          <div className="mt-5 rounded-2xl bg-white/70 dark:bg-white/5 p-4 border border-black/5 dark:border-white/10">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#17131D] dark:text-white mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#6600FF]" /> {t('events', 'organizer.about') || 'À propos'}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal break-words whitespace-pre-line">
              {displayOrg.description}
            </p>
          </div>
        )}

        {/* Contacts */}
        {(displayOrg.website || displayOrg.phone || displayOrg.email) && (
          <div className="flex gap-2.5 mt-4">
            {displayOrg.website && (
              <a
                href={displayOrg.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center active:scale-90 transition-transform text-[#6600FF] dark:text-purple-300"
                title="Site web"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}
            {displayOrg.phone && (
              <a
                href={`tel:${displayOrg.phone}`}
                className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center active:scale-90 transition-transform text-[#6600FF] dark:text-purple-300"
                title="Appeler"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {displayOrg.email && (
              <a
                href={`mailto:${displayOrg.email}`}
                className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center active:scale-90 transition-transform text-[#6600FF] dark:text-purple-300"
                title="Envoyer un email"
              >
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Events listing responsive (grid-cols-2 md:grid-cols-3 lg:grid-cols-4) */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-black text-[#17131D] dark:text-white">
              {t('events', 'organizer.eventsOrganized') || 'Événements organisés'}
            </h2>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {events.length} {t('common', 'total') || 'au total'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card overflow-hidden">
                  <Skeleton className="rounded-none h-32 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('events', 'noEvents') || 'Aucun événement'}
              description={t('events', 'organizer.noEvents') || "Cet organisateur n'a pas d'événement programmé pour l'instant."}
            />
          )}
        </div>
      </div>
    </div>
  );
}
