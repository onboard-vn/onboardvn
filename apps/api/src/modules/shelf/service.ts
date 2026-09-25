import type {
  LocalBarcodeLookupResult,
  ShelfAddInput,
  ShelfItemDto,
  ShelfListResult,
} from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import { canView, loadViewerRelation } from '../../lib/visibility.js';
import { normalizeBarcode } from '../games/barcode.js';
import * as gamesRepo from '../games/repo.js';
import type { GameRow } from '../games/repo.js';
import { toSummaryDto } from '../games/service.js';
import * as usersRepo from '../users/repo.js';
import * as repo from './repo.js';
import type { UserGameRow } from './repo.js';

async function requireGame(gameId: string): Promise<GameRow> {
  const row = await gamesRepo.findGameById(gameId);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  return row;
}

async function toItemDtos(rows: UserGameRow[]): Promise<ShelfItemDto[]> {
  const gamesById = new Map(
    (await gamesRepo.findGamesByIds(rows.map((r) => r.gameId))).map((g) => [g.id, g]),
  );
  return rows.flatMap((row) => {
    const game = gamesById.get(row.gameId);
    if (!game) return [];
    return [{ game: toSummaryDto(game), note: row.note, createdAt: row.createdAt.toISOString() }];
  });
}

export async function addToShelfService(
  userId: string,
  input: ShelfAddInput,
): Promise<ShelfItemDto> {
  const game = await requireGame(input.gameId);
  await repo.upsertShelfItem(userId, input.gameId, input.note);
  const row = await repo.findShelfItem(userId, input.gameId);
  return {
    game: toSummaryDto(game),
    note: row?.note ?? input.note ?? null,
    createdAt: (row?.createdAt ?? new Date()).toISOString(),
  };
}

export async function removeFromShelfService(userId: string, gameId: string): Promise<void> {
  const deleted = await repo.deleteShelfItem(userId, gameId);
  if (!deleted) throw new ApiError('NOT_FOUND', 404, 'Game không có trong tủ');
}

export async function listMyShelfService(userId: string): Promise<ShelfItemDto[]> {
  return toItemDtos(await repo.listShelfItems(userId));
}

export async function getShelfForProfileService(
  viewerId: string | null,
  username: string,
): Promise<ShelfListResult> {
  const target = await usersRepo.findPublicUserByUsername(username.toLowerCase());
  if (!target?.username) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy người dùng');

  const relation = await loadViewerRelation(viewerId, target.id);
  if (!canView(target.profileVisibility, relation)) return { hidden: true };

  return { hidden: false, items: await toItemDtos(await repo.listShelfItems(target.id)) };
}

export async function lookupLocalBarcodeService(
  rawCode: string,
): Promise<LocalBarcodeLookupResult> {
  const code = normalizeBarcode(rawCode);
  const barcodeRow = await gamesRepo.findBarcode(code);
  if (!barcodeRow) return { code, game: null };
  const game = await gamesRepo.findGameById(barcodeRow.gameId);
  return { code, game: game ? toSummaryDto(game) : null };
}
