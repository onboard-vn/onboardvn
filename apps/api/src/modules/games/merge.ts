import { createHash } from 'node:crypto';
import type { GameAliasDto, GameMergePreviewDto } from '@onboard/shared';
import { eq, sql } from 'drizzle-orm';
import { games, gameRevisions } from '../../db/schema/games.js';
import { ApiError } from '../../lib/errors.js';
import { dedupeAliases, withGameIdentityLock } from './identity.js';
import type { Tx } from './repo.js';

// Every table with a game FK participates. Lock ordering stays identical for preview and merge.
const tables = [
  'user_games',
  'user_wishlist',
  'cafe_games',
  'cafe_game_events',
  'club_external_ownerships',
  'game_categories',
  'game_barcodes',
  'game_external_metadata',
  'score_templates',
  'plays',
  'meetup_tables',
  'game_revisions',
] as const;
type Row = Record<string, unknown>;

async function lockReferences(tx: Tx) {
  for (const table of tables)
    await tx.execute(sql.raw(`lock table ${table} in share row exclusive mode`));
}

function stable(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}

export async function buildMergePreview(
  tx: Tx,
  sourceId: string,
  targetId: string,
): Promise<GameMergePreviewDto> {
  if (sourceId === targetId)
    throw new ApiError('VALIDATION_FAILED', 422, 'Chọn hai game khác nhau');
  const result = await tx.execute<Row>(
    sql`select * from games where id in (${sourceId}, ${targetId}) order by id for update`,
  );
  const source = result.rows.find((row) => row.id === sourceId);
  const target = result.rows.find((row) => row.id === targetId);
  if (!source || !target) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  const blockers: GameMergePreviewDto['blockers'] = [];
  if (source.canonical_id || target.canonical_id)
    blockers.push({ table: 'games', reason: 'Game đã được gộp; chọn game chuẩn và xem trước lại' });
  if (source.variant_of_id || target.variant_of_id)
    blockers.push({ table: 'games', reason: 'Gỡ hoặc giải quyết quan hệ phiên bản trước khi gộp' });
  const mergedAliases = dedupeAliases([
    ...(target.aliases as GameAliasDto[]),
    ...(source.aliases as GameAliasDto[]),
    { name: source.name_en as string, kind: 'name', language: 'en' },
    ...(source.name_vi
      ? [{ name: source.name_vi as string, kind: 'name' as const, language: 'vi' }]
      : []),
  ]);
  if (mergedAliases.length > 100)
    blockers.push({
      table: 'games',
      reason: 'Tên thay thế sau gộp vượt 100; giải quyết danh sách tên trước khi gộp',
    });
  const children = await tx.execute<Row>(
    sql`select * from games where canonical_id in (${sourceId}, ${targetId}) or variant_of_id in (${sourceId}, ${targetId}) order by id`,
  );
  if (children.rows.some((row) => row.variant_of_id))
    blockers.push({
      table: 'games',
      reason: 'Giải quyết các game phiên bản liên quan trước khi gộp',
    });
  const state: Record<string, unknown> = { games: result.rows, children: children.rows };
  const counts: Record<string, number> = {};
  const collisionKeys: Record<string, string[]> = {
    user_games: ['user_id'],
    user_wishlist: ['user_id'],
    cafe_games: ['cafe_id'],
    club_external_ownerships: ['club_id', 'external_member_id'],
    score_templates: ['variant', 'version'],
  };
  for (const table of tables) {
    const rows = await tx.execute<Row>(
      sql`select * from ${sql.raw(table)} where game_id in (${sourceId}, ${targetId})`,
    );
    state[table] = [...rows.rows].sort((a, b) => stable(a).localeCompare(stable(b)));
    counts[table] = rows.rows.filter((row) => row.game_id === sourceId).length;
    const keys = collisionKeys[table];
    if (keys) {
      const targetKeys = new Set(
        rows.rows
          .filter((row) => row.game_id === targetId)
          .map((row) => stable(keys.map((key) => row[key]))),
      );
      const overlaps = rows.rows.filter(
        (row) => row.game_id === sourceId && targetKeys.has(stable(keys.map((key) => row[key]))),
      );
      if (overlaps.length)
        blockers.push({
          table,
          reason: `${overlaps.length} bản ghi trùng khóa; giải quyết dữ liệu cả hai game trước khi gộp`,
        });
    }
  }
  return {
    sourceId,
    targetId,
    blockers,
    counts,
    fingerprint: createHash('sha256').update(stable(state)).digest('hex'),
  };
}

export function previewGameMerge(sourceId: string, targetId: string) {
  return withGameIdentityLock(async (tx) => {
    await lockReferences(tx);
    return buildMergePreview(tx, sourceId, targetId);
  });
}

export async function mergeGames(
  sourceId: string,
  targetId: string,
  fingerprint: string,
  editorId: string,
): Promise<void> {
  await withGameIdentityLock(async (tx) => {
    await lockReferences(tx);
    const preview = await buildMergePreview(tx, sourceId, targetId);
    if (preview.blockers.length || preview.fingerprint !== fingerprint) {
      throw new ApiError(
        'CONFLICT',
        409,
        preview.blockers.length
          ? 'Cần giải quyết xung đột trước khi gộp'
          : 'Dữ liệu đã thay đổi; xem trước lại',
        preview,
      );
    }
    const [source] = await tx.select().from(games).where(eq(games.id, sourceId));
    const [target] = await tx.select().from(games).where(eq(games.id, targetId));
    const aliases: GameAliasDto[] = dedupeAliases([
      ...target!.aliases,
      ...source!.aliases,
      { name: source!.nameEn, kind: 'name', language: 'en' },
      ...(source!.nameVi ? [{ name: source!.nameVi, kind: 'name' as const, language: 'vi' }] : []),
    ]);
    // Categories are set membership. All other unique collisions were rejected above.
    await tx.execute(
      sql`insert into game_categories(game_id, category_id) select ${targetId}::uuid, category_id from game_categories where game_id = ${sourceId} on conflict do nothing`,
    );
    await tx.execute(sql`delete from game_categories where game_id = ${sourceId}`);
    for (const table of tables) {
      // Original revisions remain attached to the retained source for attribution/provenance.
      if (table === 'game_categories' || table === 'game_revisions') continue;
      await tx.execute(
        sql`update ${sql.raw(table)} set game_id = ${targetId} where game_id = ${sourceId}`,
      );
    }
    await tx.update(games).set({ aliases }).where(eq(games.id, targetId));
    // Flatten previous tombstones so old IDs never accumulate redirect chains.
    await tx.execute(
      sql`update games set canonical_id = ${targetId} where canonical_id = ${sourceId}`,
    );
    await tx.update(games).set({ canonicalId: targetId }).where(eq(games.id, sourceId));
    await tx.insert(gameRevisions).values({
      gameId: targetId,
      editorId,
      snapshot: {
        action: 'merge',
        sourceId,
        targetId,
        fingerprint,
        source,
        target,
        counts: preview.counts,
      },
    });
  });
}
