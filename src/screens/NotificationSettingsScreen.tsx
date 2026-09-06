/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { ChevronLeft, Bell, MessageSquare, MessageCircle, HelpCircle, UserPlus, Check, Calendar, Smartphone, Loader2 } from 'lucide-react';
import { useApp } from '@/hooks/useApp';
import { fetchNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from '@/services/events';
import type { ToastData } from '@/components/Toast';

interface NotificationSettingsScreenProps { onBack: () => void; onToast: (toast: Omit<ToastData, 'id'>) => void; }

interface ToggleItem { key: keyof NotificationPreferences; labelKey: string; descKey: string; icon: typeof Bell; color: string; }

const toggles: ToggleItem[] = [
  { key: 'new_comments', labelKey: 'newComments', descKey: 'newCommentsDesc', icon: MessageSquare, color: 'bg-blue-100 text-blue-600' },
  { key: 'comment_replies', labelKey: 'commentReplies', descKey: 'commentRepliesDesc', icon: MessageCircle, color: 'bg-cyan-100 text-cyan-600' },
  { key: 'new_questions', labelKey: 'newQuestions', descKey: 'newQuestionsDesc', icon: HelpCircle, color: 'bg-yellow-100 text-yellow-600' },
  { key: 'question_answered', labelKey: 'questionAnswered', descKey: 'questionAnsweredDesc', icon: HelpCircle, color: 'bg-green-100 text-green-600' },
  { key: 'new_followers', labelKey: 'newFollowers', descKey: 'newFollowersDesc', icon: UserPlus, color: 'bg-pink-100 text-pink-600' },
  { key: 'invite_accepted', labelKey: 'inviteAccepted', descKey: 'inviteAcceptedDesc', icon: Check, color: 'bg-emerald-100 text-emerald-600' },
  { key: 'event_reminders', labelKey: 'eventReminders', descKey: 'eventRemindersDesc', icon: Calendar, color: 'bg-purple-100 text-purple-600' },
];

export function NotificationSettingsScreen({ onBack, onToast }: NotificationSettingsScreenProps) {
  const { user, t } = useApp();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!user) return; fetchNotificationPreferences(user.id).then(setPrefs).catch(() => onToast({ message: t('settings', 'notifSettings.loadError'), type: 'error' })).finally(() => setLoading(false)); }, [user]);
  const handleToggle = async (key: keyof NotificationPreferences) => { if (!prefs || !user) return; const newValue = !prefs[key]; setPrefs({ ...prefs, [key]: newValue }); setSaving(true); try { await updateNotificationPreferences(user.id, { [key]: newValue }); } catch { setPrefs({ ...prefs, [key]: !newValue }); onToast({ message: t('settings', 'notifSettings.saveError'), type: 'error' }); } finally { setSaving(false); } };
  const Toggle = ({ enabled, onClick }: { enabled: boolean; onClick: () => void }) => (<button onClick={onClick} className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${enabled ? 'bg-[#6600FF]' : 'bg-gray-200'}`} aria-pressed={enabled}><div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} /></button>);
  return (
    <div className="min-h-screen bg-[#EDE8FF]">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100"><div className="max-w-md mx-auto px-5 py-4 flex items-center gap-3"><button onClick={onBack} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-transform"><ChevronLeft className="w-5 h-5 text-[#1A1A2E]" /></button><div className="flex items-center gap-2"><Bell className="w-5 h-5 text-[#6600FF]" /><h1 className="text-lg font-extrabold text-[#1A1A2E]">{t('settings', 'notifSettings.title')}</h1></div>{saving && <Loader2 className="w-4 h-4 text-[#6600FF] animate-spin ml-auto" />}</div></div>
      <div className="max-w-md mx-auto px-5 py-4">{loading ? (<div className="flex items-center justify-center py-16"><div className="w-8 h-8 rounded-full border-3 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" /></div>) : prefs ? (<><p className="text-sm text-gray-500 mb-4">{t('settings', 'notifSettings.subtitle')}</p><div className="space-y-2">{toggles.map((item) => { const Icon = item.icon; const enabled = prefs[item.key] as boolean; return (<div key={item.key} className="card p-4 flex items-center gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}><Icon className="w-5 h-5" /></div><div className="flex-1 min-w-0"><p className="font-bold text-[#1A1A2E] text-sm">{t('settings', `notifSettings.${item.labelKey}`)}</p><p className="text-xs text-gray-500">{t('settings', `notifSettings.${item.descKey}`)}</p></div><Toggle enabled={enabled} onClick={() => handleToggle(item.key)} /></div>); })}</div><div className="mt-6"><h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">{t('settings', 'notifSettings.pushSection')}</h2><div className="card p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#6600FF]/10 flex items-center justify-center shrink-0"><Smartphone className="w-5 h-5 text-[#6600FF]" /></div><div className="flex-1"><p className="font-bold text-[#1A1A2E] text-sm">{t('settings', 'notifSettings.pushEnabled')}</p><p className="text-xs text-gray-500">{t('settings', 'notifSettings.pushDesc')}</p></div><Toggle enabled={prefs.push_enabled} onClick={() => handleToggle('push_enabled')} /></div>{prefs.push_enabled && <p className="text-xs text-gray-400 mt-2 px-2">{t('settings', 'notifSettings.pushHint')}</p>}</div></>) : (<div className="flex flex-col items-center justify-center py-20"><p className="text-sm text-gray-500">{t('settings', 'notifSettings.loadError')}</p></div>)}</div>
    </div>
  );
}
