import { Calendar, MapPin, Share2, UserCheck, UserPlus } from 'lucide-react';
import type { Organization } from '@/types';
import { formatNumber } from '@/utils/format';
import { useApp } from '@/hooks/useApp';
import { useFavorites } from '@/contexts/FavoritesContext';
import { UserAvatar } from '@/components/UserAvatar';

interface OrganizerCardProps {
  organization: Organization;
  onClick?: () => void;
}

export function OrganizerCard({ organization, onClick }: OrganizerCardProps) {
  const { language } = useApp();
  const { isFollowingOrg, toggleFollowOrg } = useFavorites();
  const following = isFollowingOrg(organization.id);
  const isVerified = organization.verification_status === 'verified';

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const title = `${organization.name} sur Gbaïgbancê`;
    const text = `Découvrez les événements organisés par ${organization.name} !`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User dismissed
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
      } catch {
        // Silence
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className="rounded-3xl p-4 cursor-pointer group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-72 shrink-0 bg-white dark:bg-[#1A1829] border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar
              src={organization.logo_url}
              name={organization.name}
              role="organizer"
              size="lg"
              shape="squircle"
              isVerified={isVerified}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-sm text-[#17131D] dark:text-white truncate">
                {organization.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="truncate">{organization.city || 'Afrique'}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 flex items-center justify-center hover:bg-[#6600FF]/10 hover:text-[#6600FF] transition-colors shrink-0"
            title="Partager l'organisateur"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {organization.description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-3 line-clamp-2 leading-relaxed">
            {organization.description}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#6600FF] dark:text-[#A78BFA]" />
            {formatNumber(organization.events_count, language)} évts
          </span>
          <span className="font-semibold">{formatNumber(organization.followers_count, language)} abonnés</span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFollowOrg(organization.id);
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
            following
              ? 'bg-gray-100 dark:bg-white/10 text-[#6600FF] dark:text-[#A78BFA]'
              : 'bg-[#6600FF] text-white shadow-xs hover:bg-[#5200cc]'
          }`}
        >
          {following ? (
            <>
              <UserCheck className="w-3.5 h-3.5" />
              <span>Suivi</span>
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              <span>Suivre</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
