import { z } from 'zod';
import type { GameSummaryDto } from './games.js';

export const linkBarcodeInputSchema = z.object({
  gameId: z.uuid(),
  edition: z.string().trim().max(120).optional(),
  submitUpstream: z.boolean().optional(),
});
export type LinkBarcodeInput = z.infer<typeof linkBarcodeInputSchema>;

export interface GameUpcCandidate {
  bggId: number;
  name: string;
  confidence: number;
  localGame?: GameSummaryDto;
}

export type BarcodeLookupResult =
  | { kind: 'local'; code: string; game: GameSummaryDto }
  | { kind: 'candidates'; code: string; items: GameUpcCandidate[] }
  | { kind: 'unknown'; code: string; providerError?: boolean };

export interface LinkBarcodeResult {
  code: string;
  gameId: string;
  source: 'manual' | 'gameupc';
}
