import { useState, useEffect } from 'react';
import { Award, ExternalLink } from 'lucide-react';
import { fetchEventSponsors } from '@/services/events';
import type { Event, EventSponsor, SponsorTier } from '@/types';

const TIER_CONFIG: Record<SponsorTier, { label: string; color: string; bg: string; border: string }> = {
  gold: { label: 'Or', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  silver: { label: 'Argent', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  bronze: { label: 'Bronze', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  partner: { label: 'Partenaire', color: 'text-[#6600FF]', bg: 'bg-[#6600FF]/5', border: 'border-[#6600FF]/20' },
};

const TIER_ORDER: SponsorTier[] = ['gold', 'silver', 'bronze', 'partner'];

export function EventSponsors({ event }: { event: Event }) {
  const [sponsors, setSponsors] = useState<EventSponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEventSponsors(event.id).then(setSponsors).catch(() => {}).finally(() => setLoading(false));
  }, [event.id]);

  if (loading || sponsors.length === 0) return null;

  const grouped = TIER_ORDER.map((tier) => ({ tier, items: sponsors.filter((s) => s.tier === tier) })).filter((g) => g.items.length > 0);

  return (
    <div className="mt-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-[#1A1A2E] mb-3"><Award className="w-5 h-5 text-[#6600FF]" />Sponsors & Partenaires</h2>
      <div className="space-y-4">
        {grouped.map(({ tier, items }) => {
          const config = TIER_CONFIG[tier];
          return (
            <div key={tier}>
              <span className={`text-xs font-bold ${config.color} mb-2 block`}>{config.label.toUpperCase()}</span>
              <div className="grid grid-cols-2 gap-3 animate-stagger">
                {items.map((sponsor) => (
                  <a key={sponsor.id} href={sponsor.website_url || '#'} target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-2 p-4 rounded-2xl border ${config.border} ${config.bg} transition-all active:scale-95 hover:shadow-card-hover`}>
                    {sponsor.logo_url ? <img src={sponsor.logo_url} alt={sponsor.name} className="w-12 h-12 rounded-xl object-contain" /> : <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-gray-400 font-bold text-lg">{sponsor.name.charAt(0).toUpperCase()}</div>}
                    <span className="text-sm font-semibold text-[#1A1A2E] text-center line-clamp-1">{sponsor.name}</span>
                    {sponsor.website_url && <ExternalLink className="w-3 h-3 text-gray-400" />}
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
