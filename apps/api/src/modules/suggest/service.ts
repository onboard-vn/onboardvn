import type {
  SuggestOwnerDto,
  SuggestPoolItemDto,
  SuggestPoolResponse,
  SuggestQuery,
  SuggestRarity,
} from '@onboard/shared';
import { sql, type SQL } from 'drizzle-orm';
import { games } from '../../db/schema/index.js';
import { ApiError } from '../../lib/errors.js';
import * as gamesRepo from '../games/repo.js';
import { toSummaryDto } from '../games/service.js';
import { isClubMember } from '../clubs/repo.js';
import * as repo from './repo.js';

const POOL_LIMIT = 150;
const RARITIES: SuggestRarity[] = ['common', 'rare', 'epic', 'legendary', 'ancient'];

export function rarityOf(cafeCount: number, weight: number | null): SuggestRarity {
  let tier =
    cafeCount >= 10 ? 0 : cafeCount >= 5 ? 1 : cafeCount >= 2 ? 2 : cafeCount === 1 ? 3 : 4;
  if (weight !== null && weight >= 3) tier = Math.min(tier + 1, RARITIES.length - 1);
  return RARITIES[tier]!;
}

function buildFilters(query: SuggestQuery): SQL[] {
  const filters: SQL[] = [];
  const { preset } = query;
  const players =
    preset === 'solo'
      ? 1
      : preset === 'best2'
        ? 2
        : preset === 'best3'
          ? 3
          : preset === 'best4'
            ? 4
            : query.players;

  if (players !== undefined) {
    filters.push(sql`${games.minPlayers} <= ${players} and ${games.maxPlayers} >= ${players}`);
  }
  if (query.maxMinutes !== undefined)
    filters.push(sql`${games.playMinutes} <= ${query.maxMinutes}`);
  if (query.weight === 'light') filters.push(sql`${games.weight} < 2.2`);
  if (query.weight === 'medium') filters.push(sql`${games.weight} between 2.2 and 3.2`);
  if (query.weight === 'heavy') filters.push(sql`${games.weight} > 3.2`);
  if (preset === 'party') {
    filters.push(
      sql`${games.maxPlayers} >= 6 and (${games.weight} is null or ${games.weight} < 2.2)`,
    );
  }
  if (preset === 'heavy') filters.push(sql`${games.weight} >= 3.2`);
  return filters;
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

export async function suggestPoolService(
  userId: string | null,
  query: SuggestQuery,
): Promise<SuggestPoolResponse> {
  const { source } = query;
  if ((source === 'province' || source === 'city') && !query.provinceCode) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu provinceCode');
  }
  if (source === 'cafe') {
    if (!query.cafeId) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu cafeId');
    if (!(await repo.publicCafeExists(query.cafeId))) {
      throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
    }
  }
  if (
    (source === 'shelf' || source === 'wishlist' || source === 'club' || source === 'friends') &&
    !userId
  ) {
    throw new ApiError('UNAUTHENTICATED', 401, 'Bạn cần đăng nhập');
  }

  if (source === 'club') {
    if (!query.clubId) throw new ApiError('VALIDATION_FAILED', 422, 'Thiếu clubId');
    if (!(await isClubMember(query.clubId, userId!))) {
      throw new ApiError('FORBIDDEN', 403, 'Bạn không phải thành viên club này');
    }
  }

  const scope: repo.PoolScope = {
    source,
    provinceCode: query.provinceCode,
    cafeId: query.cafeId,
    clubId: query.clubId,
    userId: userId ?? undefined,
  };
  const candidates = await repo.findCandidates(scope, buildFilters(query));
  const counts = await repo.cafeCountsByGame(query.provinceCode);
  const tiers = candidates.map((g) => {
    const cafeCount = counts.get(g.id) ?? 0;
    return { id: g.id, cafeCount, rarity: rarityOf(cafeCount, g.weight) };
  });
  const matching =
    query.preset === 'rare'
      ? tiers.filter((t) => RARITIES.indexOf(t.rarity) >= RARITIES.indexOf('epic'))
      : tiers;

  const picked = shuffle(matching).slice(0, POOL_LIMIT);
  const rows = new Map(
    (await gamesRepo.findGamesByIds(picked.map((p) => p.id))).map((g) => [g.id, g]),
  );
  const social = source === 'club' || source === 'friends' || source === 'city';
  const ownersByGame = new Map<string, SuggestOwnerDto[]>();
  if (social) {
    for (const o of await repo.findOwners(
      scope,
      picked.map((p) => p.id),
    )) {
      if (o.userId === userId) continue;
      const list = ownersByGame.get(o.gameId) ?? [];
      list.push({ name: o.name, username: o.username });
      ownersByGame.set(o.gameId, list);
    }
  }
  const items = picked.flatMap((p): SuggestPoolItemDto[] => {
    const game = rows.get(p.id);
    if (!game) return [];
    const item: SuggestPoolItemDto = {
      game: toSummaryDto(game),
      rarity: p.rarity,
      cafeCount: p.cafeCount,
    };
    if (social) {
      const owners = ownersByGame.get(p.id) ?? [];
      item.owners = owners.slice(0, 5);
      item.ownerCount = owners.length;
    }
    return [item];
  });
  return { items, total: matching.length };
}
