import { useState, useEffect } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { fetchEventSponsors } from '@/services/events';
import { useApp } from '@/hooks/useApp';
import type { Event, EventSponsor, SponsorTier } from '@/types';

const TIER_CONFIG: Record<SponsorTier, { label: string; color: string; dot: string }> = {
  gold: { label: 'Or', color: 'text-yellow-600', dot: '#eab308' },
  silver: { label: 'Argent', color: 'text-gray-500', dot: '#9ca3af' },
  bronze: { label: 'Bronze', color: 'text-orange-600', dot: '#ea580c' },
  partner: { label: 'Partenaire', color: 'text-[#6600FF]', dot: '#6600FF' },
};

const TIER_ORDER: SponsorTier[] = ['gold', 'silver', 'bronze', 'partner'];

export function EventSponsors({ event, isDark }: { event: Event; isDark?: boolean }) {
  const { language } = useApp();
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventSponsors(event.id)
      .then(setSponsors)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [event.id]);

  if (loading || sponsors.length === 0) return null;

  const textMain = isDark ? 'text-white' : 'text-[#1A1A2E]';
  const textMuted = isDark ? 'text-white/50' : 'text-gray-500';
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(237,232,255,0.5)';
  const chipBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(200,190,255,0.3)';

  const grouped = TIER_ORDER.map((tier) => ({
    tier,
    items: sponsors.filter((s) => s.tier === tier),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-[#6600FF] shrink-0" />
        <h2 className={`text-base font-extrabold ${textMain}`}>{language === 'fr' ? 'Sponsors & Partenaires' : 'Sponsors & Partners'}</h2>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[#6600FF]" style={{ background: isDark ? 'rgba(102,0,255,0.12)' : 'rgba(102,0,255,0.08)' }}>
          {sponsors.length}
        </span>
      </div>

      <div className="space-y-3">
        {grouped.map(({ tier, items }) => {
          const config = TIER_CONFIG[tier];
          return (
            <div key={tier}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: config.dot }} />
                <span className={`text-[10px] font-bold ${config.color}`}>{config.label.toUpperCase()}</span>
                <span className={`text-[9px] ${textMuted}`}>({items.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((sponsor) => (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full transition-all active:scale-95"
                    style={{ background: chipBg, border: chipBorder }}
                  >
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="w-7 h-7 rounded-lg object-contain shrink-0"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                        style={{ background: isDark ? 'rgba(102,0,255,0.15)' : 'rgba(102,0,255,0.08)', color: '#6600FF' }}
                      >
                        {sponsor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`text-xs font-semibold ${textMain} line-clamp-1 max-w-[100px]`}>{sponsor.name}</span>
                    {sponsor.website_url && <ExternalLink className={`w-2.5 h-2.5 ${textMuted} shrink-0`} />}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
