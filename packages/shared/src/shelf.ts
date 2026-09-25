import { z } from 'zod';
import type { GameSummaryDto } from './games.js';

export const shelfAddSchema = z.object({
  gameId: z.uuid(),
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
  createdAt: string;
}

export type ShelfListResult = { hidden: true } | { hidden: false; items: ShelfItemDto[] };

export interface LocalBarcodeLookupResult {
  code: string;
  game: GameSummaryDto | null;
}
