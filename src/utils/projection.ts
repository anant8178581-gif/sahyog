export interface Point {
  x: number;
  y: number;
}

/**
 * Standard Web Mercator Projection (EPSG:3857)
 */
export function latLngToWorld(lat: number, lng: number, zoom: number): Point {
  const worldSize = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * worldSize;

  const latRad = (lat * Math.PI) / 180;
  const sinLat = Math.sin(latRad);
  // Clamp sinLat to avoid Infinity near poles
  const clampedSin = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clampedSin) / (1 - clampedSin)) / (4 * Math.PI)) * worldSize;

  return { x, y };
}

export function worldToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const worldSize = 256 * Math.pow(2, zoom);
  const lng = (x / worldSize) * 360 - 180;

  const n = Math.PI - (2 * Math.PI * y) / worldSize;
  const latRad = Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lat = (latRad * 180) / Math.PI;

  return { lat, lng };
}

export function latLngToScreen(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  screenWidth: number,
  screenHeight: number
): Point {
  const centerWorld = latLngToWorld(centerLat, centerLng, zoom);
  const pointWorld = latLngToWorld(lat, lng, zoom);

  return {
    x: screenWidth / 2 + (pointWorld.x - centerWorld.x),
    y: screenHeight / 2 + (pointWorld.y - centerWorld.y),
  };
}

export function screenToLatLng(
  screenX: number,
  screenY: number,
  centerLat: number,
  centerLng: number,
  zoom: number,
  screenWidth: number,
  screenHeight: number
): { lat: number; lng: number } {
  const centerWorld = latLngToWorld(centerLat, centerLng, zoom);
  const targetWorldX = centerWorld.x + (screenX - screenWidth / 2);
  const targetWorldY = centerWorld.y + (screenY - screenHeight / 2);

  return worldToLatLng(targetWorldX, targetWorldY, zoom);
}
