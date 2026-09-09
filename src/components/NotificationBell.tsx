import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { fetchUnreadNotificationCount } from '@/services/events';
import { supabase } from '@/services/supabase';
import { useApp } from '@/hooks/useApp';

interface NotificationBellProps {
  onOpen: () => void;
}

export function NotificationBell({ onOpen }: NotificationBellProps) {
  const { user } = useApp();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {});
    const interval = setInterval(() => {
      fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {});
    }, 30000);
    const channel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {});
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetchUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {});
      })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [user]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-xs flex items-center justify-center text-[#1A1A2E] dark:text-white hover:text-[#6600FF] active:scale-90 transition-all cursor-pointer"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5 transition-transform hover:rotate-12" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
