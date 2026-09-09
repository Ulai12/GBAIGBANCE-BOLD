/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Bell,
  Check,
  MessageCircle,
  MessageSquare,
  HelpCircle,
  UserPlus,
  CheckCheck,
  LogIn,
} from 'lucide-react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from '@/services/events';
import { useApp } from '@/hooks/useApp';
import type { ToastData } from '@/components/Toast';

interface NotificationsScreenProps {
  onBack: () => void;
  onToast: (toast: Omit<ToastData, 'id'>) => void;
  onLogin?: () => void;
}

function getIcon(type: string) {
  switch (type) {
    case 'comment_reply':
      return MessageCircle;
    case 'new_comment':
      return MessageSquare;
    case 'new_question':
    case 'question_answered':
      return HelpCircle;
    case 'new_follower':
      return UserPlus;
    case 'invite_accepted':
      return Check;
    default:
      return Bell;
  }
}

function getIconColor(type: string) {
  switch (type) {
    case 'comment_reply':
      return 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400';
    case 'new_comment':
      return 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
    case 'new_question':
      return 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
    case 'question_answered':
      return 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400';
    case 'new_follower':
      return 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400';
    default:
      return 'bg-[#6600FF]/10 text-[#6600FF] dark:bg-[#6600FF]/20 dark:text-[#A78BFA]';
  }
}

function getActionLabel(type: string) {
  switch (type) {
    case 'comment_reply':
      return 'a répondu à votre commentaire';
    case 'new_comment':
      return 'a commenté votre événement';
    case 'new_question':
      return 'a posé une question';
    case 'question_answered':
      return 'a répondu à votre question';
    case 'new_follower':
      return 'a commencé à vous suivre';
    case 'invite_accepted':
      return 'a accepté votre invitation';
    default:
      return '';
  }
}

export function NotificationsScreen({ onBack, onToast, onLogin }: NotificationsScreenProps) {
  const { user } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchNotifications(user.id)
      .then((data) => setNotifications(data || []))
      .catch(() => onToast({ message: 'Erreur de chargement des notifications', type: 'error' }))
      .finally(() => setLoading(false));
  }, [user]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      onToast({ message: 'Erreur', type: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.id);
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      onToast({ message: 'Toutes les notifications sont lues', type: 'success' });
    } catch {
      onToast({ message: 'Erreur', type: 'error' });
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const displayedNotifications = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  if (!user) {
    return (
      <div className="min-h-screen pb-32">
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
          <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[#17131D] dark:text-white active:scale-90 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-black text-[#17131D] dark:text-white">Notifications</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="max-w-md mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-[#6600FF]/10 dark:bg-[#6600FF]/20 text-[#6600FF] dark:text-[#A78BFA] flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-[#17131D] dark:text-white mb-2">
            Restez informé en temps réel
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto leading-relaxed">
            Connectez-vous pour recevoir vos confirmations de réservation, alertes artistes et rappels d'événements.
          </p>
          {onLogin && (
            <button
              type="button"
              onClick={onLogin}
              className="px-6 py-3.5 rounded-full bg-[#6600FF] text-white font-black text-xs inline-flex items-center gap-2 shadow-md hover:bg-[#5200cc] transition-all"
            >
              <LogIn className="w-4 h-4" /> Se connecter à mon compte
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-[#14121E]/80 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08]">
        <div className="max-w-md mx-auto px-5 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-[#17131D] dark:text-white active:scale-90 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6600FF] dark:text-[#A78BFA]" />
            <h1 className="text-base font-black text-[#17131D] dark:text-white">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#6600FF] text-white text-[10px] font-black">
                {unreadCount}
              </span>
            )}
          </div>

          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs font-bold text-[#6600FF] dark:text-[#A78BFA] active:scale-95 transition-transform"
            >
              <CheckCheck className="w-4 h-4" /> Tout lire
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-4">
        {/* Segmented filter */}
        <div className="p-1 bg-gray-200/70 dark:bg-white/10 rounded-2xl flex items-center mb-4">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
              filter === 'unread'
                ? 'bg-white dark:bg-[#6600FF] text-[#17131D] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Non lues ({unreadCount})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-3 border-[#6600FF]/30 border-t-[#6600FF] animate-spin" />
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-18 h-18 rounded-3xl bg-white dark:bg-white/10 shadow-xs flex items-center justify-center mb-3">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-black text-[#17131D] dark:text-white mb-1">
              {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              {filter === 'unread'
                ? 'Vous êtes à jour avec toutes vos alertes.'
                : 'Vos notifications apparaîtront ici quand quelqu’un interagira avec vos événements ou répondra à vos questions.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedNotifications.map((n) => {
              const Icon = getIcon(n.type);
              const actionLabel = getActionLabel(n.type);
              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) handleMarkRead(n.id);
                  }}
                  className={`flex items-start gap-3.5 p-4 rounded-3xl cursor-pointer transition-all active:scale-[0.98] border border-black/[0.04] dark:border-white/[0.06] ${
                    n.is_read
                      ? 'bg-white/70 dark:bg-white/5 opacity-85'
                      : 'bg-white dark:bg-[#1A1829] shadow-sm ring-1 ring-[#6600FF]/20'
                  }`}
                >
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${getIconColor(n.type)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {n.actor && (
                        <span className="text-xs font-black text-[#17131D] dark:text-white truncate">
                          {n.actor.name}
                        </span>
                      )}
                      {actionLabel && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {actionLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#17131D] dark:text-white mt-1 leading-snug">
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed font-normal">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] font-semibold text-gray-400 mt-1.5">
                      {new Date(n.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#6600FF] shrink-0 mt-2" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
