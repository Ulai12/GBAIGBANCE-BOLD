import { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Copy, Check } from 'lucide-react';

interface EventMapPreviewProps {
  locationName: string;
  locationAddress?: string | null;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function EventMapPreview({
  locationName,
  locationAddress,
  city,
  country,
  latitude,
  longitude,
}: EventMapPreviewProps) {
  const [copied, setCopied] = useState(false);

  // Build full query string
  const fullAddress = [locationName, locationAddress, city, country]
    .filter(Boolean)
    .join(', ');

  // Compute map navigation URLs
  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  const navigationUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-[#6600FF]/15 bg-white shadow-sm">
      {/* Clickable Map Graphic Area */}
      <a
        id="event-map-preview-link"
        href={navigationUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir l'itinéraire vers ${locationName} dans Google Maps`}
        className="relative block h-40 w-full overflow-hidden select-none group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6600FF]"
      >
        {/* Stylized Static Vector Map Canvas */}
        <svg
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          viewBox="0 0 400 160"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Base terrain */}
          <rect width="400" height="160" fill="#F4F3F9" />

          {/* Topography & Land zones */}
          <path
            d="M-20,130 Q60,110 140,135 T300,120 T420,140 L420,170 L-20,170 Z"
            fill="#E6F2EB"
            opacity="0.7"
          />
          {/* Coastal / Water curve */}
          <path
            d="M-10,145 Q80,138 180,148 T360,139 T420,150 L420,170 L-10,170 Z"
            fill="#D9ECFA"
          />

          {/* Parks & Green zones */}
          <rect x="25" y="18" width="70" height="42" rx="12" fill="#E2F4E9" />
          <rect x="280" y="22" width="95" height="50" rx="14" fill="#E2F4E9" />
          <circle cx="90" cy="110" r="24" fill="#E8F6EE" />

          {/* Secondary road network */}
          <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
            {/* Grid streets */}
            <line x1="20" y1="40" x2="380" y2="40" />
            <line x1="10" y1="80" x2="390" y2="80" />
            <line x1="15" y1="115" x2="385" y2="115" />
            <line x1="70" y1="5" x2="70" y2="155" />
            <line x1="150" y1="5" x2="150" y2="155" />
            <line x1="250" y1="5" x2="250" y2="155" />
            <line x1="330" y1="5" x2="330" y2="155" />
            {/* Diagonal avenues */}
            <line x1="0" y1="140" x2="180" y2="20" />
            <line x1="210" y1="150" x2="390" y2="30" />
          </g>

          {/* Primary Arterial Road Highway */}
          <g stroke="#E0D7F5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10,75 C90,82 130,80 200,80 C270,80 320,74 410,78" />
            <path d="M195,-10 C198,40 200,80 202,170" />
          </g>
          <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M-10,75 C90,82 130,80 200,80 C270,80 320,74 410,78" />
            <path d="M195,-10 C198,40 200,80 202,170" />
          </g>

          {/* Central Roundabout near the venue marker */}
          <circle cx="200" cy="80" r="16" fill="#F4F3F9" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx="200" cy="80" r="16" fill="none" stroke="#6600FF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />

          {/* Subtle building footprints */}
          <g fill="#D8D5E5" opacity="0.55">
            <rect x="110" y="24" width="22" height="12" rx="2" />
            <rect x="110" y="48" width="26" height="18" rx="2" />
            <rect x="165" y="48" width="20" height="16" rx="2" />
            <rect x="220" y="48" width="22" height="18" rx="2" />
            <rect x="225" y="24" width="28" height="12" rx="2" />
            <rect x="165" y="96" width="20" height="16" rx="2" />
            <rect x="220" y="96" width="24" height="18" rx="2" />
            <rect x="115" y="96" width="22" height="20" rx="2" />
            <rect x="265" y="96" width="34" height="18" rx="2" />
          </g>
        </svg>

        {/* Ambient Gradient Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

        {/* Central Pulse Beacon Marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          {/* Radar ripple rings */}
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-[#6600FF]/25 animate-ping" />
            <span className="absolute w-8 h-8 rounded-full bg-[#6600FF]/30 animate-pulse" />
            
            {/* Pin pinhead */}
            <div className="relative z-10 w-9 h-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6600FF] p-0.5 shadow-lg shadow-[#6600FF]/40 flex items-center justify-center text-white ring-2 ring-white">
              <MapPin className="w-5 h-5 fill-white text-white drop-shadow-sm" />
            </div>
          </div>

          {/* Floating Venue Name Tag */}
          <div className="mt-1 px-2.5 py-1 rounded-full bg-[#171726]/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-tight shadow-md max-w-[180px] truncate text-center">
            {locationName}
          </div>
        </div>

        {/* Top-right: Discreet navigation hint badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-bold border border-white/20 group-hover:bg-[#6600FF] transition-colors">
          <Navigation className="w-3 h-3 fill-white" />
          <span>Itinéraire</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-80 ml-0.5" />
        </div>
      </a>

      {/* Action Footer with direct navigation link and copy button */}
      <div className="p-3 bg-[#FBFBFF] dark:bg-[#1A1828] flex items-center justify-between gap-2 border-t border-[#6600FF]/10 dark:border-white/10">
        <a
          id="event-map-nav-action"
          href={navigationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#6600FF] hover:bg-[#5500D4] active:scale-[0.98] text-white text-xs font-bold transition-all shadow-sm shadow-[#6600FF]/20"
        >
          <Navigation className="w-3.5 h-3.5 fill-white" />
          <span>Ouvrir dans Google Maps</span>
          <ExternalLink className="w-3 h-3 text-white/80" />
        </a>

        <button
          id="event-map-copy-address"
          type="button"
          onClick={handleCopyAddress}
          title="Copier l'adresse"
          aria-label="Copier l'adresse du lieu"
          className="shrink-0 inline-flex items-center gap-1.5 py-2.5 px-3 rounded-xl bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/15 active:scale-95 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors shadow-2xs cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">Copié</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>Copier</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
