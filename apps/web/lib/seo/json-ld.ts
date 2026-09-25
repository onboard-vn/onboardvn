import type { CafePublicDetailDto, GameDetailDto } from '@onboard/shared';

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
 * openingHours come back `null`/absent), so this builder needs no extra hiding logic.
 */
export function cafeJsonLd(cafe: CafePublicDetailDto, url: string): Record<string, unknown> {
  const geo =
    cafe.lat != null && cafe.lng != null
      ? { '@type': 'GeoCoordinates', latitude: cafe.lat, longitude: cafe.lng }
      : undefined;
  const openingHours = cafe.openingHours ? Object.values(cafe.openingHours) : undefined;

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
    ...(openingHours && openingHours.length > 0 && { openingHours }),
    ...(cafe.links?.fanpage && { sameAs: cafe.links.fanpage }),
  };
}
