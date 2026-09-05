import { GeolocationData } from '../types';

// Preset landmark reference coordinates across Nigeria
const NIGERIAN_REGIONS = [
  { city: 'Abuja', state: 'Federal Capital Territory', lat: 9.0765, lng: 7.3986, hint: 'Central Business District, Abuja' },
  { city: 'Ikeja', state: 'Lagos State', lat: 6.6018, lng: 3.3515, hint: 'Ikeja Commercial Corridor, Lagos' },
  { city: 'Victoria Island', state: 'Lagos State', lat: 6.4281, lng: 3.4219, hint: 'Adetokunbo Ademola St, Victoria Island, Lagos' },
  { city: 'Lekki', state: 'Lagos State', lat: 6.4698, lng: 3.5852, hint: 'Lekki Phase 1 / Expressway, Lagos' },
  { city: 'Kaduna', state: 'Kaduna State', lat: 10.5105, lng: 7.4165, hint: 'Ahmadu Bello Way, Kaduna' },
  { city: 'Port Harcourt', state: 'Rivers State', lat: 4.8156, lng: 7.0498, hint: 'Aba Road / GRA Phase 2, Port Harcourt' },
  { city: 'Ibadan', state: 'Oyo State', lat: 7.3775, lng: 3.9470, hint: 'Dugbe Commercial Zone, Ibadan' },
  { city: 'Kano', state: 'Kano State', lat: 12.0022, lng: 8.5920, hint: 'Bompai Industrial Area, Kano' },
  { city: 'Enugu', state: 'Enugu State', lat: 6.4584, lng: 7.5464, hint: 'Independence Layout, Enugu' },
  { city: 'Benin City', state: 'Edo State', lat: 6.3350, lng: 5.6037, hint: 'King Square / Airport Road, Benin City' },
];

/**
 * Approximate nearest Nigerian landmark from coordinates
 */
export function approximateNigerianLocation(lat: number, lng: number): { city: string; state: string; hint: string } {
  let closest = NIGERIAN_REGIONS[0];
  let minDistance = Infinity;

  for (const region of NIGERIAN_REGIONS) {
    const d = Math.hypot(lat - region.lat, lng - region.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = region;
    }
  }

  // If reasonably close to a known hub
  if (minDistance < 1.5) {
    return {
      city: closest.city,
      state: closest.state,
      hint: `${closest.hint} (Approx. ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
    };
  }

  // Generic fallback with detected coordinates
  return {
    city: 'Nigeria Region',
    state: lat > 8.5 ? 'Northern Nigeria' : 'Southern Nigeria',
    hint: `GPS Coordinates: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
  };
}

/**
 * Fetch current real-time geolocation of user's device
 */
export async function getCurrentDeviceLocation(preferredState: string = 'Abuja (FCT)'): Promise<GeolocationData> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(getFallbackNigerianLocation(preferredState));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const approx = approximateNigerianLocation(latitude, longitude);

        resolve({
          lat: Number(latitude.toFixed(6)),
          lng: Number(longitude.toFixed(6)),
          accuracy: Math.round(accuracy || 15),
          addressHint: approx.hint,
          city: approx.city,
          state: approx.state,
          timestamp: Date.now(),
          isMock: false,
        });
      },
      (error) => {
        console.warn('Browser geolocation denied or unavailable, using fallback Nigerian location:', error.message);
        resolve(getFallbackNigerianLocation(preferredState));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Fallback location for realistic Nigerian security tests
 */
export function getFallbackNigerianLocation(preferredState: string = 'Abuja'): GeolocationData {
  const match = NIGERIAN_REGIONS.find(r => 
    preferredState.toLowerCase().includes(r.state.toLowerCase()) || 
    preferredState.toLowerCase().includes(r.city.toLowerCase())
  ) || NIGERIAN_REGIONS[0];

  // Add slight random offset to simulate dynamic GPS jitter (+/- 200 meters)
  const jitterLat = (Math.random() - 0.5) * 0.004;
  const jitterLng = (Math.random() - 0.5) * 0.004;

  const lat = Number((match.lat + jitterLat).toFixed(6));
  const lng = Number((match.lng + jitterLng).toFixed(6));

  return {
    lat,
    lng,
    accuracy: 12 + Math.floor(Math.random() * 8), // 12-20 meters accuracy
    addressHint: `${match.hint} (Simulated Field Fix)`,
    city: match.city,
    state: match.state,
    timestamp: Date.now(),
    isMock: true,
  };
}

/**
 * Calculate distance between two coordinates in kilometers using Haversine formula
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Generate direct Google Maps navigation URL
 */
export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
