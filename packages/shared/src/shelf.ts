import { z } from 'zod';
import type { GameSummaryDto } from './games.js';

export const shelfConditionEnum = z.enum(['new', 'like_new', 'good', 'worn']);
export type ShelfCondition = z.infer<typeof shelfConditionEnum>;

export const shelfAddSchema = z.object({
  gameId: z.uuid(),
  /** For the fields below: omitted = keep, `null` = clear. */
  condition: shelfConditionEnum.nullable().optional(),
  sleeved: z.boolean().optional(),
  boxProtected: z.boolean().optional(),
  edition: z.string().trim().max(60).nullable().optional(),
  /** Omitted key = keep the existing note untouched; blank string = explicit clear (stored as `null`). */
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : v === undefined ? undefined : null)),
});
export type ShelfAddInput = z.infer<typeof shelfAddSchema>;

export const gameIdParamSchema = z.object({ gameId: z.uuid() });
export const barcodeCodeParamSchema = z.object({ code: z.string().trim().min(1) });

export interface ShelfItemDto {
  game: GameSummaryDto;
  note: string | null;
  condition: ShelfCondition | null;
  sleeved: boolean;
  boxProtected: boolean;
  edition: string | null;
  /** Latest `startedAt` of a play where the owner's member identity is a player; null if never. */
  lastPlayedAt: string | null;
  createdAt: string;
}

export interface WishlistItemDto {
  game: GameSummaryDto;
  createdAt: string;
}
export interface WishlistListResponse {
  items: WishlistItemDto[];
}
export interface WishlistIdsResponse {
  gameIds: string[];
}

export const suggestSourceEnum = z.enum([
  'all',
  'province',
  'cafe',
  'shelf',
  'wishlist',
  'club',
  'friends',
  'city',
]);
export const suggestPresetEnum = z.enum([
  'random',
  'solo',
  'best2',
  'best3',
  'best4',
  'party',
  'heavy',
  'rare',
]);
export const suggestWeightEnum = z.enum(['light', 'medium', 'heavy']);
export const suggestRarityEnum = z.enum(['common', 'rare', 'epic', 'legendary', 'ancient']);
export type SuggestRarity = z.infer<typeof suggestRarityEnum>;

export const suggestQuerySchema = z.object({
  source: suggestSourceEnum.default('all'),
  preset: suggestPresetEnum.default('random'),
  provinceCode: z.string().min(1).optional(),
  cafeId: z.uuid().optional(),
  /** Required for source 'club'; the caller must be a member. */
  clubId: z.uuid().optional(),
  players: z.coerce.number().int().min(1).max(20).optional(),
  maxMinutes: z.coerce.number().int().min(1).max(600).optional(),
  weight: suggestWeightEnum.optional(),
});
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

export interface SuggestOwnerDto {
  name: string;
  username: string | null;
}

export interface SuggestPoolItemDto {
  game: GameSummaryDto;
  rarity: SuggestRarity;
  /** Cafés (within the chosen province, or nationwide) whose public inventory has the game. */
  cafeCount: number;
  /**
   * Sources club / friends / city only: people in that source who own the game and allow it
   * (at most 5, never the caller). `ownerCount` is the full count.
   */
  owners?: SuggestOwnerDto[];
  ownerCount?: number;
}
export interface SuggestPoolResponse {
  /** At most 150 items, shuffled server-side. */
  items: SuggestPoolItemDto[];
  /** Matching games before the 150 cap. */
  total: number;
}

export type ShelfListResult = { hidden: true } | { hidden: false; items: ShelfItemDto[] };

export interface LocalBarcodeLookupResult {
  code: string;
  game: GameSummaryDto | null;
}
