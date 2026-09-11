import { useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Globe,
  Sparkles,
  Bell,
  LogOut,
  ChevronRight,
  User,
  Inbox,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { PWAInstallButton } from '@/components/PWAInstallButton';
import { COUNTRY_FLAGS } from '@/constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAISettings?: () => void;
  onOpenNotifications?: () => void;
  onOpenNotificationSettings?: () => void;
  onEditProfile?: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onOpenAISettings,
  onOpenNotifications,
  onOpenNotificationSettings,
  onEditProfile,
}: SettingsModalProps) {
  const { user, theme, toggleTheme, language, setLanguage, signOut, t } = useApp();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#F8F7FC] dark:bg-[#12111D] rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl border border-black/10 dark:border-white/10 overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header style iOS sheet */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#181624]/80 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-black text-[#17131D] dark:text-white tracking-tight">
              Paramètres
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Gbaigbance Système & Préférences
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-gray-200 transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="p-6 overflow-y-auto space-y-5 no-scrollbar">
          {/* Section Profil Rapide */}
          {user && (
            <div className="p-4 rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#6600FF]/15 flex items-center justify-center shrink-0 ring-2 ring-[#6600FF]/20">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-[#6600FF]" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-[#17131D] dark:text-white text-sm truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <span>{COUNTRY_FLAGS[user.country] || '🌍'} {user.city}</span>
                    <span>·</span>
                    <span className="capitalize text-[#6600FF] font-semibold">{t('common', user.role)}</span>
                  </p>
                </div>
              </div>
              {onEditProfile && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProfile();
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold text-[#17131D] dark:text-white hover:bg-gray-200 transition-all shrink-0"
                >
                  Modifier
                </button>
              )}
            </div>
          )}

          {/* Groupe 1: Préférences d'affichage */}
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Affichage & Langue
            </h3>
            <div className="rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.06] shadow-xs">
              {/* Thème */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">Thème d'affichage</p>
                    <p className="text-xs text-gray-400">Mode sombre ou clair</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-bold text-[#17131D] dark:text-white active:scale-95 transition-all"
                >
                  {theme === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
                </button>
              </div>

              {/* Langue */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">Langue de l'interface</p>
                    <p className="text-xs text-gray-400">Français ou English</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
                  className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-xs font-bold text-[#17131D] dark:text-white uppercase active:scale-95 transition-all"
                >
                  {language === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
                </button>
              </div>
            </div>
          </div>

          {/* Groupe 2: Intelligence Artificielle (Accès Stratégique Direct) */}
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Intelligence Artificielle
            </h3>
            <div className="rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAISettings?.();
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-[#17131D] dark:text-white">
                        Google Gemini & Maps Grounding
                      </p>
                      <span className="px-1.5 py-0.5 rounded-md bg-[#6600FF]/15 text-[#6600FF] text-[9px] font-extrabold">
                        Actif
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Gérer la clé API, choix du modèle, concierge & lieux
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Groupe 3: Notifications & Application */}
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              Notifications & Application
            </h3>
            <div className="rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.06] shadow-xs">
              {/* Boîte de notifications */}
              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenNotifications();
                  }}
                  className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Inbox className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#17131D] dark:text-white">
                        Boîte de notifications
                      </p>
                      <p className="text-xs text-gray-400">
                        Historique des annonces et invitations
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              )}

              {/* Paramètres de notifications */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNotificationSettings?.();
                }}
                className="w-full p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-[#6600FF] flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#17131D] dark:text-white">
                      Alertes & Rappels
                    </p>
                    <p className="text-xs text-gray-400">
                      Rappels de billets, sorties d'artistes
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>

              {/* Installer l'app PWA */}
              <div className="p-2">
                <PWAInstallButton variant="menu-item" />
              </div>
            </div>
          </div>

          {/* Groupe 4: Sécurité & Déconnexion */}
          {user && (
            <div>
              <div className="rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] overflow-hidden shadow-xs">
                {confirmSignOut ? (
                  <div className="p-4 space-y-3 bg-red-50/50 dark:bg-red-950/20">
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 text-center">
                      Voulez-vous vraiment vous déconnecter de votre compte Gbaigbance ?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          signOut();
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all"
                      >
                        Confirmer la déconnexion
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSignOut(false)}
                        className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmSignOut(true)}
                    className="w-full p-4 flex items-center justify-between text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                        <LogOut className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-bold">Se déconnecter</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-red-300" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Groupe 5: Crédits & Système */}
          <div>
            <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2 ml-1">
              À Propos & Crédits
            </h3>
            <div className="rounded-[1.8rem] bg-white dark:bg-[#1C1A29] border border-black/[0.05] dark:border-white/[0.08] p-4 text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Version</span>
                <span className="font-bold text-[#17131D] dark:text-white bg-purple-50 dark:bg-purple-900/30 text-[#6600FF] dark:text-purple-300 px-2.5 py-0.5 rounded-full text-[11px]">
                  v3.5.0 · Back-Stack Router & Full Event Studio
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Routage & Navigation</span>
                <span className="font-semibold text-[#6600FF] dark:text-purple-300">
                  Pile d'historique contextuelle (Back Stack) + Sync popstate natif
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Gestion Événement</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Édition complète (billetterie, collabs, lieu, dates, médias vidéo/photos)
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Fiche Événement iOS 27</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Aura frosted glass, lecteur vidéo, galerie, pass & dispo temps réel
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Navigation Dock</span>
                <span className="font-semibold text-[#6600FF] dark:text-purple-300">
                  Apple iOS 27 Fluid Dock (Stacking z-index & auto-hide sous modals)
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Recherche & Explorer</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  En-tête unifiée (Favoris/Billets) + Taxonomie Home avec icônes Lucide
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Partage & Social</span>
                <span className="font-semibold text-[#6600FF] dark:text-purple-300">
                  Web Share API natif + Fiche iOS 27 (WhatsApp, 𝕏, Telegram)
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Deep Linking</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Résolution URL instantanée (?event=...)
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Architecture</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  PWA (Workbox Prompt) + Private IDB Store
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Billetterie Hors-ligne</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  QR Codes persistés dans IndexedDB privé
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Affichage & Rendu</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Zéro squelette plein écran · Navigation 0ms instantanée
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Cache Chaud Étendu</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Home, Explorer, Favoris, Billets & Profil
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">APIs & Backend</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Supabase (RPC bookTicket) · Gemini AI · Sentry
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Traduction</span>
                <span className="font-semibold text-[#17131D] dark:text-gray-200">
                  Français · English
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-t border-black/[0.04] dark:border-white/[0.06] pt-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Licence</span>
                <span className="text-gray-600 dark:text-gray-300">
                  Propriétaire · Gbaïgbancê © 2026
                </span>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-1 pb-2">
            <p className="text-[11px] text-gray-400 font-medium">
              Gbaïgbancê v3.5.0 · Apple iOS 27 Fluid Experience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
