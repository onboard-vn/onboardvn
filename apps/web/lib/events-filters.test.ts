import { describe, expect, it } from 'vitest';
import { eventFiltersToParams, parseEventSearchParams, parseEventsView } from './events-filters';

describe('parseEventSearchParams', () => {
  it('reads slugs and cafeId, unwrapping array values', () => {
    expect(
      parseEventSearchParams({
        province: ['ho-chi-minh'],
        phuong: 'phuong-1',
        cafeId: 'cafe-abc',
        from: '2026-10-01',
      }),
    ).toEqual({
      province: 'ho-chi-minh',
      ward: 'phuong-1',
      cafeId: 'cafe-abc',
      from: '2026-10-01',
    });
  });

  it('omits missing keys', () => {
    expect(parseEventSearchParams({})).toEqual({
      province: undefined,
      ward: undefined,
      cafeId: undefined,
      from: undefined,
    });
  });
});

describe('eventFiltersToParams', () => {
  it('builds a query string with view and month only when non-default', () => {
    const params = eventFiltersToParams(
      { province: 'ho-chi-minh', ward: 'phuong-1' },
      'calendar',
      '2026-10',
    );
    expect(params.toString()).toBe(
      'province=ho-chi-minh&phuong=phuong-1&view=calendar&month=2026-10',
    );
  });

  it('omits view when list (default)', () => {
    const params = eventFiltersToParams({}, 'list');
    expect(params.toString()).toBe('');
  });
});

describe('parseEventsView', () => {
  it('defaults to list', () => {
    expect(parseEventsView({})).toBe('list');
    expect(parseEventsView({ view: 'calendar' })).toBe('calendar');
    expect(parseEventsView({ view: 'bogus' })).toBe('list');
  });
});
