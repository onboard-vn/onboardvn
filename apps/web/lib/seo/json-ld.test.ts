import type { CafePublicDetailDto, GameDetailDto } from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import { cafeJsonLd, escapeJsonLdScript, gameJsonLd } from './json-ld';

const baseGame: GameDetailDto = {
  id: 'g1',
  slug: 'ma-soi',
  nameVi: 'Ma Sói',
  nameEn: 'Werewolf',
  minPlayers: 6,
  maxPlayers: 18,
  playMinutes: 30,
  weight: '1.50',
  minAge: 10,
  isVietnamese: true,
  bggId: 1234,
  imageUrl: 'https://cdn.example/ma-soi.jpg',
  categories: [],
  descriptionVi: 'Trò chơi ma sói kinh điển.',
  descriptionSource: 'original',
  descriptionRightsHolder: null,
  descriptionLicense: 'CC-BY-SA-4.0',
  videoUrls: [],
  imageCredit: null,
  bggUrl: 'https://boardgamegeek.com/boardgame/1234',
  barcodes: [],
  ownersCount: 0,
};

const baseCafe: CafePublicDetailDto = {
  id: 'c1',
  slug: 'quan-abc',
  name: 'Quán ABC',
  provinceCode: '79',
  provinceName: 'TP. Hồ Chí Minh',
  wardCode: '00001',
  wardName: 'Phường 1',
  addressLine: '123 Đường ABC',
  legacyDistrict: 'Quận 1',
  lat: 10.123,
  lng: 106.456,
  links: { fanpage: 'https://facebook.com/quanabc' },
  gameCount: 2,
  verified: true,
  venueType: 'boardgame_cafe',
  openingHours: { mon: [{ open: '08:00', close: '22:00' }] },
  inventory: [],
};

describe('escapeJsonLdScript', () => {
  it('escapes < so a script tag cannot be broken out of', () => {
    expect(escapeJsonLdScript('</script><script>alert(1)</script>')).not.toContain('</script>');
    expect(escapeJsonLdScript('a<b')).toBe('a\\u003cb');
  });
});

describe('gameJsonLd', () => {
  it('builds a schema.org Game with player range, age and BGG sameAs', () => {
    const jsonLd = gameJsonLd(baseGame, 'https://onboard.j2teamnnl.com/games/ma-soi');
    expect(jsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Game',
      name: 'Ma Sói',
      numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 6, maxValue: 18 },
      typicalAgeRange: '10+',
      sameAs: 'https://boardgamegeek.com/boardgame/1234',
    });
  });

  it('omits numberOfPlayers/typicalAgeRange/sameAs when the data is missing', () => {
    const jsonLd = gameJsonLd(
      { ...baseGame, minPlayers: null, maxPlayers: null, minAge: null, bggUrl: null },
      'https://onboard.j2teamnnl.com/games/ma-soi',
    );
    expect(jsonLd.numberOfPlayers).toBeUndefined();
    expect(jsonLd.typicalAgeRange).toBeUndefined();
    expect(jsonLd.sameAs).toBeUndefined();
  });
});

describe('cafeJsonLd', () => {
  it('builds a schema.org EntertainmentBusiness with address, geo, hours and fanpage', () => {
    const jsonLd = cafeJsonLd(baseCafe, 'https://onboard.j2teamnnl.com/cafes/quan-abc');
    expect(jsonLd).toMatchObject({
      '@type': 'EntertainmentBusiness',
      name: 'Quán ABC',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Đường ABC',
        addressLocality: 'Phường 1',
        addressRegion: 'TP. Hồ Chí Minh',
        addressCountry: 'VN',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 10.123, longitude: 106.456 },
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: 'https://schema.org/Monday',
          opens: '08:00',
          closes: '22:00',
        },
      ],
      sameAs: 'https://facebook.com/quanabc',
    });
  });

  it('omits geo/openingHoursSpecification for a public_info_only cafe (already redacted by the API)', () => {
    const jsonLd = cafeJsonLd(
      { ...baseCafe, lat: null, lng: null, legacyDistrict: null, openingHours: undefined },
      'https://onboard.j2teamnnl.com/cafes/quan-abc',
    );
    expect(jsonLd.geo).toBeUndefined();
    expect(jsonLd.openingHoursSpecification).toBeUndefined();
  });
});
