import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Bell,
  MessageSquare,
  MessageCircle,
  HelpCircle,
  UserPlus,
  Check,
  Calendar,
  Smartphone,
  Loader2,
  Clock,
  Send,
  Radio,
} from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from '@/services/events';
import {
  requestPushNotificationPermission,
  getPushPermissionState,
} from '@/services/pushNotificationService';
import { triggerTestPushNotification } from '@/services/eventReminderService';
import { haptic } from '@/hooks/useHaptics';
import type { ToastData } from '@/components/Toast';

interface NotificationSettingsScreenProps {
  onBack: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
}

interface ToggleItem {
  key: keyof NotificationPreferences;
  labelKey: string;
  descKey: string;
  icon: typeof Bell;
  color: string;
}

const toggles: ToggleItem[] = [
  { key: 'event_reminders', labelKey: 'eventReminders', descKey: 'eventRemindersDesc', icon: Calendar, color: 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' },
  { key: 'new_comments', labelKey: 'newComments', descKey: 'newCommentsDesc', icon: MessageSquare, color: 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' },
  { key: 'comment_replies', labelKey: 'commentReplies', descKey: 'commentRepliesDesc', icon: MessageCircle, color: 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400' },
  { key: 'new_questions', labelKey: 'newQuestions', descKey: 'newQuestionsDesc', icon: HelpCircle, color: 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400' },
  { key: 'question_answered', labelKey: 'questionAnswered', descKey: 'questionAnsweredDesc', icon: HelpCircle, color: 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400' },
  { key: 'new_followers', labelKey: 'newFollowers', descKey: 'newFollowersDesc', icon: UserPlus, color: 'bg-pink-100 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400' },
  { key: 'invite_accepted', labelKey: 'inviteAccepted', descKey: 'inviteAcceptedDesc', icon: Check, color: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' },
];

export function NotificationSettingsScreen({ onBack, onToast }: NotificationSettingsScreenProps) {
  const { user, t } = useApp();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermissionState(getPushPermissionState());
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotificationPreferences(user.id)
      .then((p) => {
        setPrefs(p);
      })
      .catch(() => onToast({ message: t('settings', 'notifSettings.loadError'), type: 'error' }))
      .finally(() => setLoading(false));
  }, [user, onToast, t]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!prefs || !user) return;
    haptic.selection();

    // Cas particulier du Push PWA : demander la permission navigateur si activé
    if (key === 'push_enabled' && !prefs.push_enabled) {
      const granted = await requestPushNotificationPermission();
      setPermissionState(getPushPermissionState());
      if (!granted) {
        onToast({
          message: "L'autorisation des notifications a été refusée ou ignorée dans votre navigateur.",
          type: 'info',
        });
        return;
      }
      onToast({
        message: 'Notifications Web Push activées ! Rappels et alertes programmés 🎉',
        type: 'success',
      });
    }

    const newValue = !prefs[key];
    setPrefs({ ...prefs, [key]: newValue });
    setSaving(true);
    try {
      await updateNotificationPreferences(user.id, { [key]: newValue });
    } catch {
      setPrefs({ ...prefs, [key]: !newValue });
      onToast({ message: t('settings', 'notifSettings.saveError'), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPush = async () => {
    setTestingPush(true);
    haptic.selection();
    try {
      const ok = await triggerTestPushNotification();
      if (ok) {
        onToast({ message: 'Notification test envoyée avec succès sur votre appareil !', type: 'success' });
      } else {
        onToast({
          message: 'Activez les notifications dans votre navigateur pour recevoir le test en direct.',
          type: 'info',
        });
      }
    } catch {
      onToast({ message: "Erreur lors de l'envoi de la notification test", type: 'error' });
    } finally {
      setTestingPush(false);
    }
  };

  const Toggle = ({ enabled, onClick }: { enabled: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
        enabled ? 'bg-[#6600FF]' : 'bg-gray-300 dark:bg-zinc-700'
      }`}
      aria-pressed={enabled}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
        <div className="max-w-md mx-auto px-5 pt-safe-header pb-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-[#1A1A2E] dark:text-white" />
          </button>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6600FF]" />
            <h1 className="text-lg font-extrabold text-[#1A1A2E] dark:text-white">
              {t('settings', 'notifSettings.title')}
            </h1>
          </div>
          {saving && <Loader2 className="w-4 h-4 text-[#6600FF] animate-spin ml-auto" />}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-3 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" />
          </div>
        ) : prefs ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('settings', 'notifSettings.subtitle')}</p>

            {/* SECTION WEB PUSH PWA PRIORITAIRE */}
            <div className="mb-6 card p-4 border border-[#6600FF]/30 bg-gradient-to-br from-[#6600FF]/5 via-purple-500/5 to-transparent space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#6600FF] to-[#A855F7] flex items-center justify-center text-white shrink-0 shadow-purple">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#1A1A2E] dark:text-white text-sm">
                      Notifications Web Push (PWA)
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#6600FF]/15 text-[#6600FF] dark:text-purple-300">
                      Natif
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Recevez vos alertes même si l'application est fermée.
                  </p>
                </div>
                <Toggle
                  enabled={prefs.push_enabled || permissionState === 'granted'}
                  onClick={() => handleToggle('push_enabled')}
                />
              </div>

              {/* DÉTAIL DES DEUX TYPES DE RAPPELS AUTOMATIQUES DEMANDÉS */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.08]">
                <div className="flex items-start gap-2.5 p-2.5 bg-white/70 dark:bg-white/5 rounded-xl text-xs">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#1A1A2E] dark:text-white">Rappel 24h & 2h automatique</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-[11px]">
                      Alerte la veille et 2 heures avant chaque événement pour lequel vous détenez un billet valide.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-white/70 dark:bg-white/5 rounded-xl text-xs">
                  <Radio className="w-4 h-4 text-[#6600FF] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#1A1A2E] dark:text-white">Alerte nouvelle date d'artiste</span>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-[11px]">
                      Notification push immédiate dès qu'un artiste ou festival que vous suivez annonce une date.
                    </p>
                  </div>
                </div>
              </div>

              {/* BOUTON TEST DIRECT */}
              <button
                type="button"
                onClick={handleTestPush}
                disabled={testingPush}
                className="w-full py-2.5 px-4 rounded-xl bg-[#6600FF]/10 hover:bg-[#6600FF]/20 text-[#6600FF] dark:text-purple-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              >
                {testingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Tester la notification push sur cet appareil</span>
              </button>
            </div>

            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
              Préférences par catégorie
            </h2>

            <div className="space-y-2">
              {toggles.map((item) => {
                const Icon = item.icon;
                const enabled = prefs[item.key] as boolean;
                return (
                  <div key={item.key} className="card p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1A1A2E] dark:text-white text-sm">
                        {t('settings', `notifSettings.${item.labelKey}`)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings', `notifSettings.${item.descKey}`)}
                      </p>
                    </div>
                    <Toggle enabled={enabled} onClick={() => handleToggle(item.key)} />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-gray-500">{t('settings', 'notifSettings.loadError')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
