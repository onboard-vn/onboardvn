import { describe, expect, it } from 'vitest';
import { mapFiltersToParams, mapFiltersToQuery, parseMapSearchParams } from './map-filters';

describe('mapFiltersToQuery', () => {
  it('omits unset fields', () => {
    expect(mapFiltersToQuery({})).toEqual({});
  });

  it('maps every filter to its API query param', () => {
    expect(
      mapFiltersToQuery({
        province: 'ha-noi',
        gameSlug: 'catan',
        venueType: 'byog_cafe',
        byog: true,
        food: true,
        free: true,
        openNow: true,
      }),
    ).toEqual({
      province: 'ha-noi',
      gameSlug: 'catan',
      venueType: 'byog_cafe',
      byog: 'true',
      food: 'true',
      free: 'true',
      openNow: 'true',
    });
  });
});

describe('mapFiltersToParams', () => {
  it('builds a shareable ?province=&game=&... query string', () => {
    const params = mapFiltersToParams({ province: 'ha-noi', gameSlug: 'catan', openNow: true });
    expect(params.get('province')).toBe('ha-noi');
    expect(params.get('game')).toBe('catan');
    expect(params.get('openNow')).toBe('true');
    expect(params.has('byog')).toBe(false);
  });

  it('produces an empty string for no filters', () => {
    expect(mapFiltersToParams({}).toString()).toBe('');
  });
});

describe('parseMapSearchParams', () => {
  it('round-trips through mapFiltersToParams', () => {
    const filters = { province: 'ha-noi', gameSlug: 'catan', byog: true as const };
    const params = mapFiltersToParams(filters);
    const sp = Object.fromEntries(params.entries());
    expect(parseMapSearchParams(sp)).toEqual({
      province: 'ha-noi',
      gameSlug: 'catan',
      venueType: undefined,
      byog: true,
      food: undefined,
      free: undefined,
      openNow: undefined,
    });
  });

  it('takes the first value when Next gives an array', () => {
    expect(parseMapSearchParams({ province: ['ha-noi', 'hcm'] }).province).toBe('ha-noi');
  });

  it('only treats the literal string "true" as a set boolean filter', () => {
    expect(parseMapSearchParams({ byog: 'false' }).byog).toBeUndefined();
    expect(parseMapSearchParams({ byog: 'true' }).byog).toBe(true);
  });
});
