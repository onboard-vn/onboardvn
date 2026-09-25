import { z } from 'zod';

export const cafeConsentStatusEnum = z.enum(['granted', 'pending', 'public_info_only', 'declined']);
export type CafeConsentStatus = z.infer<typeof cafeConsentStatusEnum>;

export const cafeGameAddedViaEnum = z.enum(['manual', 'scan', 'import']);
export type CafeGameAddedVia = z.infer<typeof cafeGameAddedViaEnum>;

export const venueTypeEnum = z.enum(['boardgame_cafe', 'byog_cafe', 'event_space']);
export type VenueType = z.infer<typeof venueTypeEnum>;

export const cafeFeeModelEnum = z.enum([
  'free',
  'with_drink',
  'hourly',
  'per_person',
  'game_rental',
  'unknown',
]);
export type CafeFeeModel = z.infer<typeof cafeFeeModelEnum>;

const HTTP_PROTOCOL = /^https?$/;

/** No DOM/Node `URL` type is available in this package's tsconfig (it's consumed by both a
 * browser and a Node app), so hostnames are extracted with a regex instead. Only ever called on
 * a string that already passed `z.url()`, so the match is guaranteed. */
function hostnameOf(url: string): string {
  return url
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .match(/^[^/?#]+/)![0];
}

/** `hosts`, when given, restricts the URL to those exact hosts or their `www.` variant — used
 * where the target platform is known (fanpage/instagram/tiktok), so a lookalike or unrelated
 * domain is rejected rather than silently accepted as a "social link". */
function socialUrlSchema(hosts?: string[]) {
  return z
    .url({ protocol: HTTP_PROTOCOL })
    .max(500)
    .refine((url) => !hosts || hosts.includes(hostnameOf(url)), {
      message: `URL phải thuộc ${hosts?.join(' hoặc ')}`,
    });
}

/** VN mobile number: optional +84/84/0 prefix, then a 9-digit subscriber number starting 3/5/7/8/9. */
const VN_PHONE_RE = /^(\+?84|0)(3|5|7|8|9)\d{8}$/;

const zaloSchema = z
  .string()
  .trim()
  .max(200)
  .superRefine((value, ctx) => {
    const digits = value.replace(/[^0-9+]/g, '');
    if (VN_PHONE_RE.test(digits)) return;

    const parsed = z.url({ protocol: HTTP_PROTOCOL }).safeParse(value);
    if (parsed.success && hostnameOf(value) === 'zalo.me') return;

    ctx.addIssue({
      code: 'custom',
      message: 'Zalo phải là số điện thoại Việt Nam hợp lệ hoặc link zalo.me',
    });
  });

const cafeLinksSchema = z
  .object({
    fanpage: socialUrlSchema(['facebook.com', 'fb.com']).optional(),
    instagram: socialUrlSchema(['instagram.com']).optional(),
    tiktok: socialUrlSchema(['tiktok.com']).optional(),
    /** Zalo contact: either a VN phone number or a zalo.me link. */
    zalo: zaloSchema.optional(),
    website: socialUrlSchema().optional(),
    maps: socialUrlSchema().optional(),
  })
  .optional();
export type CafeLinks = z.infer<typeof cafeLinksSchema>;

export const cafePhotoCaptionSchema = z.object({ caption: z.string().trim().max(140).optional() });
export type CafePhotoCaptionInput = z.infer<typeof cafePhotoCaptionSchema>;

export const cafePhotoReorderSchema = z.object({ photoIds: z.array(z.uuid()).min(1).max(30) });
export type CafePhotoReorderInput = z.infer<typeof cafePhotoReorderSchema>;

export const CAFE_PHOTO_MAX_COUNT = 30;

export interface CafePhotoDto {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
}

/** Tri-state: `true`/`false` are known answers, `null` means "chưa rõ" (default for imported data). */
const triState = z.boolean().nullable();

const cafeAmenitiesFields = {
  foodAvailable: triState,
  outsideFoodAllowed: triState,
  outsideDrinkAllowed: triState,
  privateRoom: triState,
  byogAllowed: triState,
  largeTables: triState,
  wifi: triState,
  airCon: triState,
  motorbikeParking: triState,
  carParking: triState,
  nonSmoking: triState,
  bankTransfer: triState,
  privateRoomCapacity: z.coerce.number().int().min(1).max(200).nullable(),
  maxGroupSize: z.coerce.number().int().min(1).max(200).nullable(),
};

export const cafeAmenitiesSchema = z.object(cafeAmenitiesFields).partial();
export type CafeAmenities = z.infer<typeof cafeAmenitiesSchema>;

export const CAFE_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type CafeDayKey = (typeof CAFE_DAY_KEYS)[number];

const cafeTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải theo định dạng HH:MM (00:00-23:59)');

/** `close` may be earlier than `open`, meaning the range closes the following day (qua đêm). */
const cafeHourRangeSchema = z.object({ open: cafeTimeSchema, close: cafeTimeSchema });
export type CafeHourRange = z.infer<typeof cafeHourRangeSchema>;

const MINUTES_PER_DAY = 1440;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

function minutesToTime(minutes: number): string {
  const normalized = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Sorts a day's ranges and merges any that touch or overlap (e.g. 10-14 + 14-22 → 10-22), so a
 * café spanning midnight into the next range reads as continuously open. Invalid entries are
 * dropped rather than rejected — the schema already validated each range's time format. */
export function mergeCafeHourRanges(ranges: CafeHourRange[]): CafeHourRange[] {
  if (ranges.length <= 1) return ranges;

  const spans = ranges
    .map((r) => {
      const start = timeToMinutes(r.open);
      const closeMin = timeToMinutes(r.close);
      const duration =
        closeMin > start ? closeMin - start : MINUTES_PER_DAY + closeMin - start || MINUTES_PER_DAY;
      return { start, end: start + duration };
    })
    .sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
    } else {
      merged.push({ ...span });
    }
  }

  return merged.map((s) => ({ open: minutesToTime(s.start), close: minutesToTime(s.end) }));
}

const cafeOpeningHoursDayFields = Object.fromEntries(
  CAFE_DAY_KEYS.map((day) => [
    day,
    z
      .array(cafeHourRangeSchema)
      .max(6)
      .optional()
      .transform((v) => (v ? mergeCafeHourRanges(v) : v)),
  ]),
) as unknown as Record<CafeDayKey, z.ZodOptional<z.ZodArray<typeof cafeHourRangeSchema>>>;

export const cafeOpeningHoursSchema = z
  .object({ ...cafeOpeningHoursDayFields, note: z.string().trim().max(200).optional() })
  .optional();
export type CafeOpeningHours = z.infer<typeof cafeOpeningHoursSchema>;

export type CafeOpenState = 'open' | 'closing_soon' | 'closed' | 'unknown';

export interface CafeOpenStatus {
  state: CafeOpenState;
  /** Close time (HH:MM) of the range currently open, when `state` is 'open'/'closing_soon'. */
  until?: string;
  /** Next time the café opens, when `state` is 'closed'. */
  nextOpen?: { day: CafeDayKey; time: string };
}

const CLOSING_SOON_THRESHOLD_MINUTES = 60;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidHourRange(value: unknown): value is CafeHourRange {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.open === 'string' &&
    typeof r.close === 'string' &&
    TIME_RE.test(r.open) &&
    TIME_RE.test(r.close)
  );
}

/** Defensive read: stored data may not match the current shape (legacy free-text, a hand-edited
 * row, etc.) — never throw, just treat anything that isn't a valid range array as "no ranges". */
function dayRanges(hours: CafeOpeningHours | null | undefined, day: CafeDayKey): CafeHourRange[] {
  const value = hours ? (hours as Record<string, unknown>)[day] : undefined;
  return Array.isArray(value) ? value.filter(isValidHourRange) : [];
}

/** `Intl` weekday-short output, mapped to our Mon-first day keys. */
const WEEKDAY_SHORT_TO_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

function localDayAndMinutes(now: Date, tz: string): { dayIndex: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === 'weekday')!.value;
  const hour = Number(parts.find((p) => p.type === 'hour')!.value);
  const minute = Number(parts.find((p) => p.type === 'minute')!.value);
  return { dayIndex: WEEKDAY_SHORT_TO_INDEX[weekday]!, minutes: hour * 60 + minute };
}

/** Computes "Đang mở / Sắp đóng / Đã đóng / Chưa rõ" from Google-Maps-style opening hours,
 * evaluated in the given IANA timezone (default Asia/Saigon). Pure function — no DB access. */
export function getOpenStatus(
  hours: CafeOpeningHours | null | undefined,
  now: Date,
  tz = 'Asia/Saigon',
): CafeOpenStatus {
  const hasAnyRange = CAFE_DAY_KEYS.some((day) => dayRanges(hours, day).length > 0);
  if (!hasAnyRange) return { state: 'unknown' };

  // Build every occurrence across a 3-week window (previous/current/next) so overnight ranges
  // that cross midnight, and ranges near a week boundary, are found without special-casing.
  const intervals: { startAbs: number; endAbs: number }[] = [];
  for (let week = -1; week <= 1; week += 1) {
    CAFE_DAY_KEYS.forEach((day, dayIndex) => {
      for (const range of mergeCafeHourRanges(dayRanges(hours, day))) {
        const openMin = timeToMinutes(range.open);
        const closeMin = timeToMinutes(range.close);
        // Equal open/close (or close <= open) means the range runs through to the same clock
        // time the next day — treated as a full 24h span in the equal case.
        const durationMinutes =
          closeMin > openMin
            ? closeMin - openMin
            : MINUTES_PER_DAY + closeMin - openMin || MINUTES_PER_DAY;
        const startAbs = (week * 7 + dayIndex) * MINUTES_PER_DAY + openMin;
        intervals.push({ startAbs, endAbs: startAbs + durationMinutes });
      }
    });
  }

  const { dayIndex, minutes } = localDayAndMinutes(now, tz);
  const currentAbs = dayIndex * MINUTES_PER_DAY + minutes;

  const openInterval = intervals.find((i) => currentAbs >= i.startAbs && currentAbs < i.endAbs);
  if (openInterval) {
    const remaining = openInterval.endAbs - currentAbs;
    return {
      state: remaining <= CLOSING_SOON_THRESHOLD_MINUTES ? 'closing_soon' : 'open',
      until: minutesToTime(openInterval.endAbs),
    };
  }

  const upcoming = intervals
    .filter((i) => i.startAbs > currentAbs)
    .sort((a, b) => a.startAbs - b.startAbs)[0];
  if (!upcoming) return { state: 'closed' };

  const nextDayIndex = ((Math.floor(upcoming.startAbs / MINUTES_PER_DAY) % 7) + 7) % 7;
  return {
    state: 'closed',
    nextOpen: { day: CAFE_DAY_KEYS[nextDayIndex]!, time: minutesToTime(upcoming.startAbs) },
  };
}

const cafeBaseFields = {
  name: z.string().trim().min(1).max(200),
  provinceCode: z.string().trim().min(1).max(20),
  wardCode: z.string().trim().min(1).max(20),
  addressLine: z.string().trim().min(1).max(300),
  legacyDistrict: z.string().trim().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  openingHours: cafeOpeningHoursSchema,
  links: cafeLinksSchema,
  sourceUrl: z.url().max(500).optional(),
  consentStatus: cafeConsentStatusEnum,
  consentNote: z.string().trim().max(1000).optional(),
  venueType: venueTypeEnum.optional(),
  amenities: cafeAmenitiesSchema.optional(),
  feeModel: cafeFeeModelEnum.optional(),
  feeNote: z.string().trim().max(120).optional(),
};

/** sourceUrl required unless consent is fully granted. */
export const cafeCreateSchema = z
  .object(cafeBaseFields)
  .refine((v) => v.consentStatus === 'granted' || v.sourceUrl !== undefined, {
    message: 'sourceUrl bắt buộc khi consentStatus khác "granted"',
    path: ['sourceUrl'],
  });
export type CafeCreateInput = z.infer<typeof cafeCreateSchema>;

/** Fields whose column is nullable: accept `null` on update so a maintainer can clear them. */
const nullableCafeUpdateFields = {
  legacyDistrict: cafeBaseFields.legacyDistrict.nullable(),
  lat: cafeBaseFields.lat.nullable(),
  lng: cafeBaseFields.lng.nullable(),
  openingHours: cafeBaseFields.openingHours.nullable(),
  links: cafeBaseFields.links.nullable(),
  sourceUrl: cafeBaseFields.sourceUrl.nullable(),
  consentNote: cafeBaseFields.consentNote.nullable(),
  amenities: cafeBaseFields.amenities.nullable(),
  feeNote: cafeBaseFields.feeNote.nullable(),
};

export const cafeUpdateSchema = z
  .object({ ...cafeBaseFields, ...nullableCafeUpdateFields })
  .partial();
export type CafeUpdateInput = z.infer<typeof cafeUpdateSchema>;

const boolQueryParam = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

export const cafeFilterSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  province: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  venueType: venueTypeEnum.optional(),
  byog: boolQueryParam,
  food: boolQueryParam,
  privateRoom: boolQueryParam,
  largeTables: boolQueryParam,
  /** feeModel in ('free', 'with_drink') — i.e. no separate charge for playing. */
  free: boolQueryParam,
  openNow: boolQueryParam,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type CafeFilter = z.infer<typeof cafeFilterSchema>;

const optionalCoord = (min: number, max: number) => z.coerce.number().min(min).max(max).optional();

export const cafeMapFilterSchema = z
  .object({
    province: z.string().trim().optional(),
    ward: z.string().trim().optional(),
    venueType: venueTypeEnum.optional(),
    byog: boolQueryParam,
    food: boolQueryParam,
    privateRoom: boolQueryParam,
    largeTables: boolQueryParam,
    free: boolQueryParam,
    openNow: boolQueryParam,
    /** "có game X" — matches `cafe_games` by game slug. */
    gameSlug: z.string().trim().min(1).max(150).optional(),
    minLng: optionalCoord(-180, 180),
    minLat: optionalCoord(-90, 90),
    maxLng: optionalCoord(-180, 180),
    maxLat: optionalCoord(-90, 90),
  })
  .refine(
    (v) =>
      [v.minLng, v.minLat, v.maxLng, v.maxLat].every((x) => x === undefined) ||
      [v.minLng, v.minLat, v.maxLng, v.maxLat].every((x) => x !== undefined),
    { message: 'bbox cần đủ 4 tham số minLng, minLat, maxLng, maxLat', path: ['minLng'] },
  )
  .refine((v) => v.minLng === undefined || (v.minLng < v.maxLng! && v.minLat! < v.maxLat!), {
    message: 'bbox không hợp lệ: minLng/minLat phải nhỏ hơn maxLng/maxLat',
    path: ['minLng'],
  });
export type CafeMapFilter = z.infer<typeof cafeMapFilterSchema>;

export interface CafeMapPinDto {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  venueType: VenueType;
  /** true only when consentStatus === 'granted'. */
  verified: boolean;
  /** Undefined for a `public_info_only` café (hours aren't public yet). */
  openStatus?: CafeOpenStatus;
}

export const cafeGameInputSchema = z.object({
  gameId: z.uuid(),
  copies: z.coerce.number().int().positive().max(999).optional(),
  addedVia: cafeGameAddedViaEnum.optional(),
});
export type CafeGameInput = z.infer<typeof cafeGameInputSchema>;

export const cafeGameCopiesSchema = z.object({
  copies: z.coerce.number().int().positive().max(999),
});
export type CafeGameCopiesInput = z.infer<typeof cafeGameCopiesSchema>;

export const cafeGameBulkInputSchema = z.object({
  gameIds: z.array(z.uuid()).min(1).max(200),
  addedVia: cafeGameAddedViaEnum.optional(),
});
export type CafeGameBulkInput = z.infer<typeof cafeGameBulkInputSchema>;

export interface CafeInventoryCategoryDto {
  id: string;
  name: string;
  nameVi: string | null;
}

export interface CafeInventoryItemDto {
  gameId: string;
  slug: string;
  nameVi: string | null;
  nameEn: string;
  imageUrl: string | null;
  copies: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  playMinutes: number | null;
  categories: CafeInventoryCategoryDto[];
}

export interface CafeMaintainerInventoryItemDto extends CafeInventoryItemDto {
  addedVia: CafeGameAddedVia;
  addedBy: string | null;
}

export interface CafePublicSummaryDto {
  id: string;
  slug: string;
  name: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressLine: string;
  legacyDistrict: string | null;
  lat: number | null;
  lng: number | null;
  links: CafeLinks;
  gameCount: number;
  /** true only when consentStatus === 'granted' — owner explicitly verified and opted in. */
  verified: boolean;
  venueType: VenueType;
  /** Undefined for a `public_info_only` café (hours aren't public yet). */
  openStatus?: CafeOpenStatus;
  /** Undefined for a `public_info_only` café — media isn't public yet. */
  logoUrl?: string | null;
  coverUrl?: string | null;
}

/** `amenities`/`feeModel`/`feeNote`/`openStatus` are `undefined` for a `public_info_only` café —
 * only basic info (incl. `venueType`) is public for those until the owner grants full consent. */
export interface CafePublicDetailDto extends CafePublicSummaryDto {
  openingHours: CafeOpeningHours;
  amenities?: CafeAmenities;
  feeModel?: CafeFeeModel;
  feeNote?: string | null;
  inventory: CafeInventoryItemDto[];
  /** Empty for a `public_info_only` café — media isn't public yet. */
  photos: CafePhotoDto[];
}

export interface CafeMaintainerDto extends CafePublicDetailDto {
  sourceUrl: string | null;
  consentStatus: CafeConsentStatus;
  consentNote: string | null;
  verifiedAt: string | null;
  createdBy: string | null;
  inventory: CafeMaintainerInventoryItemDto[];
}

export interface CafeListResponse {
  items: CafePublicSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}

export interface CafeMaintainerListResponse {
  items: CafeMaintainerDto[];
  page: number;
  pageSize: number;
  total: number;
}

/** Owner/staff-facing café DTO: same fields as the maintainer DTO but never exposes who added a
 * given inventory row (only admins see community-contribution identity). */
export interface CafeOwnerInventoryItemDto extends CafeInventoryItemDto {
  addedVia: CafeGameAddedVia;
}

/** consentNote carries the owner's private decline reason for admins only — never sent to the
 * owner/staff who wrote it, and never writable through the owner PATCH route. */
export interface CafeOwnerDto extends CafePublicDetailDto {
  sourceUrl: string | null;
  consentStatus: CafeConsentStatus;
  verifiedAt: string | null;
  inventory: CafeOwnerInventoryItemDto[];
}

export interface CafeForGameDto {
  id: string;
  slug: string;
  name: string;
  provinceName: string;
  wardName: string;
  addressLine: string;
  links: CafeLinks;
  copies: number;
}

export interface BulkAddGamesResult {
  added: number;
  skipped: number;
}
