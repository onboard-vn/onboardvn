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

describe('nearby map URL', () => {
  it('round trips coordinates, radius and existing game/attribute filters including zero coordinates', () => {
    const filters = { centerLat: 0, centerLng: 0, radiusKm: 5, gameSlug: 'catan', byog: true };
    const parsed = parseMapSearchParams(Object.fromEntries(mapFiltersToParams(filters)));
    expect(parsed).toMatchObject(filters);
    expect(mapFiltersToQuery(parsed)).toMatchObject({
      centerLat: '0',
      centerLng: '0',
      radiusKm: '5',
      gameSlug: 'catan',
      byog: 'true',
    });
  });

  it.each([
    { centerLat: '21', centerLng: '105' },
    { centerLat: '', centerLng: '105', radiusKm: '5' },
    { centerLat: 'NaN', centerLng: '105', radiusKm: '5' },
    { centerLat: '91', centerLng: '105', radiusKm: '5' },
    { centerLat: '21', centerLng: 'Infinity', radiusKm: '5' },
    { centerLat: '21', centerLng: '105', radiusKm: '51' },
    { centerLat: '21', centerLng: '105', radiusKm: '0' },
  ])('drops invalid nearby triplets without losing game filter: %j', (nearby) => {
    const parsed = parseMapSearchParams({ ...nearby, game: 'catan' });
    expect(parsed.centerLat).toBeUndefined();
    expect(parsed.centerLng).toBeUndefined();
    expect(parsed.radiusKm).toBeUndefined();
    expect(parsed.gameSlug).toBe('catan');
  });
});
