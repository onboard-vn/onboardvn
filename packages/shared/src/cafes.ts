import { z } from 'zod';

export const cafeConsentStatusEnum = z.enum(['granted', 'pending', 'public_info_only']);
export type CafeConsentStatus = z.infer<typeof cafeConsentStatusEnum>;

export const cafeGameAddedViaEnum = z.enum(['manual', 'scan']);
export type CafeGameAddedVia = z.infer<typeof cafeGameAddedViaEnum>;

const cafeLinksSchema = z
  .object({
    fanpage: z.url().max(500).optional(),
    maps: z.url().max(500).optional(),
  })
  .optional();
export type CafeLinks = z.infer<typeof cafeLinksSchema>;

const cafeOpeningHoursSchema = z.record(z.string(), z.string().max(60)).optional();
export type CafeOpeningHours = z.infer<typeof cafeOpeningHoursSchema>;

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
};

export const cafeUpdateSchema = z
  .object({ ...cafeBaseFields, ...nullableCafeUpdateFields })
  .partial();
export type CafeUpdateInput = z.infer<typeof cafeUpdateSchema>;

export const cafeFilterSchema = z.object({
  province: z.string().trim().optional(),
  ward: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type CafeFilter = z.infer<typeof cafeFilterSchema>;

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

export interface CafeInventoryItemDto {
  gameId: string;
  slug: string;
  nameVi: string | null;
  nameEn: string;
  imageUrl: string | null;
  copies: number;
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
}

export interface CafePublicDetailDto extends CafePublicSummaryDto {
  openingHours: CafeOpeningHours;
  inventory: CafeInventoryItemDto[];
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
