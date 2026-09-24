import type {
  BarcodeLookupResult,
  GameBarcodeSource,
  GameSummaryDto,
  GameUpcCandidate,
  LinkBarcodeInput,
  LinkBarcodeResult,
} from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { storage } from '../../lib/storage/index.js';
import { normalizeBarcode } from '../games/barcode.js';
import * as gamesRepo from '../games/repo.js';
import type { GameRow } from '../games/repo.js';
import type { BarcodeProvider } from './gameupc-client.js';
import * as repo from './repo.js';
import { ONE_DAY_MS, THIRTY_DAYS_MS } from './repo.js';

export interface BarcodeDeps {
  barcodeProvider?: BarcodeProvider;
}

function toSummaryDto(row: GameRow): GameSummaryDto {
  return {
    id: row.id,
    slug: row.slug,
    nameVi: row.nameVi,
    nameEn: row.nameEn,
    minPlayers: row.minPlayers,
    maxPlayers: row.maxPlayers,
    playMinutes: row.playMinutes,
    weight: row.weight,
    minAge: row.minAge,
    isVietnamese: row.isVietnamese,
    bggId: row.bggId,
    imageUrl: row.imageKey ? storage.url(row.imageKey) : null,
    categories: row.categories.map((gc) => ({
      id: gc.category.id,
      name: gc.category.name,
      nameVi: gc.category.nameVi,
      kind: gc.category.kind,
      bggId: gc.category.bggId,
    })),
  };
}

/** Looks up cached candidates first, then the provider; caches hits for 30d, misses for 1d. */
async function resolveCandidates(
  code: string,
  provider: BarcodeProvider | undefined,
): Promise<GameUpcCandidate[]> {
  if (!provider) return [];

  const cached = await repo.findCachedLookup(code);
  if (cached) return cached;

  const items = await provider.lookup(code);
  await repo.upsertCachedLookup(
    code,
    provider.name,
    items,
    items.length > 0 ? THIRTY_DAYS_MS : ONE_DAY_MS,
  );
  return items;
}

async function attachLocalGameFlags(items: GameUpcCandidate[]): Promise<GameUpcCandidate[]> {
  return Promise.all(
    items.map(async (item) => {
      const match = await gamesRepo.findGameByBggId(item.bggId);
      if (!match) return item;
      const row = await gamesRepo.findGameById(match.id);
      return row ? { ...item, localGame: toSummaryDto(row) } : item;
    }),
  );
}

export async function lookupBarcodeService(
  rawCode: string,
  deps: BarcodeDeps = {},
): Promise<BarcodeLookupResult> {
  const code = normalizeBarcode(rawCode);

  const barcodeRow = await gamesRepo.findBarcode(code);
  if (barcodeRow) {
    const game = await gamesRepo.findGameById(barcodeRow.gameId);
    if (game) return { kind: 'local', code, game: toSummaryDto(game) };
  }

  const provider = deps.barcodeProvider;
  if (!provider) return { kind: 'unknown', code };

  let items: GameUpcCandidate[];
  try {
    items = await resolveCandidates(code, provider);
  } catch (err) {
    logger.error({ err, code }, 'GameUPC lookup failed');
    return { kind: 'unknown', code, providerError: true };
  }

  if (items.length === 0) return { kind: 'unknown', code };

  return { kind: 'candidates', code, items: await attachLocalGameFlags(items) };
}

export async function linkBarcodeService(
  rawCode: string,
  input: LinkBarcodeInput,
  userId: string,
  deps: BarcodeDeps = {},
): Promise<LinkBarcodeResult> {
  const code = normalizeBarcode(rawCode);

  const game = await gamesRepo.findGameById(input.gameId);
  if (!game) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');

  const existing = await gamesRepo.findBarcode(code);
  if (existing && existing.gameId !== game.id) {
    throw new ApiError('CONFLICT', 409, 'Mã vạch đã được gắn cho game khác');
  }

  const provider = deps.barcodeProvider;
  let source: GameBarcodeSource = 'manual';
  let matchedCandidate: GameUpcCandidate | undefined;

  if (provider && game.bggId != null) {
    const candidates = await resolveCandidates(code, provider).catch(() => []);
    matchedCandidate = candidates.find((c) => c.bggId === game.bggId);
    if (matchedCandidate) source = 'gameupc';
  }

  if (!existing) {
    await gamesRepo.insertBarcode({ code, gameId: game.id, edition: input.edition, source });
  }

  if (input.submitUpstream && provider && matchedCandidate) {
    try {
      await provider.vote(code, matchedCandidate.bggId, `onboard-${userId}`);
    } catch (err) {
      logger.error({ err, code, bggId: matchedCandidate.bggId }, 'GameUPC vote failed');
    }
  }

  return { code, gameId: game.id, source };
}
