import type { Event } from '@/types';

// Default center of Lomé (capital)
export const LOME_CENTER = {
  latitude: 6.1375,
  longitude: 1.2123,
};

// Known venue coordinates in Lomé for accurate spatial positioning
const KNOWN_VENUE_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'hôtel 2 février': { latitude: 6.1311, longitude: 1.2155 },
  'hotel 2 fevrier': { latitude: 6.1311, longitude: 1.2155 },
  '2 février': { latitude: 6.1311, longitude: 1.2155 },
  'palais des congrès': { latitude: 6.1360, longitude: 1.2140 },
  'palais des congres': { latitude: 6.1360, longitude: 1.2140 },
  'stade omnisports': { latitude: 6.1415, longitude: 1.2330 },
  'stade de kégué': { latitude: 6.1685, longitude: 1.2420 },
  'plage': { latitude: 6.1265, longitude: 1.2280 },
  'eden plage': { latitude: 6.1240, longitude: 1.2310 },
  'pure plage': { latitude: 6.1210, longitude: 1.2450 },
  'togo 2000': { latitude: 6.1895, longitude: 1.2201 },
  'jca': { latitude: 6.1450, longitude: 1.2210 },
  'agoe': { latitude: 6.2050, longitude: 1.2050 },
  'adawlato': { latitude: 6.1270, longitude: 1.2180 },
  'université de lomé': { latitude: 6.1750, longitude: 1.2140 },
  'institut français': { latitude: 6.1325, longitude: 1.2220 },
};

/**
 * Calculates Haversine distance in kilometers between two coordinates.
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
  return Number((R * c).toFixed(1));
}

/**
 * Formats a distance in km into a clean readable string (e.g. "800 m", "1.4 km").
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(50, Math.round(distanceKm * 1000));
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Resolves coordinates for an event, using DB fields or venue name mapping.
 */
export function getEventCoordinates(event: Partial<Event>): { latitude: number; longitude: number } {
  if (typeof event.latitude === 'number' && typeof event.longitude === 'number' && !isNaN(event.latitude) && !isNaN(event.longitude)) {
    return { latitude: event.latitude, longitude: event.longitude };
  }

  const loc = (event.location_name || '').toLowerCase().trim();
  const address = (event.address || '').toLowerCase().trim();

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

/**
 * Requests the user's geolocation with timeout and Lomé fallback.
 */
export async function getCurrentUserLocation(): Promise<{ latitude: number; longitude: number; isActual: boolean }> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return { ...LOME_CENTER, isActual: false };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          isActual: true,
        });
      },
      () => {
        // Fallback to center of Lomé
        resolve({ ...LOME_CENTER, isActual: false });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );
  });
}
