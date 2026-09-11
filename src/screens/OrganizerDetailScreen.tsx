import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  MapPin,
  BadgeCheck,
  Globe,
  Phone,
  Mail,
  Calendar,
  Users,
  Heart,
  Share2,
  Sparkles,
} from 'lucide-react';
import { fetchOrganizationById, fetchEventsByOrganization } from '@/services/events';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useApp } from '@/hooks/useApp';
import { EventCard } from '@/components/EventCard';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { UserAvatar } from '@/components/UserAvatar';
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
  const { session, t } = useApp();
  const { isFollowingOrg, toggleFollowOrg } = useFavorites();
  const [fullOrg, setFullOrg] = useState<Organization | null>(organization);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const following = isFollowingOrg(organization.id);

  useEffect(() => {
    fetchOrganizationById(organization.id).then((data) => {
      if (data) setFullOrg(data);
    });
    fetchEventsByOrganization(organization.id)
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [organization.id]);

  const handleFollow = async () => {
    if (!session) {
      onToast({
        message: t('events', 'organizer.followPromptLogin') || 'Connectez-vous pour vous abonner à cet organisateur.',
        type: 'info',
      });
      onLogin?.();
      return;
    }

    try {
      const willFollow = !following;
      await toggleFollowOrg(organization.id);
      onToast({
        message: willFollow
          ? (t('events', 'organizer.followedToast') || `Vous suivez désormais ${(fullOrg || organization).name}`)
          : (t('events', 'organizer.unfollowedToast') || `Désabonné de ${(fullOrg || organization).name}`),
        type: 'success',
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

  const displayOrg = fullOrg || organization;
  const followersCount = (displayOrg.followers_count || 0) + (following ? 1 : 0);

  return (
    <div className="min-h-screen pb-32">
      {/* Cover */}
      <div className="relative h-56 overflow-hidden">
        {displayOrg.cover_url ? (
          <img
            src={displayOrg.cover_url}
            alt={displayOrg.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#6600FF] via-[#7C3AED] to-[#9D4EDD]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#EDE8FF] dark:from-[#0f0d19] via-black/20 to-black/40" />

        {/* Buttons */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={onBack}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleFollow}
              aria-label={following ? 'Ne plus suivre' : 'Suivre'}
              className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white"
            >
              <Heart className={`w-5 h-5 ${following ? 'text-red-500 fill-red-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager l'organisateur"
              className="w-10 h-10 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg active:scale-90 transition-transform text-[#17131D] dark:text-white"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-md mx-auto px-5 -mt-14 relative">
        <div className="flex items-end gap-4">
          <UserAvatar
            src={displayOrg.logo_url}
            name={displayOrg.name}
            role="organizer"
            size="2xl"
            shape="squircle"
            isVerified={displayOrg.verification_status === 'verified'}
            className="w-24 h-24 shadow-xl ring-4 ring-white dark:ring-[#14121E]"
          />
          <div className="flex-1 pb-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl font-black text-[#17131D] dark:text-white tracking-tight truncate">
                {displayOrg.name}
              </h1>
              {displayOrg.verification_status === 'verified' && (
                <BadgeCheck className="w-5 h-5 text-[#6600FF] shrink-0" />
              )}
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
              <p className="text-base font-black text-[#17131D] dark:text-white">
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
              <p className="text-base font-black text-[#17131D] dark:text-white">
                {events.length}
              </p>
              <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {t('events', 'organizer.events') || 'Événements'}
              </p>
            </div>
          </div>
        </div>

        {/* Follow CTA */}
        <button
          type="button"
          onClick={handleFollow}
          className={`w-full mt-4 py-3.5 rounded-full font-black text-sm transition-all active:scale-[0.98] cursor-pointer shadow-md flex items-center justify-center gap-2 ${
            following
              ? 'bg-white dark:bg-white/15 text-[#6600FF] dark:text-white border border-[#6600FF]/30 dark:border-white/20'
              : 'bg-[#6600FF] text-white hover:bg-[#5200cc]'
          }`}
        >
          <Heart className={`w-4 h-4 ${following ? 'fill-[#6600FF] dark:fill-white' : ''}`} />
          {following
            ? (t('events', 'organizer.unfollow') || 'Abonné · Ne plus suivre')
            : (t('events', 'organizer.follow') || 'Suivre cet organisateur')}
        </button>

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

        {/* Events listing */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-[#17131D] dark:text-white">
              {t('events', 'organizer.eventsOrganized') || 'Événements organisés'}
            </h2>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              {events.length} {t('common', 'total') || 'au total'}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3.5">
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
            <div className="grid grid-cols-2 gap-3.5">
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
