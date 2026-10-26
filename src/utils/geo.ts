import type { LocationCoordinates } from '../types';

/**
 * Calculates straight-line great-circle distance between two GPS coordinates using the Haversine formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Formats distance into readable units (e.g. "450 m" or "2.4 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Estimates walking travel time at standard field pace of 4.5 km/h (75 meters / min)
 */
export function estimateWalkingTime(meters: number): string {
  const walkingSpeedMpm = 75; // meters per minute
  const minutes = Math.round(meters / walkingSpeedMpm);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hrs}h ${remainingMins}m`;
}

/**
 * Format coordinates nicely for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/**
 * Checks if location is stale (older than threshold, default 3 minutes)
 */
export function isLocationStale(lastSeenTimestamp: number, thresholdMs = 180000): boolean {
  return Date.now() - lastSeenTimestamp > thresholdMs;
}

/**
 * Checks if a point is within a circular danger/threat zone
 */
export function isPointInThreatZone(
  point: LocationCoordinates,
  zoneCenter: LocationCoordinates,
  radiusMeters: number
): boolean {
  const dist = calculateHaversineDistance(point, zoneCenter);
  return dist <= radiusMeters;
}
