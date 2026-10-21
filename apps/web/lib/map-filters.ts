import type { VenueType } from '@onboard/shared';

export interface MapFilterValues {
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  province?: string;
  gameSlug?: string;
  venueType?: VenueType;
  byog?: boolean;
  food?: boolean;
  free?: boolean;
  openNow?: boolean;
}

export const MAP_CRITERIA_KEYS = ['byog', 'food', 'free', 'openNow'] as const;

/** `filters` → `GET /cafes/map` query params. */
export function mapFiltersToQuery(filters: MapFilterValues): Record<string, string> {
  return {
    ...(filters.centerLat !== undefined &&
      filters.centerLng !== undefined &&
      filters.radiusKm !== undefined && {
        centerLat: String(filters.centerLat),
        centerLng: String(filters.centerLng),
        radiusKm: String(filters.radiusKm),
      }),
    ...(filters.province && { province: filters.province }),
    ...(filters.gameSlug && { gameSlug: filters.gameSlug }),
    ...(filters.venueType && { venueType: filters.venueType }),
    ...(filters.byog && { byog: 'true' }),
    ...(filters.food && { food: 'true' }),
    ...(filters.free && { free: 'true' }),
    ...(filters.openNow && { openNow: 'true' }),
  };
}

/** `filters` → shareable `/map?...` query string (`province`, `game`, criteria chips). */
export function mapFiltersToParams(filters: MapFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['centerLat', 'centerLng', 'radiusKm'] as const) {
    if (
      filters.centerLat !== undefined &&
      filters.centerLng !== undefined &&
      filters.radiusKm !== undefined
    )
      params.set(key, String(filters[key]));
  }
  if (filters.province) params.set('province', filters.province);
  if (filters.gameSlug) params.set('game', filters.gameSlug);
  if (filters.venueType) params.set('venueType', filters.venueType);
  for (const key of MAP_CRITERIA_KEYS) {
    if (filters[key]) params.set(key, 'true');
  }
  return params;
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function boolParam(value: string | string[] | undefined): true | undefined {
  return firstValue(value) === 'true' ? true : undefined;
}

/** Next.js `searchParams` (`?province=&game=&venueType=&byog=true...`) → {@link MapFilterValues}. */
export function parseMapSearchParams(
  sp: Record<string, string | string[] | undefined>,
): MapFilterValues {
  const centerLat = numericParam(sp.centerLat, -90, 90);
  const centerLng = numericParam(sp.centerLng, -180, 180);
  const radiusKm = numericParam(sp.radiusKm, 1, 50);
  return {
    ...(centerLat !== undefined &&
      centerLng !== undefined &&
      radiusKm !== undefined && { centerLat, centerLng, radiusKm }),
    province: firstValue(sp.province),
    gameSlug: firstValue(sp.game),
    venueType: firstValue(sp.venueType) as VenueType | undefined,
    byog: boolParam(sp.byog),
    food: boolParam(sp.food),
    free: boolParam(sp.free),
    openNow: boolParam(sp.openNow),
  };
}

function numericParam(
  value: string | string[] | undefined,
  min: number,
  max: number,
): number | undefined {
  const raw = firstValue(value);
  if (!raw?.trim()) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}
