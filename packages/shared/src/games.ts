import { z } from 'zod';

export const gameBarcodeSourceEnum = z.enum(['manual', 'gameupc']);
export type GameBarcodeSource = z.infer<typeof gameBarcodeSourceEnum>;

export const barcodeInputSchema = z.object({
  code: z.string().trim().min(6).max(20),
  edition: z.string().trim().max(120).optional(),
});
export type BarcodeInput = z.infer<typeof barcodeInputSchema>;

export const descriptionSourceEnum = z.enum(['original', 'translated_with_permission']);
export type DescriptionSource = z.infer<typeof descriptionSourceEnum>;

export const descriptionLicenseEnum = z.enum(['CC-BY-SA-4.0', 'permission-only']);
export type DescriptionLicense = z.infer<typeof descriptionLicenseEnum>;

export const categoryKindEnum = z.enum(['category', 'mechanic']);
export type CategoryKind = z.infer<typeof categoryKindEnum>;

const VIDEO_URL_PATTERN =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/|youtu\.be\/|facebook\.com\/|fb\.watch\/)/i;

const videoUrlSchema = z
  .url()
  .max(500)
  .regex(VIDEO_URL_PATTERN, 'Chỉ chấp nhận link YouTube hoặc Facebook');

const gameBaseFields = {
  nameVi: z.string().trim().min(1).max(200).optional(),
  nameEn: z.string().trim().min(1).max(200),
  minPlayers: z.coerce.number().int().positive().max(100).optional(),
  maxPlayers: z.coerce.number().int().positive().max(100).optional(),
  playMinutes: z.coerce.number().int().positive().max(1000).optional(),
  weight: z.coerce.number().min(1).max(5).optional(),
  minAge: z.coerce.number().int().nonnegative().max(21).optional(),
  isVietnamese: z.boolean().optional(),
  bggId: z.coerce.number().int().positive().optional(),
  descriptionVi: z.string().trim().max(5000).optional(),
  descriptionSource: descriptionSourceEnum.optional(),
  descriptionRightsHolder: z.string().trim().min(1).max(200).optional(),
  descriptionPermissionRef: z.string().trim().min(1).max(500).optional(),
  descriptionLicense: descriptionLicenseEnum.optional(),
  videoUrls: z.array(videoUrlSchema).max(5).optional(),
  /** Not persisted; consumed by the service to gate the CC BY-SA acceptance invariant. */
  acceptLicense: z.boolean().optional(),
  imageCredit: z.string().trim().max(300).optional(),
  categoryIds: z.array(z.uuid()).optional(),
};

const withPlayerRangeCheck = <
  T extends z.ZodType<{ minPlayers?: number | null; maxPlayers?: number | null }>,
>(
  schema: T,
) =>
  schema.refine(
    (v) => v.minPlayers == null || v.maxPlayers == null || v.minPlayers <= v.maxPlayers,
    {
      message: 'Số người chơi tối thiểu phải <= tối đa',
      path: ['minPlayers'],
    },
  );

export const gameCreateSchema = withPlayerRangeCheck(z.object(gameBaseFields));
export type GameCreateInput = z.infer<typeof gameCreateSchema>;

/** Fields whose column is nullable: accept `null` on update so a maintainer can clear them. */
const nullableGameUpdateFields = {
  nameVi: gameBaseFields.nameVi.nullable(),
  minPlayers: gameBaseFields.minPlayers.nullable(),
  maxPlayers: gameBaseFields.maxPlayers.nullable(),
  playMinutes: gameBaseFields.playMinutes.nullable(),
  weight: gameBaseFields.weight.nullable(),
  minAge: gameBaseFields.minAge.nullable(),
  bggId: gameBaseFields.bggId.nullable(),
  descriptionVi: gameBaseFields.descriptionVi.nullable(),
  descriptionRightsHolder: gameBaseFields.descriptionRightsHolder.nullable(),
  descriptionPermissionRef: gameBaseFields.descriptionPermissionRef.nullable(),
  imageCredit: gameBaseFields.imageCredit.nullable(),
};

export const gameUpdateSchema = withPlayerRangeCheck(
  z.object({ ...gameBaseFields, ...nullableGameUpdateFields }).partial(),
);
export type GameUpdateInput = z.infer<typeof gameUpdateSchema>;

export const gameFilterSchema = z.object({
  q: z.string().trim().min(1).max(200).optional(),
  players: z.coerce.number().int().positive().optional(),
  maxTime: z.coerce.number().int().positive().optional(),
  maxWeight: z.coerce.number().min(1).max(5).optional(),
  categoryId: z.uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});
export type GameFilter = z.infer<typeof gameFilterSchema>;

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  nameVi: z.string().trim().min(1).max(80).optional(),
  kind: categoryKindEnum.optional(),
  bggId: z.coerce.number().int().positive().optional(),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

export const categoryUpdateSchema = categoryCreateSchema.partial();
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

export const categoryFilterSchema = z.object({ kind: categoryKindEnum.optional() });
export type CategoryFilter = z.infer<typeof categoryFilterSchema>;

export interface CategoryDto {
  id: string;
  name: string;
  nameVi: string | null;
  kind: CategoryKind;
  bggId: number | null;
}

export interface GameBarcodeDto {
  code: string;
  edition: string | null;
  source: GameBarcodeSource;
}

export interface GameSummaryDto {
  id: string;
  slug: string;
  nameVi: string | null;
  nameEn: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playMinutes: number | null;
  weight: string | null;
  minAge: number | null;
  isVietnamese: boolean;
  bggId: number | null;
  imageUrl: string | null;
  categories: CategoryDto[];
}

export interface GameDetailDto extends GameSummaryDto {
  descriptionVi: string | null;
  descriptionSource: DescriptionSource;
  descriptionRightsHolder: string | null;
  descriptionLicense: DescriptionLicense;
  /** Maintainer-only; the public route omits this field entirely. */
  descriptionPermissionRef?: string | null;
  videoUrls: string[];
  imageCredit: string | null;
  bggUrl: string | null;
  barcodes: GameBarcodeDto[];
}

export interface GameRevisionDto {
  id: string;
  editorName: string | null;
  createdAt: string;
  licenseAcceptedAt: string | null;
}

export interface GameListResponse {
  items: GameSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}
