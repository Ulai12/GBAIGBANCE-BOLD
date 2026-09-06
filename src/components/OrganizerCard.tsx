import { BadgeCheck, Calendar } from 'lucide-react';
import type { Organization } from '@/types';
import { formatNumber } from '@/utils/format';
import { useApp } from '@/hooks/useApp';

interface OrganizerCardProps {
  organization: Organization;
  onClick?: () => void;
}

export function OrganizerCard({ organization, onClick }: OrganizerCardProps) {
  const { language } = useApp();
  const isVerified = organization.verification_status === 'verified';

  return (
    <div
      onClick={onClick}
      className="glass-card rounded-3xl p-4 cursor-pointer group transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-64 shrink-0"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={organization.logo_url || 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=100'}
            alt={organization.name}
            className="w-14 h-14 rounded-2xl object-cover"
          />
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-[#6600FF] rounded-full p-0.5">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-[#171726] line-clamp-1">{organization.name}</h3>
          <p className="text-xs text-[#7b7e8f]">{organization.city}</p>
        </div>
      </div>
      <p className="text-xs text-[#4d4d5d] mt-3 line-clamp-2">{organization.description}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-[#7b7e8f]">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatNumber(organization.events_count, language)} événements
        </span>
        <span>{formatNumber(organization.followers_count, language)} followers</span>
      </div>
    </div>
  );
}
