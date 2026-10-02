import type {
  CafeAmenities,
  CafeDayKey,
  CafeFeeModel,
  CafeHourRange,
  CafeOpenStatus,
  VenueType,
} from '@onboard/shared';

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  boardgame_cafe: 'Cafe board game',
  byog_cafe: 'Quán cho mang game tới (BYOG)',
  event_space: 'Không gian sự kiện',
};

export const FEE_MODEL_LABELS: Record<CafeFeeModel, string> = {
  free: 'Miễn phí',
  with_drink: 'Miễn phí khi gọi đồ uống',
  hourly: 'Tính theo giờ',
  per_person: 'Tính theo người',
  game_rental: 'Thuê game riêng',
  unknown: 'Chưa rõ',
};

export const DAY_KEYS: readonly CafeDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_LABELS: Record<CafeDayKey, string> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
  sun: 'Chủ Nhật',
};

export const AMENITY_LABELS = {
  foodAvailable: 'Có đồ ăn sẵn',
  outsideFoodAllowed: 'Cho mang đồ ăn vào',
  outsideDrinkAllowed: 'Cho mang đồ uống vào',
  privateRoom: 'Phòng/khu riêng',
  byogAllowed: 'Cho mang game tới',
  largeTables: 'Bàn lớn/nhóm đông',
  wifi: 'Wifi',
  airCon: 'Điều hòa',
  motorbikeParking: 'Chỗ để xe máy',
  carParking: 'Chỗ để ô tô',
  nonSmoking: 'Không hút thuốc',
  bankTransfer: 'Chuyển khoản',
} as const satisfies Partial<Record<keyof CafeAmenities, string>>;

export type AmenityKey = keyof typeof AMENITY_LABELS;
export const AMENITY_KEYS = Object.keys(AMENITY_LABELS) as AmenityKey[];

export function openStatusLabel(status: CafeOpenStatus | undefined): string | null {
  if (!status) return null;
  switch (status.state) {
    case 'open':
      return status.until ? `Đang mở · Đóng lúc ${status.until}` : 'Đang mở';
    case 'closing_soon':
      return status.until ? `Sắp đóng · Đóng lúc ${status.until}` : 'Sắp đóng';
    case 'closed':
      return status.nextOpen
        ? `Đã đóng · Mở lúc ${status.nextOpen.time} ${DAY_LABELS[status.nextOpen.day]}`
        : 'Đã đóng';
    default:
      return null;
  }
}

export function amenityLines(amenities: CafeAmenities | undefined): string[] {
  if (!amenities) return [];
  const lines = AMENITY_KEYS.filter((k) => amenities[k] != null).map(
    (k) => `${AMENITY_LABELS[k]}: ${amenities[k] ? 'Có' : 'Không'}`,
  );
  if (amenities.privateRoomCapacity != null) {
    lines.push(`Sức chứa phòng riêng: ${amenities.privateRoomCapacity}`);
  }
  if (amenities.maxGroupSize != null) {
    lines.push(`Sức chứa nhóm tối đa: ${amenities.maxGroupSize}`);
  }
  return lines;
}

export function formatRanges(ranges: CafeHourRange[] | undefined): string {
  if (!ranges || ranges.length === 0) return 'Đóng cửa';
  return ranges.map((r) => `${r.open}–${r.close}`).join(', ');
}

export function todayDayKey(now: Date = new Date()): CafeDayKey {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Saigon',
    weekday: 'short',
  }).format(now);
  const index = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday);
  return DAY_KEYS[index === -1 ? 0 : index]!;
}

export interface CafeFilterState {
  q: string;
  provinceSlug?: string;
  wardSlug?: string;
  venueType?: VenueType;
  toggles: Partial<Record<CafeToggleKey, true>>;
}

export const CAFE_TOGGLES = [
  { key: 'openNow', label: 'Đang mở' },
  { key: 'byog', label: 'Cho mang game tới' },
  { key: 'food', label: 'Có đồ ăn' },
  { key: 'privateRoom', label: 'Phòng riêng' },
  { key: 'largeTables', label: 'Bàn nhóm đông' },
  { key: 'free', label: 'Miễn phí ngồi' },
] as const;

export type CafeToggleKey = (typeof CAFE_TOGGLES)[number]['key'];

export function buildCafeQuery(f: CafeFilterState): Record<string, string> {
  const query: Record<string, string> = {};
  const q = f.q.trim();
  if (q) query.q = q;
  if (f.provinceSlug) query.province = f.provinceSlug;
  if (f.provinceSlug && f.wardSlug) query.ward = f.wardSlug;
  if (f.venueType) query.venueType = f.venueType;
  for (const { key } of CAFE_TOGGLES) {
    if (f.toggles[key]) query[key] = 'true';
  }
  return query;
}

export function mapsUrl(cafe: {
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

export const telUrl = (phone: string): string => `tel:${phone.replace(/[^0-9+]/g, '')}`;

export function zaloUrl(zalo: string): string {
  if (/^https?:\/\//i.test(zalo)) return zalo;
  return `https://zalo.me/${zalo.replace(/[^0-9]/g, '')}`;
}

type Param = string | string[] | undefined;
const first = (v: Param): string | undefined => (Array.isArray(v) ? v[0] : v);

export function parseCafeParams(sp: Record<string, Param>): CafeFilterState {
  const venueType = first(sp.venueType);
  const toggles: CafeFilterState['toggles'] = {};
  for (const { key } of CAFE_TOGGLES) {
    if (first(sp[key]) === 'true') toggles[key] = true;
  }
  return {
    q: '',
    provinceSlug: first(sp.province) ?? first(sp.tinh),
    wardSlug: first(sp.phuong),
    venueType: venueType && venueType in VENUE_TYPE_LABELS ? (venueType as VenueType) : undefined,
    toggles,
  };
}

export const CAFE_TABS = ['about', 'games', 'events', 'photos'] as const;
export type CafeTab = (typeof CAFE_TABS)[number];

export function parseCafeTab(raw: Param): CafeTab {
  const value = first(raw);
  return CAFE_TABS.find((t) => t === value) ?? 'about';
}

export function isFacebookFanpageUrl(url: string | undefined | null): url is string {
  if (!url) return false;
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return hostname === 'facebook.com' || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

export function facebookPagePluginUrl(fanpageUrl: string): string {
  const params = new URLSearchParams({
    href: fanpageUrl,
    tabs: 'timeline',
    width: '500',
    height: '600',
    small_header: 'false',
    adapt_container_width: 'true',
    hide_cover: 'false',
    show_facepile: 'true',
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}
