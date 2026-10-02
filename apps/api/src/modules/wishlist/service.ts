import type { WishlistIdsResponse, WishlistListResponse } from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import * as gamesRepo from '../games/repo.js';
import { toSummaryDto } from '../games/service.js';
import * as repo from './repo.js';

export async function listWishlistService(userId: string): Promise<WishlistListResponse> {
  const rows = await repo.listWishlistItems(userId);
  const gamesById = new Map(
    (await gamesRepo.findGamesByIds(rows.map((r) => r.gameId))).map((g) => [g.id, g]),
  );
  return {
    items: rows.flatMap((row) => {
      const game = gamesById.get(row.gameId);
      return game ? [{ game: toSummaryDto(game), createdAt: row.createdAt.toISOString() }] : [];
    }),
  };
}

export async function listWishlistIdsService(userId: string): Promise<WishlistIdsResponse> {
  return { gameIds: (await repo.listWishlistItems(userId)).map((r) => r.gameId) };
}

/** Returns true when newly added, false when it was already wishlisted. */
export async function addToWishlistService(userId: string, gameId: string): Promise<boolean> {
  if (!(await gamesRepo.findGameById(gameId))) {
    throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  }
  return repo.insertWishlistItem(userId, gameId);
}

export function removeFromWishlistService(userId: string, gameId: string): Promise<void> {
  return repo.deleteWishlistItem(userId, gameId);
}
