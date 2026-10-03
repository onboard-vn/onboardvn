export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

export const DEFAULT_MAP_CENTER: [number, number] = [105.8542, 21.0285];

export const MAP_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

/** Browser key restricted by HTTP referrer; when unset the free MapLibre/OpenFreeMap map is used. */
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
