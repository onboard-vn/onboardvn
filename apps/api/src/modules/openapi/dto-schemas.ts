import { z } from 'zod';

/**
 * Mirrors the public-facing shape of the DTOs in `@onboard/shared` (games.ts, cafes.ts,
 * locations.ts) for OpenAPI generation only. Kept local instead of in shared because the
 * shared DTOs are plain TS interfaces, not zod schemas, and only the public subset of fields
 * is documented here (staff-only fields like `consentStatus`/`sourceUrl`/`descriptionPermissionRef`
 * are intentionally omitted).
 */

export const categoryDtoSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  nameVi: z.string().nullable(),
  kind: z.enum(['category', 'mechanic']),
  bggId: z.number().int().nullable(),
});

export const gameBarcodeDtoSchema = z.object({
  code: z.string(),
  edition: z.string().nullable(),
  source: z.enum(['manual', 'gameupc']),
});

export const gameSummaryDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  nameVi: z.string().nullable(),
  nameEn: z.string(),
  minPlayers: z.number().int().nullable(),
  maxPlayers: z.number().int().nullable(),
  playMinutes: z.number().int().nullable(),
  weight: z.string().nullable(),
  minAge: z.number().int().nullable(),
  isVietnamese: z.boolean(),
  bggId: z.number().int().nullable(),
  imageUrl: z.string().nullable(),
  categories: z.array(categoryDtoSchema),
});

export const gameDetailDtoSchema = gameSummaryDtoSchema.extend({
  descriptionVi: z.string().nullable(),
  descriptionSource: z.enum(['original', 'translated_with_permission']),
  descriptionRightsHolder: z.string().nullable(),
  descriptionLicense: z.enum(['CC-BY-SA-4.0', 'permission-only']),
  videoUrls: z.array(z.string()),
  imageCredit: z.string().nullable(),
  bggUrl: z.string().nullable(),
  barcodes: z.array(gameBarcodeDtoSchema),
});

export const gameListResponseSchema = z.object({
  items: z.array(gameSummaryDtoSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const cafeLinksDtoSchema = z
  .object({ fanpage: z.url().optional(), maps: z.url().optional() })
  .optional();

export const cafeInventoryItemDtoSchema = z.object({
  gameId: z.uuid(),
  slug: z.string(),
  nameVi: z.string().nullable(),
  nameEn: z.string(),
  imageUrl: z.string().nullable(),
  copies: z.number().int(),
});

export const cafePublicSummaryDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  provinceCode: z.string(),
  provinceName: z.string(),
  wardCode: z.string(),
  wardName: z.string(),
  addressLine: z.string(),
  legacyDistrict: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  links: cafeLinksDtoSchema,
  gameCount: z.number().int(),
});

export const cafePublicDetailDtoSchema = cafePublicSummaryDtoSchema.extend({
  openingHours: z.record(z.string(), z.string()).optional(),
  inventory: z.array(cafeInventoryItemDtoSchema),
});

export const cafeListResponseSchema = z.object({
  items: z.array(cafePublicSummaryDtoSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export const cafeForGameDtoSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  provinceName: z.string(),
  wardName: z.string(),
  addressLine: z.string(),
  links: cafeLinksDtoSchema,
  copies: z.number().int(),
});

export const provinceDtoSchema = z.object({ code: z.string(), name: z.string(), slug: z.string() });
export const wardDtoSchema = z.object({
  code: z.string(),
  provinceCode: z.string(),
  name: z.string(),
  slug: z.string(),
});
export const provinceListResponseSchema = z.object({ items: z.array(provinceDtoSchema) });
export const wardListResponseSchema = z.object({ items: z.array(wardDtoSchema) });

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum([
      'BAD_REQUEST',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'NOT_FOUND',
      'CONFLICT',
      'VALIDATION_FAILED',
      'RATE_LIMITED',
      'INTERNAL',
    ]),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
