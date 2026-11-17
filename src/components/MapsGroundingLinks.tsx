import React from 'react';
import { MapPin, ExternalLink, MessageSquareQuote } from 'lucide-react';
import type { MapsGroundingPlace } from '@/services/gemini';

interface MapsGroundingLinksProps {
  places?: MapsGroundingPlace[];
  compact?: boolean;
}

/**
 * Affiche les lieux et avis issus des chunks Google Maps Grounding
 * sous forme de liens cliquables conformes aux directives d'attribution.
 */
export const MapsGroundingLinks: React.FC<MapsGroundingLinksProps> = ({
  places,
  compact = false,
}) => {
  if (!places || places.length === 0) return null;

  return (
    <div className={compact ? 'space-y-1.5 pt-1' : 'space-y-2 pt-1.5'}>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>Lieux vérifiés via Google Maps</span>
        </span>
        <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500">
          Données Google Maps
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {places.map((place, index) => (
          <a
            key={`${place.uri}-${index}`}
            href={place.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-2.5 rounded-xl bg-white/85 hover:bg-white dark:bg-[#1A1829] dark:hover:bg-[#232036] border border-emerald-500/20 hover:border-emerald-500/45 transition-all shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-bold text-[#17131D] dark:text-white truncate group-hover:text-[#6600FF] dark:group-hover:text-[#A78BFA] transition-colors">
                  {place.title}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                <span>Maps</span>
                <ExternalLink className="w-3 h-3" />
              </span>
            </div>

            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
              <div className="mt-1.5 pl-8 space-y-1">
                {place.reviewSnippets.slice(0, 2).map((snippet, sIdx) => (
                  <p
                    key={sIdx}
                    className="text-[11px] text-gray-600 dark:text-zinc-400 leading-snug flex items-start gap-1"
                  >
                    <MessageSquareQuote className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 italic">« {snippet} »</span>
                  </p>
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
};
