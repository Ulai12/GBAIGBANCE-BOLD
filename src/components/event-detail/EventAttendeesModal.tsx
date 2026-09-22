import React, { useState } from 'react';
import { X, Search, Users, Sparkles, Ticket, UserPlus, UserCheck, ShieldCheck, MapPin } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import type { AttendeeProfile } from '@/services/attendeesService';
import type { Profile } from '@/types';

interface EventAttendeesModalProps {
  isOpen: boolean;
  eventTitle: string;
  attendees: AttendeeProfile[];
  friendsCount: number;
  onClose: () => void;
  onSelectProfile: (profile: Profile) => void;
  onToggleFollow: (userId: string) => Promise<boolean>;
}

export const EventAttendeesModal: React.FC<EventAttendeesModalProps> = ({
  isOpen,
  eventTitle,
  attendees,
  friendsCount,
  onClose,
  onSelectProfile,
  onToggleFollow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'friends' | 'tickets'>('all');
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [pendingMap, setPendingMap] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  // Filtrage selon onglet et recherche
  const filtered = attendees.filter((a) => {
    // Filtre onglet
    if (activeTab === 'friends' && !a.isFriend && !followingMap[a.id]) return false;
    if (activeTab === 'tickets' && !a.hasTicket) return false;

    // Filtre recherche
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.city && a.city.toLowerCase().includes(q)) ||
      (a.role && a.role.toLowerCase().includes(q))
    );
  });

  const handleFollowClick = async (e: React.MouseEvent, attendee: AttendeeProfile) => {
    e.stopPropagation();
    if (pendingMap[attendee.id]) return;

    const currentStatus = followingMap[attendee.id] ?? attendee.isFriend;
    // Optimistic UI update
    setFollowingMap((prev) => ({ ...prev, [attendee.id]: !currentStatus }));
    setPendingMap((prev) => ({ ...prev, [attendee.id]: true }));

    try {
      const isNowFollowing = await onToggleFollow(attendee.id);
      setFollowingMap((prev) => ({ ...prev, [attendee.id]: isNowFollowing }));
    } catch {
      // Revert in case of error
      setFollowingMap((prev) => ({ ...prev, [attendee.id]: currentStatus }));
    } finally {
      setPendingMap((prev) => ({ ...prev, [attendee.id]: false }));
    }
  };

  const handleRowClick = (attendee: AttendeeProfile) => {
    const profileObj: Profile = {
      id: attendee.id,
      name: attendee.name,
      email: null,
      phone: null,
      avatar_url: attendee.avatar_url,
      role: (attendee.role as Profile['role']) || 'user',
      city: attendee.city || 'Lomé',
      country: attendee.country || 'TG',
      bio: attendee.bio || null,
      created_at: attendee.joinedAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSelectProfile(profileObj);
  };

  const ticketCount = attendees.filter((a) => a.hasTicket).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full sm:max-w-2xl h-[92vh] sm:h-[84vh] rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#120F24] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Poignée tactile mobile & En-tête de la page */}
        <div className="pt-3 px-5 sm:px-6 pb-3 border-b border-black/5 dark:border-white/10">
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-white/20 mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#6600FF]/10 dark:bg-[#6600FF]/25 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#1A1A2E] dark:text-white tracking-tight flex items-center gap-2">
                  <span>Participants</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#6600FF]/10 text-[#6600FF] dark:text-purple-300">
                    {attendees.length}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px] sm:max-w-md">
                  {eventTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center text-gray-500 dark:text-gray-300 transition-colors"
              aria-label="Fermer la liste des participants"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barre de recherche iOS */}
          <div className="mt-3 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, ville ou rôle..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 text-xs sm:text-sm text-[#1A1A2E] dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#6600FF]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Onglets de filtrage Apple */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1A1A2E] text-white dark:bg-white dark:text-[#1A1A2E] shadow-sm'
                  : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10'
              }`}
            >
              Tous ({attendees.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'friends'
                  ? 'bg-[#6600FF] text-white shadow-md shadow-[#6600FF]/30'
                  : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Amis en premier ({friendsCount})</span>
            </button>

            {ticketCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  activeTab === 'tickets'
                    ? 'bg-[#1A1A2E] text-white dark:bg-white dark:text-[#1A1A2E] shadow-sm'
                    : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-black/10'
                }`}
              >
                <Ticket className="w-3 h-3" />
                <span>Billets confirmés ({ticketCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Liste défilante des participants */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-500 dark:text-gray-400 space-y-2">
              <Users className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-sm font-semibold">Aucun participant ne correspond</p>
              <p className="text-xs text-gray-400">Essayez un autre mot-clé ou modifiez le filtre actif.</p>
            </div>
          ) : (
            filtered.map((attendee) => {
              const isCurrentlyFollowing = followingMap[attendee.id] ?? attendee.isFriend;

              return (
                <div
                  key={attendee.id}
                  onClick={() => handleRowClick(attendee)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                    attendee.isFriend || isCurrentlyFollowing
                      ? 'bg-[#6600FF]/[0.03] dark:bg-[#6600FF]/[0.08] border-[#6600FF]/25 hover:border-[#6600FF]/50'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/5 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {/* Avatar & Infos utilisateur */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <UserAvatar
                        src={attendee.avatar_url}
                        name={attendee.name}
                        role={attendee.role}
                        size="md"
                        className={
                          attendee.isFriend || isCurrentlyFollowing
                            ? 'ring-2 ring-[#6600FF] ring-offset-2 ring-offset-white dark:ring-offset-[#120F24]'
                            : ''
                        }
                      />
                      {(attendee.isFriend || isCurrentlyFollowing) && (
                        <div
                          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#6600FF] text-white flex items-center justify-center ring-2 ring-white dark:ring-[#120F24]"
                          title="Ami suivi"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-extrabold text-[#1A1A2E] dark:text-white truncate">
                          {attendee.name}
                        </p>
                        {attendee.isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                            Vous
                          </span>
                        )}
                        {attendee.hasTicket && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Billet confirmé" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {(attendee.isFriend || isCurrentlyFollowing) && (
                          <span className="font-extrabold text-[#6600FF] dark:text-[#A78BFA]">
                            Ami(e)
                          </span>
                        )}
                        {attendee.city && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            {attendee.city}
                          </span>
                        )}
                        {attendee.hasTicket && attendee.ticketType && (
                          <span className="truncate text-emerald-600 dark:text-emerald-400 font-medium">
                            • {attendee.ticketType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bouton Suivre / Suivi (sauf pour son propre compte) */}
                  {!attendee.isSelf && (
                    <button
                      type="button"
                      onClick={(e) => handleFollowClick(e, attendee)}
                      className={`min-h-[36px] px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0 active:scale-95 cursor-pointer ${
                        isCurrentlyFollowing
                          ? 'bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-red-500/10 hover:text-red-600 border border-black/10 dark:border-white/10'
                          : 'bg-[#6600FF] text-white hover:bg-[#5200cc] shadow-xs shadow-[#6600FF]/30'
                      }`}
                    >
                      {isCurrentlyFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Abonné</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Suivre</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page informatif avec total */}
        <div className="p-3.5 px-6 border-t border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{attendees.length} participants max affichés</span>
          <span className="text-[11px] font-bold text-[#6600FF] dark:text-[#A78BFA]">
            Vos amis apparaissent en tête
          </span>
        </div>
      </div>
    </div>
  );
};
