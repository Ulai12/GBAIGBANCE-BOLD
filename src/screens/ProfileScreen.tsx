import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Moon, Sun, Globe, LogOut, Calendar, Settings, BadgeCheck, Music2, Building2,
  Pencil, Bell, BellRing, Heart, Check, X, Loader2, ChevronRight, Sparkles, Ticket, Users,
} from 'lucide-react';
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

/* ── Liquid Glass design tokens (injected once) ───────────────── */
const LIQUID_GLASS_CSS = `
  .lg-root { position: relative; isolation: isolate; overflow-x: clip; }
  .lg-mesh {
    position: fixed; inset: 0; z-index: -2; pointer-events: none;
    background:
      radial-gradient(60% 45% at 15% 0%, rgba(102,0,255,.45), transparent 70%),
      radial-gradient(50% 40% at 90% 10%, rgba(255,0,128,.30), transparent 70%),
      radial-gradient(55% 45% at 50% 55%, rgba(0,190,255,.22), transparent 70%),
      radial-gradient(45% 40% at 10% 85%, rgba(255,140,0,.22), transparent 70%),
      linear-gradient(180deg, #f4f2ff 0%, #eef4ff 100%);
  }
  .dark .lg-mesh {
    background:
      radial-gradient(60% 45% at 15% 0%, rgba(102,0,255,.55), transparent 70%),
      radial-gradient(50% 40% at 90% 10%, rgba(255,0,128,.35), transparent 70%),
      radial-gradient(55% 45% at 50% 55%, rgba(0,190,255,.25), transparent 70%),
      radial-gradient(45% 40% at 10% 85%, rgba(255,140,0,.25), transparent 70%),
      linear-gradient(180deg, #0b0b18 0%, #0e0a1f 100%);
  }
  .lg-orb {
    position: fixed; border-radius: 9999px; filter: blur(70px);
    z-index: -1; pointer-events: none; opacity: .5;
    animation: lg-drift 18s ease-in-out infinite alternate;
  }
  @keyframes lg-drift {
    from { transform: translate3d(0,0,0) scale(1); }
    to   { transform: translate3d(30px,-40px,0) scale(1.15); }
  }

  /* Core liquid glass surface */
  .lg-glass {
    position: relative;
    background: linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,255,255,.42));
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255,255,255,.65);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.9),
      inset 0 -1px 0 rgba(255,255,255,.25),
      0 10px 30px -12px rgba(30,10,80,.25);
    transition: transform .25s cubic-bezier(.34,1.56,.64,1), box-shadow .25s ease;
  }
  .dark .lg-glass {
    background: linear-gradient(145deg, rgba(255,255,255,.14), rgba(255,255,255,.05));
    border-color: rgba(255,255,255,.14);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.22),
      inset 0 -1px 0 rgba(255,255,255,.05),
      0 10px 30px -12px rgba(0,0,0,.6);
  }
  .lg-glass:active { transform: scale(.975); }

  /* Specular highlight sweep on the top edge */
  .lg-glass::before {
    content: ''; position: absolute; inset: 0 0 auto 0; height: 50%;
    border-radius: inherit; pointer-events: none;
    background: linear-gradient(180deg, rgba(255,255,255,.35), transparent);
    opacity: .7;
  }

  .lg-glass-strong {
    background: linear-gradient(145deg, rgba(255,255,255,.88), rgba(255,255,255,.6));
  }
  .dark .lg-glass-strong {
    background: linear-gradient(145deg, rgba(40,32,70,.75), rgba(20,16,40,.6));
  }

  .lg-icon-chip {
    width: 2.75rem; height: 2.75rem; border-radius: 1rem;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(145deg, rgba(102,0,255,.18), rgba(102,0,255,.07));
    border: 1px solid rgba(102,0,255,.2);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.5);
    flex-shrink: 0;
  }

  .lg-pill {
    background: linear-gradient(145deg, rgba(102,0,255,.16), rgba(255,0,128,.10));
    border: 1px solid rgba(102,0,255,.22);
    -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  }

  .lg-fade-up { animation: lg-fade-up .5s cubic-bezier(.22,1,.36,1) both; }
  @keyframes lg-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lg-stagger-1 { animation-delay: .05s } .lg-stagger-2 { animation-delay: .12s }
  .lg-stagger-3 { animation-delay: .19s } .lg-stagger-4 { animation-delay: .26s }
  .lg-stagger-5 { animation-delay: .33s } .lg-stagger-6 { animation-delay: .40s }
`;

export function ProfileScreen({ onEventClick, onLogin, onOrganizerDashboard, onOpenNotifications, onOpenNotificationSettings, onOpenSubscriptions, onToast }: ProfileScreenProps) {
  const { user, session, theme, toggleTheme, language, setLanguage, signOut, t, refreshProfile } = useApp();
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitations, setInvitations] = useState<(EventCollaborator & { event?: Event })[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    supabase
      .from('events')
      .select('*')
      .eq('organizer_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (requestId !== requestIdRef.current) return;
        setMyEvents((data as Event[]) || []);
        setLoading(false);
      });
    fetchPendingInvitations(user.id).then(setInvitations).catch(() => setInvitations([]));
    return () => { requestIdRef.current++; };
  }, [user]);

  const handleRespond = useCallback(async (invId: string, status: 'accepted' | 'declined') => {
    setResponding(invId);
    try {
      await respondToInvitation(invId, status);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
      refreshProfile();
    } catch {
      onToast({ message: 'Impossible de répondre à l’invitation.', type: 'error' });
    } finally {
      setResponding(null);
    }
  }, [refreshProfile, onToast]);

  if (!session || !user) {
    return (
      <div className="lg-root min-h-screen flex flex-col items-center justify-center px-6 pb-32">
        <style>{LIQUID_GLASS_CSS}</style>
        <div className="lg-mesh" />
        <div className="lg-fade-up w-28 h-28 rounded-[2.5rem] lg-glass flex items-center justify-center mb-8">
          <Sparkles className="w-12 h-12 text-[#6600FF]" />
        </div>
        <h1 className="lg-fade-up lg-stagger-1 text-3xl font-extrabold text-center bg-gradient-to-r from-[#6600FF] via-[#B300FF] to-[#FF0080] bg-clip-text text-transparent mb-3">
          Bienvenue sur Gbaigbance
        </h1>
        <p className="lg-fade-up lg-stagger-2 text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xs leading-relaxed">
          Réservez vos billets, suivez vos artistes et créez vos événements.
        </p>
        <button
          onClick={onLogin}
          className="lg-fade-up lg-stagger-3 w-full max-w-xs py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#6600FF] to-[#B300FF] shadow-[0_15px_40px_-10px_rgba(102,0,255,.6)] active:scale-95 transition-transform"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const isCreator = user.role === 'organizer' || user.role === 'artist';
  const roleLabel = user.role === 'artist' ? 'Artiste' : user.role === 'organizer' ? 'Organisateur' : 'Participant';
  const RoleIcon = user.role === 'artist' ? Music2 : Building2;

  const glassRow = 'w-full rounded-3xl lg-glass p-4 flex items-center justify-between gap-3 text-left';
  const darkText = 'text-[#171726] dark:text-gray-100';
  const subText = 'text-xs text-gray-500 dark:text-gray-400';

  return (
    <div className="lg-root min-h-screen pb-32">
      <style>{LIQUID_GLASS_CSS}</style>
      <div className="lg-mesh" />
      {/* Orbes flottants */}
      <div className="lg-orb w-72 h-72 -top-20 -left-20" style={{ background: 'rgba(102,0,255,.35)' }} />
      <div className="lg-orb w-64 h-64 top-40 -right-24" style={{ background: 'rgba(255,0,128,.25)', animationDelay: '-6s' }} />

      <div className="max-w-md mx-auto">
        <div className="lg-fade-up">
          <ProfileHeader profile={user} eventsCount={myEvents.length} />
        </div>

        {/* Modifier le profil + badge rôle */}
        <div className="px-5 mt-4 space-y-3">
          <button onClick={() => setEditOpen(true)} className={`${glassRow} lg-fade-up lg-stagger-1`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="lg-icon-chip"><Pencil className="w-5 h-5 text-[#6600FF]" /></div>
              <div className="min-w-0">
                <p className={`font-bold truncate ${darkText}`}>Modifier le profil</p>
                <p className={`${subText} truncate`}>Nom, photo, bio, localisation</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
          </button>

          <div className="lg-fade-up lg-stagger-2 flex flex-wrap gap-2">
            <div className="lg-pill inline-flex items-center gap-2 px-4 py-2 rounded-full">
              <RoleIcon className="w-4 h-4 text-[#6600FF]" />
              <span className={`text-sm font-bold ${darkText}`}>{roleLabel}</span>
              {isCreator && <BadgeCheck className="w-4 h-4 text-[#6600FF]" />}
            </div>
            <div className="lg-pill inline-flex items-center gap-2 px-4 py-2 rounded-full">
              <Ticket className="w-4 h-4 text-[#6600FF]" />
              <span className={`text-sm font-bold ${darkText}`}>{myEvents.length} événement{myEvents.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Invitations */}
        {invitations.length > 0 && (
          <div className="px-5 mt-6 lg-fade-up lg-stagger-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-1">
              <Users className="w-4 h-4" /> Invitations ({invitations.length})
            </h2>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <div key={inv.id} className="rounded-3xl lg-glass p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/10">
                      {inv.event?.cover_url && <img src={inv.event.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm line-clamp-1 ${darkText}`}>{inv.event?.title}</p>
                      <p className={subText}>{inv.role === 'performer' ? "Invité en tant qu'artiste" : 'Invité en tant que co-organisateur'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleRespond(inv.id, 'accepted')}
                      disabled={responding !== null}
                      className="flex-1 py-2.5 rounded-full font-semibold text-sm text-white bg-gradient-to-r from-[#6600FF] to-[#B300FF] shadow-[0_8px_20px_-8px_rgba(102,0,255,.7)] flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition"
                    >
                      {responding === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Accepter</>}
                    </button>
                    <button
                      onClick={() => handleRespond(inv.id, 'declined')}
                      disabled={responding !== null}
                      className="flex-1 py-2.5 rounded-full font-semibold text-sm bg-white/50 dark:bg-white/10 border border-white/60 dark:border-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95 transition"
                    >
                      <X className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard créateur */}
        {isCreator && (
          <div className="px-5 mt-6 lg-fade-up lg-stagger-4">
            <button onClick={onOrganizerDashboard} className={glassRow}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="lg-icon-chip">
                  {user.role === 'artist' ? <Music2 className="w-5 h-5 text-[#6600FF]" /> : <Settings className="w-5 h-5 text-[#6600FF]" />}
                </div>
                <div className="min-w-0">
                  <p className={`font-bold truncate ${darkText}`}>{user.role === 'artist' ? 'Espace artiste' : 'Dashboard organisateur'}</p>
                  <p className={`${subText} truncate`}>Gérez vos événements et collaborations</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </button>
          </div>
        )}

        {/* Menu principal — style liste groupée iOS */}
        <div className="px-5 mt-6 lg-fade-up lg-stagger-5">
          <div className="rounded-3xl lg-glass lg-glass-strong overflow-hidden divide-y divide-white/50 dark:divide-white/10">
            {[
              { icon: Bell, title: t('common', 'notifications'), sub: language === 'fr' ? 'Voir vos notifications' : 'View your notifications', onClick: onOpenNotifications },
              { icon: BellRing, title: t('settings', 'notifSettings.title'), sub: language === 'fr' ? 'Choisir les types à recevoir' : 'Choose which to receive', onClick: onOpenNotificationSettings },
              { icon: Heart, title: t('settings', 'subscriptions.title'), sub: language === 'fr' ? 'Artistes et organisateurs suivis' : 'Followed artists and organizers', onClick: onOpenSubscriptions },
            ].map((item) => (
              <button key={item.title} onClick={item.onClick} className="w-full p-4 flex items-center gap-3 text-left active:bg-white/40 dark:active:bg-white/5 transition-colors">
                <div className="lg-icon-chip"><item.icon className="w-5 h-5 text-[#6600FF]" /></div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold truncate ${darkText}`}>{item.title}</p>
                  <p className={`${subText} truncate`}>{item.sub}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Mes événements */}
        <div className="px-5 mt-8 lg-fade-up lg-stagger-6">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className={`flex items-center gap-2 text-lg font-extrabold ${darkText}`}>
              <Calendar className="w-5 h-5 text-[#6600FF]" /> Mes événements
            </h2>
            <span className="lg-pill px-3 py-1 rounded-full text-xs font-bold text-[#6600FF]">{myEvents.length}</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2].map((i) => <div key={i} className="skeleton h-56 rounded-3xl" />}
            </div>
          ) : myEvents.length === 0 ? (
            <div className="rounded-3xl lg-glass p-10 text-center">
              <div className="w-16 h-16 rounded-2xl lg-icon-chip mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#6600FF]" />
              </div>
              <p className={`text-sm font-semibold ${darkText}`}>Aucun événement créé</p>
              <p className={`text-xs mt-1 ${subText}`}>Utilisez le bouton + pour lancer le premier</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {myEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => onEventClick(event)} />)}
            </div>
          )}
        </div>

        {/* Paramètres */}
        <div className="px-5 mt-8 space-y-3">
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 px-1">Paramètres</h2>

          <button onClick={toggleTheme} className={glassRow}>
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-[#6600FF]" /> : <Sun className="w-5 h-5 text-[#6600FF]" />}
              <span className={`font-semibold ${darkText}`}>Thème</span>
            </div>
            <span className="lg-pill px-3 py-1 rounded-full text-xs font-bold text-[#6600FF]">{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
          </button>

          <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className={glassRow}>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-[#6600FF]" />
              <span className={`font-semibold ${darkText}`}>Langue</span>
            </div>
            <span className="lg-pill px-3 py-1 rounded-full text-xs font-bold text-[#6600FF]">{language === 'fr' ? 'Français' : 'English'}</span>
          </button>

          <button onClick={signOut} className="w-full rounded-3xl p-4 flex items-center gap-3 font-semibold text-red-500 bg-red-500/10 border border-red-500/20 backdrop-blur-xl active:scale-95 transition">
            <LogOut className="w-5 h-5" /> Se déconnecter
          </button>
        </div>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} onToast={onToast} />
    </div>
  );
}