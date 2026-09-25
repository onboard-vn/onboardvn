import type { CafeDayKey, CafePublicDetailDto, GameDetailDto } from '@onboard/shared';
import { CAFE_DAY_KEYS } from '@onboard/shared';

const SCHEMA_ORG_DAY: Record<CafeDayKey, string> = {
  mon: 'https://schema.org/Monday',
  tue: 'https://schema.org/Tuesday',
  wed: 'https://schema.org/Wednesday',
  thu: 'https://schema.org/Thursday',
  fri: 'https://schema.org/Friday',
  sat: 'https://schema.org/Saturday',
  sun: 'https://schema.org/Sunday',
};

/** `<` must never reach the page verbatim inside a `<script>` tag — it would close it early. */
export function escapeJsonLdScript(json: string): string {
  return json.replace(/</g, '\\u003c');
}

export function gameJsonLd(game: GameDetailDto, url: string): Record<string, unknown> {
  const numberOfPlayers =
    game.minPlayers != null || game.maxPlayers != null
      ? {
          '@type': 'QuantitativeValue',
          ...(game.minPlayers != null && { minValue: game.minPlayers }),
          ...(game.maxPlayers != null && { maxValue: game.maxPlayers }),
        }
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Game',
    name: game.nameVi || game.nameEn,
    url,
    ...(game.imageUrl && { image: game.imageUrl }),
    ...(game.descriptionVi && { description: game.descriptionVi }),
    ...(numberOfPlayers && { numberOfPlayers }),
    ...(game.minAge != null && { typicalAgeRange: `${game.minAge}+` }),
    ...(game.bggUrl && { sameAs: game.bggUrl }),
  };
}

/**
 * Fields already reflect API-side redaction for `public_info_only` cafés (lat/lng, legacyDistrict,
 * openingHours/amenities/feeModel come back `null`/absent), so this builder needs no extra hiding
 * logic.
 */
export function cafeJsonLd(cafe: CafePublicDetailDto, url: string): Record<string, unknown> {
  const geo =
    cafe.lat != null && cafe.lng != null
      ? { '@type': 'GeoCoordinates', latitude: cafe.lat, longitude: cafe.lng }
      : undefined;
  const openingHoursSpecification = cafe.openingHours
    ? CAFE_DAY_KEYS.flatMap((day) =>
        (cafe.openingHours?.[day] ?? []).map((range) => {
          // schema.org has no "24h" notion; open===close (our full-day convention) becomes the
          // longest expressible same-day span instead of an ambiguous zero-length range.
          const is24h = range.open === range.close;
          return {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: SCHEMA_ORG_DAY[day],
            opens: is24h ? '00:00' : range.open,
            closes: is24h ? '23:59' : range.close,
          };
        }),
      )
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'EntertainmentBusiness',
    name: cafe.name,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: cafe.addressLine,
      addressLocality: cafe.wardName,
      addressRegion: cafe.provinceName,
      addressCountry: 'VN',
    },
    ...(geo && { geo }),
    ...(openingHoursSpecification &&
      openingHoursSpecification.length > 0 && { openingHoursSpecification }),
    ...(cafe.links?.fanpage && { sameAs: cafe.links.fanpage }),
  };
}
