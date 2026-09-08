import { BadgeCheck, MapPin, Sparkles, QrCode, Share2, Camera, Calendar, Ticket, Users } from 'lucide-react';
import type { Profile } from '@/types';
import { COUNTRY_FLAGS } from '@/constants';
import { useApp } from '@/hooks/useApp';

interface ProfileHeaderProps {
  profile: Profile;
  eventsCount?: number;
  ticketsCount?: number;
  followersCount?: number;
  followingCount?: number;
  onEditClick?: () => void;
  onOpenQR?: () => void;
}

export function ProfileHeader({
  profile,
  eventsCount = 0,
  ticketsCount = 0,
  followersCount,
  followingCount,
  onEditClick,
  onOpenQR,
}: ProfileHeaderProps) {
  const { t } = useApp();
  const flag = COUNTRY_FLAGS[profile.country] || '🌍';
  const isCreator = profile.role === 'organizer' || profile.role === 'artist';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Profil de ${profile.name} sur Gbaigbance`,
          text: `Découvrez le profil et les événements de ${profile.name} sur Gbaigbance`,
          url: window.location.href,
        });
      } catch {
        // Ignorer l'annulation
      }
    }
  };

  return (
    <div className="relative px-5 pt-8 pb-3">
      {/* Carte profil principale en verre dépoli Apple iOS */}
      <div className="relative rounded-[2.5rem] bg-white/85 dark:bg-[#151322]/90 backdrop-blur-2xl p-6 shadow-[0_16px_40px_rgba(102,0,255,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden">
        {/* Lueur d'ambiance de fond */}
        <div className="absolute -right-12 -top-12 w-44 h-44 bg-gradient-to-br from-[#6600FF]/20 to-[#A855F7]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-gradient-to-tr from-[#10B981]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Rangée supérieure : Actions rapides & Avatar */}
        <div className="flex items-start justify-between mb-4">
          {/* Avatar avec bague VIP et overlay d'édition */}
          <div className="relative">
            <div className="relative w-22 h-22 rounded-[1.8rem] overflow-hidden ring-4 ring-[#6600FF]/25 dark:ring-[#6600FF]/40 bg-gradient-to-tr from-[#6600FF] to-[#A855F7] p-0.5 shadow-lg">
              <div className="w-full h-full rounded-[1.7rem] overflow-hidden bg-white dark:bg-[#1E1B2E] flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-[#6600FF]">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Badge de rôle vérifié */}
            {isCreator && (
              <div
                className="absolute -bottom-1 -right-1 bg-[#6600FF] text-white p-1.5 rounded-full ring-4 ring-white dark:ring-[#151322] shadow-sm"
                title="Compte Créateur Vérifié"
              >
                <BadgeCheck className="w-4 h-4" />
              </div>
            )}

            {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="absolute -top-1 -right-1 bg-white dark:bg-[#1E1B2E] text-gray-700 dark:text-gray-200 p-1.5 rounded-full ring-2 ring-black/10 dark:ring-white/20 shadow-xs hover:bg-gray-100 transition-all"
                title="Changer la photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Boutons d'action rapides profil */}
          <div className="flex items-center gap-2">
            {onOpenQR && (
              <button
                type="button"
                onClick={onOpenQR}
                aria-label="Mon QR Code"
                className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95 shadow-xs"
                title="Pass d'accès QR"
              >
                <QrCode className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleShare}
              aria-label="Partager"
              className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 flex items-center justify-center hover:bg-gray-200 transition-all active:scale-95 shadow-xs"
              title="Partager le profil"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Identité & Statut */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-[#17131D] dark:text-white tracking-tight">
              {profile.name}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] text-xs font-bold">
              <Sparkles className="w-3 h-3" />
              {isCreator ? 'Créateur Pro' : 'Membre Pass'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#6600FF]" />
              {flag} {profile.city || 'Lomé'}
            </span>
            <span>•</span>
            <span className="capitalize">{t('common', profile.role)}</span>
          </div>

          {profile.bio && (
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pt-1">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Grille de métriques clés style iOS Widget */}
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.08]">
          <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] text-center border border-black/[0.03] dark:border-white/[0.04]">
            <p className="text-lg font-black text-[#17131D] dark:text-white leading-none">
              {ticketsCount}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Ticket className="w-3 h-3 text-[#10B981]" /> Billets
            </p>
          </div>

          <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] text-center border border-black/[0.03] dark:border-white/[0.04]">
            <p className="text-lg font-black text-[#17131D] dark:text-white leading-none">
              {eventsCount}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3 text-[#6600FF]" /> Sorties
            </p>
          </div>

          <div className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-white/[0.04] text-center border border-black/[0.03] dark:border-white/[0.04]">
            <p className="text-lg font-black text-[#17131D] dark:text-white leading-none">
              {followersCount !== undefined ? followersCount : (followingCount ?? 12)}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 flex items-center justify-center gap-1">
              <Users className="w-3 h-3 text-[#EC4899]" /> Réseau
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
