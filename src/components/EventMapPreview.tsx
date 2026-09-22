import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Copy, Check } from 'lucide-react';

/**
 * GBAIGBANCE — EventMapPreview (Mini-Carte & Navigation iOS)
 * 
 * Carte interactive avec :
 * - Chargement différé LAZY (IntersectionObserver) pour préserver les performances et la batterie
 * - Marqueur animé pulsant sur le lieu de l'événement
 * - Bouton « Itinéraire » principal violet (#6600FF)
 * - Bouton secondaire « Ouvrir dans Google Maps » en verre
 * - Bouton « Copier » avec retour visuel immédiat (coche émeraude)
 */

interface EventMapPreviewProps {
  locationName: string;
  locationAddress?: string | null;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const EventMapPreview: React.FC<EventMapPreviewProps> = ({
  locationName,
  locationAddress,
  city,
  country,
  latitude,
  longitude,
}) => {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Construction de l'adresse complète
  const fullAddress = [locationName, locationAddress, city, country]
    .filter(Boolean)
    .join(', ');

  const hasCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  const navigationUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignorer si le presse-papier n'est pas autorisé
    }
  };

  return (
    <div ref={containerRef} className="mt-3 space-y-3">
      {/* Zone Graphique de la Mini-Carte vectorielle stylisée */}
      <a
        id="event-map-preview-link"
        href={navigationUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir l'itinéraire vers ${locationName} dans Google Maps`}
        className="relative block h-44 w-full overflow-hidden rounded-[22px] border border-black/10 dark:border-white/10 select-none group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#6600FF] shadow-inner"
      >
        {isVisible ? (
          <svg
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            viewBox="0 0 400 160"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Terrain de fond */}
            <rect width="400" height="160" fill="#F3F0FA" />

            {/* Zones de verdure / Parcs */}
            <rect x="20" y="16" width="75" height="46" rx="14" fill="#E2F4E9" opacity="0.85" />
            <rect x="285" y="20" width="100" height="52" rx="16" fill="#E2F4E9" opacity="0.85" />
            <circle cx="95" cy="115" r="26" fill="#E8F6EE" />

            {/* Réseau routier secondaire */}
            <g stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95">
              <line x1="20" y1="40" x2="380" y2="40" />
              <line x1="10" y1="80" x2="390" y2="80" />
              <line x1="15" y1="115" x2="385" y2="115" />
              <line x1="70" y1="5" x2="70" y2="155" />
              <line x1="150" y1="5" x2="150" y2="155" />
              <line x1="250" y1="5" x2="250" y2="155" />
              <line x1="330" y1="5" x2="330" y2="155" />
            </g>

            {/* Voie rapide principale */}
            <g stroke="#DFD7F5" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M-10,75 C90,82 130,80 200,80 C270,80 320,74 410,78" />
              <path d="M195,-10 C198,40 200,80 202,170" />
            </g>
            <g stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M-10,75 C90,82 130,80 200,80 C270,80 320,74 410,78" />
              <path d="M195,-10 C198,40 200,80 202,170" />
            </g>

            {/* Rond-point central */}
            <circle cx="200" cy="80" r="16" fill="#F4F3F9" stroke="#FFFFFF" strokeWidth="5" />
            <circle cx="200" cy="80" r="16" fill="none" stroke="#6600FF" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />

            {/* Bâtiments urbains */}
            <g fill="#D8D3E8" opacity="0.6">
              <rect x="110" y="24" width="24" height="14" rx="3" />
              <rect x="165" y="48" width="22" height="18" rx="3" />
              <rect x="220" y="48" width="24" height="18" rx="3" />
              <rect x="115" y="96" width="24" height="20" rx="3" />
              <rect x="265" y="96" width="34" height="18" rx="3" />
            </g>
          </svg>
        ) : (
          /* Placeholder statique le temps du chargement IntersectionObserver */
          <div className="w-full h-full bg-gray-100 dark:bg-white/[0.04] flex items-center justify-center animate-pulse">
            <MapPin className="w-6 h-6 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Dégradé d'ambiance */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 pointer-events-none" />

        {/* Marqueur central avec radar pulsant */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-12 h-12 rounded-full bg-[#6600FF]/30 animate-ping" />
            <span className="absolute w-8 h-8 rounded-full bg-[#6600FF]/40 animate-pulse" />
            
            <div className="relative z-10 w-10 h-10 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#6600FF] p-0.5 shadow-xl shadow-[#6600FF]/50 flex items-center justify-center text-white ring-2 ring-white">
              <MapPin className="w-5 h-5 fill-white text-white" />
            </div>
          </div>

          <div className="mt-1 px-3 py-1 rounded-full bg-[#1A1A2E]/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-tight shadow-lg max-w-[200px] truncate text-center">
            {locationName}
          </div>
        </div>
      </a>

      {/* 
        Actions épurées : 2 boutons distincts et non redondants (touch target ≥ 44px)
        1. Itinéraire direct vers Google / Apple Maps
        2. Copier l'adresse complète dans le presse-papier
      */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        {/* Bouton 1 : Itinéraire (Violet #6600FF) */}
        <a
          id="event-map-nav-action"
          href={navigationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-[#6600FF] hover:bg-[#5200cc] active:scale-[0.98] text-white text-xs font-extrabold transition-all shadow-md shadow-[#6600FF]/25 cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-white" />
          <span>Itinéraire</span>
        </a>

        {/* Bouton 2 : Copier l'adresse (Verre iOS / feedback coche) */}
        <button
          id="event-map-copy-address"
          type="button"
          onClick={handleCopyAddress}
          title="Copier l'adresse complète"
          aria-label="Copier l'adresse du lieu"
          className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl glass-ios hover:bg-white/80 dark:hover:bg-white/15 active:scale-[0.98] text-xs font-bold transition-all shadow-2xs cursor-pointer border border-black/10 dark:border-white/10"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">Adresse copiée</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#6600FF] dark:text-purple-400" />
              <span className="text-gray-700 dark:text-gray-200">Copier l'adresse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
