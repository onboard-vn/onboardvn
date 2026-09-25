/** Prefers an owner-provided maps link; otherwise builds a Google Maps search from
 * lat/lng (most precise) or the address line. */
export function buildMapsUrl(cafe: {
  links?: { maps?: string };
  lat: number | null;
  lng: number | null;
  addressLine: string;
  wardName: string;
  provinceName: string;
}): string {
  if (cafe.links?.maps) return cafe.links.maps;
  const query =
    cafe.lat != null && cafe.lng != null
      ? `${cafe.lat},${cafe.lng}`
      : `${cafe.addressLine}, ${cafe.wardName}, ${cafe.provinceName}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** `zalo` is either a zalo.me/phone link (used as-is) or a bare phone number, normalized into a
 * `https://zalo.me/<digits>` link. */
export function buildZaloUrl(zalo: string): string {
  if (/^https?:\/\//i.test(zalo)) return zalo;
  const digits = zalo.replace(/[^0-9]/g, '');
  return `https://zalo.me/${digits}`;
}
