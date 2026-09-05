import { useState, useEffect } from 'react';
import { Video, ExternalLink, Radio } from 'lucide-react';
import { fetchEventLiveLinks } from '@/services/events';
import type { Event, EventLiveLink } from '@/types';

const PLATFORM_COLORS: Record<string, string> = {
  YouTube: 'bg-red-500',
  Twitch: 'bg-purple-600',
  Facebook: 'bg-blue-600',
  Instagram: 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400',
  TikTok: 'bg-zinc-900',
  Other: 'bg-gray-600',
};

export function EventLiveLinks({ event, isDark }: { event: Event; isDark?: boolean }) {
  const [links, setLinks] = useState<EventLiveLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventLiveLinks(event.id)
      .then(setLinks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  if (loading || links.length === 0) return null;

  const hasLive = links.some((l) => l.is_live);

  const textMain = isDark ? 'text-white' : 'text-[#1A1A2E]';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(237,232,255,0.5)';

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Video className="w-5 h-5 text-[#6600FF]" />
        <h2 className={`text-lg font-extrabold ${textMain}`}>Live streaming</h2>
        {hasLive && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
            <Radio className="w-3 h-3" /> En direct
          </span>
        )}
      </div>

      <div className="space-y-2 animate-stagger">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-95 ${
              link.is_live ? 'bg-red-50 border-2 border-red-200' : ''
            }`}
            style={!link.is_live ? { background: cardBg, border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(200,190,255,0.3)' } : undefined}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${PLATFORM_COLORS[link.platform] || PLATFORM_COLORS.Other}`}>
              <Video className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${textMain}`}>{link.platform}</span>
                {link.is_live && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-500">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> LIVE
                  </span>
                )}
              </div>
              {link.title && <p className={`text-xs ${textMuted} truncate`}>{link.title}</p>}
            </div>
            <ExternalLink className={`w-4 h-4 ${textMuted} shrink-0`} />
          </a>
        ))}
      </div>
    </div>
  );
}
