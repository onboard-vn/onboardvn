export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/liberty';

export function getMapStyleUrl(theme: 'light' | 'dark'): string {
  if (process.env.EXPO_PUBLIC_MAP_STYLE_URL) return process.env.EXPO_PUBLIC_MAP_STYLE_URL;
  return theme === 'dark' ? 'https://tiles.openfreemap.org/styles/dark' : MAP_STYLE_URL;
}

export const DEFAULT_MAP_CENTER: [number, number] = [105.8542, 21.0285];

export const MAP_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';
