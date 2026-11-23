import React from 'react';
import { Users, ChevronRight, Sparkles } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useApp } from '@/hooks/useApp';
import type { AttendeeProfile } from '@/services/attendeesService';

interface EventAttendeesSectionProps {
  attendees: AttendeeProfile[];
  totalCount: number;
  friendsCount: number;
  viewsCount?: number;
  loading: boolean;
  onOpenModal: () => void;
}

export const EventAttendeesSection: React.FC<EventAttendeesSectionProps> = ({
  attendees,
  totalCount,
  friendsCount,
  viewsCount,
  loading,
  onOpenModal,
}) => {
  const { language, t } = useApp();
  const displayAttendees = attendees.slice(0, 5);
  const remainingCount = Math.max(0, totalCount - displayAttendees.length);

  return (
    <div
      onClick={onOpenModal}
      className="p-4 sm:p-5 rounded-[24px] bg-white dark:bg-[#151126] border border-black/10 dark:border-white/10 hover:border-[#6600FF]/40 shadow-xs hover:shadow-md transition-all cursor-pointer select-none group"
      role="button"
      tabIndex={0}
      aria-label={t('events', 'detail.attendees.viewFullList')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenModal();
        }
      }}
    >
      {/* Ligne d'en-tête avec participants et vues intégrées */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-[#1A1A2E] dark:text-white tracking-tight">
                {t('events', 'detail.attendees.title')}
              </h3>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                {totalCount > 0
                  ? t('events', 'detail.attendees.confirmed').replace('{count}', String(totalCount))
                  : t('events', 'detail.attendees.join')}
              </span>
            </div>
            {typeof viewsCount === 'number' && viewsCount > 0 && (
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                {t('events', 'detail.attendees.views').replace(
                  '{count}',
                  viewsCount.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-[#6600FF] dark:text-[#A78BFA] group-hover:translate-x-0.5 transition-transform">
          <span>{t('events', 'detail.attendees.viewAll')}</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Alerte conviviale si des amis participent */}
      {friendsCount > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-gradient-to-r from-[#6600FF]/10 via-[#9333EA]/10 to-transparent border border-[#6600FF]/20 flex items-center gap-2 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 animate-pulse" />
          <p className="font-extrabold text-[#6600FF] dark:text-purple-300">
            {friendsCount === 1
              ? t('events', 'detail.attendees.oneFriendParticipates')
              : t('events', 'detail.attendees.friendsParticipate').replace('{count}', String(friendsCount))}
          </p>
        </div>
      )}

      {/* Cluster d'avatars superposés */}
      <div className="mt-3.5 flex items-center justify-between gap-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse border-2 border-white dark:border-[#151126]"
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-medium">{t('events', 'detail.attendees.loading')}</span>
          </div>
        ) : displayAttendees.length > 0 ? (
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2.5 overflow-hidden py-1">
              {displayAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="relative transition-transform hover:scale-110 hover:z-10"
                >
                  <UserAvatar
                    src={attendee.avatar_url}
                    name={attendee.name}
                    role={attendee.role}
                    size="sm"
                    className={`border-2 border-white dark:border-[#151126] shadow-sm ${
                      attendee.isFriend
                        ? 'ring-2 ring-[#6600FF]'
                        : ''
                    }`}
                  />
                  {attendee.isFriend && (
                    <div
                      className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#6600FF] ring-1 ring-white dark:ring-[#151126] flex items-center justify-center text-[8px] text-white"
                      title={t('events', 'detail.attendees.friend')}
                    >
                      ★
                    </div>
                  )}
                </div>
              ))}

              {remainingCount > 0 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 border-2 border-white dark:border-[#151126] flex items-center justify-center text-[10px] font-black text-gray-700 dark:text-gray-200 shadow-sm shrink-0">
                  +{remainingCount}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px] sm:max-w-xs">
              {friendsCount > 0
                ? t('events', 'detail.attendees.otherAttendees')
                    .replace('{name}', attendees[0]?.name || '')
                    .replace('{count}', String(totalCount - 1))
                : t('events', 'detail.attendees.registeredCount').replace('{count}', String(totalCount))}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('events', 'detail.attendees.beFirst')}
          </p>
        )}
      </div>
    </div>
  );
};
