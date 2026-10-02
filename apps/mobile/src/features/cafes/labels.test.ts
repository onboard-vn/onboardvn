import { describe, expect, it } from 'vitest';
import {
  amenityLines,
  buildCafeQuery,
  formatRanges,
  mapsUrl,
  openStatusLabel,
  parseCafeParams,
  parseCafeTab,
  isFacebookFanpageUrl,
  todayDayKey,
  telUrl,
  zaloUrl,
} from './labels';

describe('openStatusLabel', () => {
  it('formats open, closed with next opening and unknown', () => {
    expect(openStatusLabel({ state: 'open', until: '22:00' })).toBe('Đang mở · Đóng lúc 22:00');
    expect(openStatusLabel({ state: 'closed', nextOpen: { day: 'sat', time: '09:00' } })).toBe(
      'Đã đóng · Mở lúc 09:00 Thứ Bảy',
    );
    expect(openStatusLabel({ state: 'unknown' })).toBeNull();
    expect(openStatusLabel(undefined)).toBeNull();
  });
});

describe('amenityLines', () => {
  it('skips unknown amenities and appends capacities', () => {
    const lines = amenityLines({
      wifi: true,
      airCon: false,
      byogAllowed: null,
      maxGroupSize: 12,
    } as never);
    expect(lines).toEqual(['Wifi: Có', 'Điều hòa: Không', 'Sức chứa nhóm tối đa: 12']);
    expect(amenityLines(undefined)).toEqual([]);
  });
});

describe('formatRanges', () => {
  it('joins ranges or reports closed', () => {
    expect(
      formatRanges([
        { open: '09:00', close: '12:00' },
        { open: '14:00', close: '22:00' },
      ]),
    ).toBe('09:00–12:00, 14:00–22:00');
    expect(formatRanges(undefined)).toBe('Đóng cửa');
    expect(formatRanges([])).toBe('Đóng cửa');
  });
});

describe('todayDayKey', () => {
  it('uses the Asia/Saigon weekday', () => {
    expect(todayDayKey(new Date('2026-10-04T18:00:00Z'))).toBe('mon');
    expect(todayDayKey(new Date('2026-10-04T10:00:00Z'))).toBe('sun');
  });
});

describe('buildCafeQuery', () => {
  it('only emits active filters', () => {
    expect(buildCafeQuery({ q: ' ', toggles: {} })).toEqual({});
    expect(
      buildCafeQuery({
        q: ' catan ',
        provinceSlug: 'ha-noi',
        venueType: 'byog_cafe',
        toggles: { openNow: true, free: true },
      }),
    ).toEqual({
      q: 'catan',
      province: 'ha-noi',
      venueType: 'byog_cafe',
      free: 'true',
      openNow: 'true',
    });
  });
});

describe('links', () => {
  const cafe = { lat: null, lng: null, addressLine: '1 A', wardName: 'B', provinceName: 'C' };
  it('prefers the stored maps link, then coordinates, then address', () => {
    expect(mapsUrl({ ...cafe, links: { maps: 'https://maps.app/x' } })).toBe('https://maps.app/x');
    expect(mapsUrl({ ...cafe, lat: 21, lng: 105 })).toContain('query=21%2C105');
    expect(mapsUrl(cafe)).toContain(encodeURIComponent('1 A, B, C'));
  });

  it('normalizes zalo numbers into links', () => {
    expect(zaloUrl('0901 234 567')).toBe('https://zalo.me/0901234567');
    expect(zaloUrl('https://zalo.me/abc')).toBe('https://zalo.me/abc');
  });
});

describe('parseCafeParams', () => {
  it('reads province, ward, venue type and boolean toggles from the URL', () => {
    expect(
      parseCafeParams({
        tinh: 'ha-noi',
        phuong: 'ba-dinh',
        venueType: 'byog_cafe',
        byog: 'true',
        food: 'false',
      }),
    ).toEqual({
      q: '',
      provinceSlug: 'ha-noi',
      wardSlug: 'ba-dinh',
      venueType: 'byog_cafe',
      toggles: { byog: true },
    });
  });

  it('ignores unknown venue types and prefers province over tinh', () => {
    const f = parseCafeParams({ province: 'da-nang', tinh: 'ha-noi', venueType: 'nope' });
    expect(f.provinceSlug).toBe('da-nang');
    expect(f.venueType).toBeUndefined();
  });

  it('only sends ward when a province is set', () => {
    expect(buildCafeQuery({ q: '', wardSlug: 'x', toggles: {} })).toEqual({});
    expect(buildCafeQuery({ q: '', provinceSlug: 'a', wardSlug: 'x', toggles: {} })).toEqual({
      province: 'a',
      ward: 'x',
    });
  });
});

describe('parseCafeTab', () => {
  it('defaults to about for missing or unknown values', () => {
    expect(parseCafeTab(undefined)).toBe('about');
    expect(parseCafeTab('bogus')).toBe('about');
    expect(parseCafeTab(['photos', 'games'])).toBe('photos');
  });
});

describe('isFacebookFanpageUrl', () => {
  it('accepts only facebook hosts', () => {
    expect(isFacebookFanpageUrl('https://www.facebook.com/x')).toBe(true);
    expect(isFacebookFanpageUrl('https://facebook.com.evil.com/x')).toBe(false);
    expect(isFacebookFanpageUrl('javascript:alert(1)')).toBe(false);
    expect(isFacebookFanpageUrl(undefined)).toBe(false);
  });
});

describe('telUrl', () => {
  it('strips formatting', () => {
    expect(telUrl('0901 234.567')).toBe('tel:0901234567');
    expect(telUrl('+84 901 234 567')).toBe('tel:+84901234567');
  });
});
