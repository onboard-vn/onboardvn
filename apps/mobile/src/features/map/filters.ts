import type { VenueType } from '@onboard/shared';

export interface MapFilterValues {
  province?: string;
  gameSlug?: string;
  venueType?: VenueType;
  byog?: boolean;
  food?: boolean;
  free?: boolean;
  openNow?: boolean;
}

export const MAP_CRITERIA_KEYS = ['byog', 'food', 'free', 'openNow'] as const;

export function mapFiltersToQuery(filters: MapFilterValues): Record<string, string> {
  return {
    ...(filters.province && { province: filters.province }),
    ...(filters.gameSlug && { gameSlug: filters.gameSlug }),
    ...(filters.venueType && { venueType: filters.venueType }),
    ...(filters.byog && { byog: 'true' }),
    ...(filters.food && { food: 'true' }),
    ...(filters.free && { free: 'true' }),
    ...(filters.openNow && { openNow: 'true' }),
  };
}

export function mapFiltersToParams(filters: MapFilterValues): URLSearchParams {
  const params = new URLSearchParams();
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

export function parseMapSearchParams(
  sp: Record<string, string | string[] | undefined>,
): MapFilterValues {
  return {
    province: firstValue(sp.province),
    gameSlug: firstValue(sp.game),
    venueType: firstValue(sp.venueType) as VenueType | undefined,
    byog: boolParam(sp.byog),
    food: boolParam(sp.food),
    free: boolParam(sp.free),
    openNow: boolParam(sp.openNow),
  };
}
