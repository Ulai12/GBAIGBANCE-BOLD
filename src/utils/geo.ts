import type { Event } from '@/types';

// Default center of Lomé (capital)
export const LOME_CENTER = {
  latitude: 6.1375,
  longitude: 1.2123,
};

// Known venue coordinates in West African capitals for accurate spatial positioning
const KNOWN_VENUE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  // Lomé (Togo)
  'hôtel 2 février': { latitude: 6.1311, longitude: 1.2155 },
  'hotel 2 fevrier': { latitude: 6.1311, longitude: 1.2155 },
  '2 février': { latitude: 6.1311, longitude: 1.2155 },
  'palais des congrès': { latitude: 6.1360, longitude: 1.2140 },
  'palais des congres': { latitude: 6.1360, longitude: 1.2140 },
  'stade omnisports': { latitude: 6.1415, longitude: 1.2330 },
  'stade omnisport': { latitude: 6.1415, longitude: 1.2330 },
  'stade de kégué': { latitude: 6.1685, longitude: 1.2420 },
  'stade de kegue': { latitude: 6.1685, longitude: 1.2420 },
  'kegué': { latitude: 6.1685, longitude: 1.2420 },
  'kegue': { latitude: 6.1685, longitude: 1.2420 },
  'plage de lomé': { latitude: 6.1265, longitude: 1.2280 },
  'plage': { latitude: 6.1265, longitude: 1.2280 },
  'eden plage': { latitude: 6.1240, longitude: 1.2810 },
  'pure plage': { latitude: 6.1210, longitude: 1.2950 },
  'marcelo beach': { latitude: 6.1205, longitude: 1.3120 },
  'blue turtle': { latitude: 6.1220, longitude: 1.3050 },
  'baguida': { latitude: 6.1350, longitude: 1.3320 },
  'togo 2000': { latitude: 6.1895, longitude: 1.2201 },
  'cetef': { latitude: 6.1895, longitude: 1.2201 },
  'jca': { latitude: 6.1950, longitude: 1.2120 },
  'agoe': { latitude: 6.2050, longitude: 1.2050 },
  'agoè': { latitude: 6.2050, longitude: 1.2050 },
  'assiyeye': { latitude: 6.2180, longitude: 1.2010 },
  'adawlato': { latitude: 6.1270, longitude: 1.2180 },
  'grand marché': { latitude: 6.1270, longitude: 1.2180 },
  'marche de lome': { latitude: 6.1270, longitude: 1.2180 },
  'université de lomé': { latitude: 6.1750, longitude: 1.2140 },
  'universite de lome': { latitude: 6.1750, longitude: 1.2140 },
  'campus lomé': { latitude: 6.1750, longitude: 1.2140 },
  'institut français': { latitude: 6.1325, longitude: 1.2220 },
  'institut francais': { latitude: 6.1325, longitude: 1.2220 },
  'canal olympia godope': { latitude: 6.1830, longitude: 1.2240 },
  'canal olympia mide': { latitude: 6.2210, longitude: 1.2110 },
  'canal olympia': { latitude: 6.1830, longitude: 1.2240 },
  'bè beach': { latitude: 6.1380, longitude: 1.2450 },
  'bè': { latitude: 6.1380, longitude: 1.2450 },
  'tokoin': { latitude: 6.1480, longitude: 1.2110 },
  'hedzranawoe': { latitude: 6.1690, longitude: 1.2380 },
  'hédzranawoé': { latitude: 6.1690, longitude: 1.2380 },
  'port autonome': { latitude: 6.1360, longitude: 1.2720 },
  'port de lomé': { latitude: 6.1360, longitude: 1.2720 },

  // Cotonou (Bénin)
  'palais des congrès cotonou': { latitude: 6.3530, longitude: 2.3990 },
  'stade de l’amitié': { latitude: 6.3840, longitude: 2.3850 },
  'stade de l\'amitie': { latitude: 6.3840, longitude: 2.3850 },
  'haie vive': { latitude: 6.3560, longitude: 2.4080 },
  'fidjrosse': { latitude: 6.3620, longitude: 2.3580 },
  'fidjrossè': { latitude: 6.3620, longitude: 2.3580 },

  // Abidjan (Côte d'Ivoire)
  'palais de la culture': { latitude: 5.3050, longitude: -4.0090 },
  'sofitel': { latitude: 5.3280, longitude: -4.0010 },
  'hotel ivoire': { latitude: 5.3280, longitude: -4.0010 },
  'parc des expositions abidjan': { latitude: 5.2590, longitude: -3.9310 },
  'treichville': { latitude: 5.3050, longitude: -4.0090 },
  'plateau': { latitude: 5.3250, longitude: -4.0200 },
  'cocody': { latitude: 5.3620, longitude: -3.9780 },
  'zone 4': { latitude: 5.2980, longitude: -3.9840 },
};

/**
 * Calculates road network distance in kilometers between two coordinates.
 * Factors in standard urban road circuity (1.28x over direct Haversine line)
 * to match real driving/walking path distances rather than bird's eye lines.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const haversine = R * c;

  // Real urban circuity factor: straight-line to realistic road routing
  // < 35 km -> urban city grid factor 1.28x
  const roadFactor = haversine < 35 ? 1.28 : 1.15;
  const realisticRoadKm = haversine * roadFactor;

  return Number(realisticRoadKm.toFixed(1));
}

/**
 * Formats a distance in km into a clean readable string (e.g. "800 m", "1.4 km").
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round((distanceKm * 1000) / 10) * 10);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

export function formatDistanceKm(distanceKm?: number): string {
  if (distanceKm === undefined || isNaN(distanceKm)) return 'À proximité';
  return formatDistance(distanceKm);
}

/**
 * High-precision travel time estimation tailored for urban transit
 * (walking, moto/zem, or car with realistic city traffic speeds & stop times).
 */
export function getAccurateTravelEstimate(distanceKm?: number): {
  label: string;
  isWalk: boolean;
  isMoto: boolean;
  minutes: number;
} | null {
  if (distanceKm === undefined || isNaN(distanceKm)) return null;
  if (distanceKm > 60) return null;

  // 1. Walking: distances <= 1.1 km
  if (distanceKm <= 1.1) {
    // Average walking speed ~4.5 km/h + 1 min crosswalk buffer
    const walkMins = Math.max(2, Math.round((distanceKm / 4.5) * 60 + 1));
    return {
      label: `~${walkMins} min à pied`,
      isWalk: true,
      isMoto: false,
      minutes: walkMins,
    };
  }

  // 2. Short trips (1.2 to 4 km): Fast moto or car
  if (distanceKm <= 3.5) {
    // Car ~22 km/h + 3 min traffic lights
    const carMins = Math.max(5, Math.round((distanceKm / 22) * 60 + 3));
    return {
      label: `~${carMins} min en voiture`,
      isWalk: false,
      isMoto: true,
      minutes: carMins,
    };
  }

  // 3. Medium & long city routes:
  // City traffic avg ~24 km/h with 4 min intersection buffer
  const driveMins = Math.round((distanceKm / 24) * 60 + 4);
  return {
    label: `~${driveMins} min de route`,
    isWalk: false,
    isMoto: false,
    minutes: driveMins,
  };
}

/**
 * Resolves coordinates for an event, using DB fields or venue name mapping.
 */
export function getEventCoordinates(event: Partial<Event>): { latitude: number; longitude: number } {
  if (typeof event.latitude === 'number' && typeof event.longitude === 'number' && !isNaN(event.latitude) && !isNaN(event.longitude)) {
    return { latitude: event.latitude, longitude: event.longitude };
  }

  const loc = (event.location_name || '').toLowerCase().trim();
  const address = (event.location_address || '').toLowerCase().trim();

  for (const [key, coords] of Object.entries(KNOWN_VENUE_COORDINATES)) {
    if (loc.includes(key) || address.includes(key)) {
      return coords;
    }
  }

  // Deterministic slight offset based on event ID or title so events in Lomé aren't stacked on 1 exact point
  const seed = (event.id || event.title || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const latOffset = ((seed % 40) - 20) * 0.0012; // ~ +/- 2.5 km
  const lngOffset = (((seed * 7) % 40) - 20) * 0.0012;

  return {
    latitude: LOME_CENTER.latitude + latOffset,
    longitude: LOME_CENTER.longitude + lngOffset,
  };
}

export interface UserLocationState {
  latitude: number;
  longitude: number;
  isActual: boolean;
  status?: 'idle' | 'prompting' | 'granted' | 'denied' | 'fallback';
  cityName?: string;
}

/**
 * Requests the user's geolocation with timeout and Lomé fallback.
 */
export async function getCurrentUserLocation(): Promise<UserLocationState> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { ...LOME_CENTER, isActual: false, status: 'fallback', cityName: 'Lomé' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isActual: true,
          status: 'granted',
        });
      },
      () => {
        // Fallback to center of Lomé
        resolve({ ...LOME_CENTER, isActual: false, status: 'fallback', cityName: 'Lomé' });
      },
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 300000 }
    );
  });
}

/**
 * Explicit user-triggered GPS request with high accuracy
 */
export async function requestUserLocation(): Promise<UserLocationState> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { ...LOME_CENTER, isActual: false, status: 'fallback', cityName: 'Lomé' };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isActual: true,
          status: 'granted',
        });
      },
      () => {
        resolve({ ...LOME_CENTER, isActual: false, status: 'denied', cityName: 'Lomé' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}
