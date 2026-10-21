import { randomUUID } from 'node:crypto';
import { gameFilterSchema, type MeetupTableDto } from '@onboard/shared';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import { db, pool } from '../../db/client.js';
import {
  games,
  users,
  userGames,
  userWishlist,
  gameBarcodes,
  gameRevisions,
  cafes,
  cafeGames,
  cafeGameEvents,
  clubs,
  clubExternalMembers,
  clubExternalOwnerships,
  scoreTemplates,
  plays,
  meetups,
  meetupTables,
  gameExternalMetadata,
  categories,
  gameCategories,
  provinces,
  wards,
} from '../../db/schema/index.js';
import { fakeAuth, fakeUser } from '../../test/fake-auth.js';
import { getGameRevisionsService, setGameImageService } from './service.js';
import { dedupeAliases } from './identity.js';
import { mergeGames, previewGameMerge } from './merge.js';
import { findGameById, findGameBySlug, listGames } from './repo.js';

const admin = fakeUser('admin');
const adminApp = createApp({ auth: fakeAuth(admin), rateLimit: false });
const maintainerApp = createApp({ auth: fakeAuth(fakeUser('maintainer')), rateLimit: false });
const userApp = createApp({ auth: fakeAuth(fakeUser('user')), rateLimit: false });
const publicApp = createApp({ auth: fakeAuth(null), rateLimit: false });
const ids: string[] = [];
const cafeIds: string[] = [];
const clubIds: string[] = [];
const meetupIds: string[] = [];
const categoryIds: string[] = [];
const locationCode = `identity-${randomUUID()}`;
async function game(name: string, extra: Partial<typeof games.$inferInsert> = {}) {
  const [row] = await db
    .insert(games)
    .values({ slug: `identity-${randomUUID()}`, nameEn: name, ...extra })
    .returning();
  ids.push(row!.id);
  return row!;
}
function post(app: typeof adminApp, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeAll(async () => {
  await db
    .insert(provinces)
    .values({ code: locationCode, slug: locationCode, name: 'Identity fixtures' });
  await db.insert(wards).values({
    code: locationCode,
    provinceCode: locationCode,
    slug: locationCode,
    name: 'Identity ward',
  });
  await db
    .insert(users)
    .values({ ...admin, role: 'admin' })
    .onConflictDoNothing();
});
afterAll(async () => {
  if (meetupIds.length) await db.delete(meetups).where(inArray(meetups.id, meetupIds));
  if (cafeIds.length) await db.delete(cafes).where(inArray(cafes.id, cafeIds));
  if (clubIds.length) await db.delete(clubs).where(inArray(clubs.id, clubIds));
  // Plays must go before templates because historical pins use ON DELETE RESTRICT.
  if (ids.length) await db.delete(plays).where(inArray(plays.gameId, ids));
  if (ids.length) {
    await db.execute(
      sql`update games set canonical_id = null, variant_of_id = null where id in (${sql.join(
        ids.map((id) => sql`${id}::uuid`),
        sql`, `,
      )})`,
    );
    await db.delete(games).where(inArray(games.id, ids));
  }
  if (categoryIds.length) await db.delete(categories).where(inArray(categories.id, categoryIds));
  await db.delete(users).where(eq(users.id, admin.id));
  await db.delete(wards).where(eq(wards.code, locationCode));
  await db.delete(provinces).where(eq(provinces.code, locationCode));
  await pool.end();
});

describe('canonical game identities', () => {
  it('deduplicates accent/case/spacing aliases without cross-game merging', () => {
    expect(
      dedupeAliases([
        { name: 'Ma Sói', kind: 'name' },
        { name: ' ma   soi ', kind: 'custom' },
        { name: 'Đảo', kind: 'name' },
        { name: 'dao', kind: 'name' },
      ]),
    ).toHaveLength(2);
  });
  it('searches aliases once and excludes tombstones', async () => {
    const token = randomUUID();
    const canonical = await game('Canonical', {
      aliases: [
        { name: `${token} Ma Sói`, kind: 'name' },
        { name: `${token} custom`, kind: 'custom' },
      ],
    });
    await game(token, { canonicalId: canonical.id });
    const result = await listGames(gameFilterSchema.parse({ q: token, page: 1, pageSize: 20 }));
    expect(result.total).toBe(1);
    expect(result.rows.map((r) => r.id)).toEqual([canonical.id]);
    expect(
      (
        await listGames(
          gameFilterSchema.parse({ q: `${token} ma soi`, page: 1, pageSize: 20 }),
        )
      ).total,
    ).toBe(1);
  });
  it('denies merge preview and merge for public/user/maintainer without mutation', async () => {
    const source = await game('Permissions source');
    const target = await game('Permissions target');
    const before = await db
      .select()
      .from(games)
      .where(inArray(games.id, [source.id, target.id]));
    for (const [app, status, code] of [
      [publicApp, 401, 'UNAUTHENTICATED'],
      [userApp, 403, 'FORBIDDEN'],
      [maintainerApp, 403, 'FORBIDDEN'],
    ] as const) {
      for (const endpoint of ['merge-preview', 'merge']) {
        const res = await post(app, `/api/games/${source.id}/${endpoint}`, {
          targetId: target.id,
          fingerprint: 'a'.repeat(64),
        });
        expect(res.status).toBe(status);
        expect(await res.json()).toMatchObject({ error: { code } });
        expect(
          await db
            .select()
            .from(games)
            .where(inArray(games.id, [source.id, target.id])),
        ).toEqual(before);
        expect(
          await db.query.gameRevisions.findMany({
            where: inArray(gameRevisions.gameId, [source.id, target.id]),
          }),
        ).toEqual([]);
      }
    }
  });
  it('rejects unresolved shelf collision and stale fingerprint atomically', async () => {
    const source = await game('Conflict source');
    const target = await game('Conflict target');
    const preview = await previewGameMerge(source.id, target.id);
    await db.update(games).set({ nameEn: 'Changed after preview' }).where(eq(games.id, source.id));
    await expect(
      mergeGames(source.id, target.id, preview.fingerprint, admin.id),
    ).rejects.toMatchObject({ status: 409 });
    await db.insert(userGames).values([
      { userId: admin.id, gameId: source.id, note: 'source note' },
      { userId: admin.id, gameId: target.id, note: 'target note' },
    ]);
    const blocked = await previewGameMerge(source.id, target.id);
    expect(blocked.blockers.some((b) => b.table === 'user_games')).toBe(true);
    await expect(
      mergeGames(source.id, target.id, blocked.fingerprint, admin.id),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      (await db.query.games.findFirst({ where: eq(games.id, source.id) }))!.canonicalId,
    ).toBeNull();
    const notes = await db
      .select()
      .from(userGames)
      .where(inArray(userGames.gameId, [source.id, target.id]));
    expect(notes.map((r) => r.note).sort()).toEqual(['source note', 'target note']);
  });
  it('retains provenance and old IDs/slugs, moves shelf and barcodes, normalizes late UUID writes', async () => {
    const source = await game('Custom source', { nameVi: 'Tên cũ', imageKey: 'source-image.webp' });
    const target = await game('Canonical target');
    await db.insert(gameRevisions).values({
      gameId: source.id,
      editorId: admin.id,
      snapshot: { original: true },
      licenseAcceptedAt: new Date(),
    });
    await db
      .insert(userGames)
      .values({ userId: admin.id, gameId: source.id, note: 'keep this note' });
    await db.insert(userWishlist).values({ userId: admin.id, gameId: source.id });
    const code = randomUUID();
    await db
      .insert(gameBarcodes)
      .values({ code, gameId: source.id, source: 'manual', edition: 'Vietnamese' });
    const preview = await previewGameMerge(source.id, target.id);
    expect(preview.blockers).toEqual([]);
    expect(Object.keys(preview.counts).sort()).toEqual(
      [
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
      ].sort(),
    );
    const response = await post(adminApp, `/api/games/${source.id}/merge`, {
      targetId: target.id,
      fingerprint: preview.fingerprint,
    });
    expect(response.status).toBe(200);
    expect((await findGameById(source.id))!.id).toBe(target.id);
    expect((await findGameBySlug(source.slug))!.id).toBe(target.id);
    const retained = await db.query.games.findFirst({ where: eq(games.id, source.id) });
    expect(retained!.imageKey).toBe('source-image.webp');
    expect(retained!.canonicalId).toBe(target.id);
    expect((await findGameById(target.id))!.aliases.map((a) => a.name)).toEqual(
      expect.arrayContaining(['Custom source', 'Tên cũ']),
    );
    expect(
      await db.query.gameRevisions.findMany({ where: eq(gameRevisions.gameId, source.id) }),
    ).toHaveLength(1);
    const revisions = await getGameRevisionsService(target.slug);
    expect(revisions.some((r) => r.editorName === admin.name && r.licenseAcceptedAt !== null)).toBe(
      true,
    );
    const barcode = await db.query.gameBarcodes.findFirst({ where: eq(gameBarcodes.code, code) });
    expect(barcode!.gameId).toBe(target.id);
    expect(barcode!.edition).toBe('Vietnamese');
    const [shelf] = await db.select().from(userGames).where(eq(userGames.gameId, target.id));
    expect(shelf!.note).toBe('keep this note');
    const [wishlist] = await db
      .select()
      .from(userWishlist)
      .where(eq(userWishlist.gameId, target.id));
    expect(wishlist).toMatchObject({ userId: admin.id, gameId: target.id });
    const lateCode = randomUUID();
    await db.insert(gameBarcodes).values({ code: lateCode, gameId: source.id, source: 'manual' });
    expect(
      (await db.query.gameBarcodes.findFirst({ where: eq(gameBarcodes.code, lateCode) }))!.gameId,
    ).toBe(target.id);
    const deleted = await adminApp.request(`/api/games/${target.id}`, {
      method: 'DELETE',
      headers: { origin: 'http://localhost:3000', 'content-type': 'application/json' },
    });
    expect(deleted.status).toBe(409);
    expect(await deleted.json()).toMatchObject({ error: { code: 'CONFLICT' } });
  });
  it('moves every inventory/history FK while preserving pinned scoring and provenance payloads', async () => {
    const source = await game('Complete source');
    const target = await game('Complete target');
    const [cafe] = await db
      .insert(cafes)
      .values({
        slug: randomUUID(),
        name: 'Merge inventory café',
        provinceCode: locationCode,
        wardCode: locationCode,
        addressLine: 'Fixture',
        consentStatus: 'granted',
      })
      .returning();
    cafeIds.push(cafe!.id);
    const [club] = await db
      .insert(clubs)
      .values({
        slug: randomUUID(),
        name: 'Merge club',
        inviteCodeHash: randomUUID(),
        createdBy: admin.id,
      })
      .returning();
    clubIds.push(club!.id);
    const [member] = await db
      .insert(clubExternalMembers)
      .values({
        clubId: club!.id,
        externalId: randomUUID(),
        nickname: 'Original owner',
        stats: { imported: true },
      })
      .returning();
    const [meetup] = await db
      .insert(meetups)
      .values({
        slug: randomUUID(),
        title: 'Merge meetup',
        startsAt: new Date(),
        addressLine: 'Fixture',
        provinceCode: locationCode,
        inviteCodeHash: randomUUID(),
        createdBy: admin.id,
      })
      .returning();
    meetupIds.push(meetup!.id);
    const [table] = await db
      .insert(meetupTables)
      .values({
        meetupId: meetup!.id,
        hostUserId: admin.id,
        gameId: source.id,
        broughtByUserId: admin.id,
        note: 'Keep table note',
        seats: 4,
        position: 0,
      })
      .returning();
    const [category] = await db
      .insert(categories)
      .values({ name: `Merge category ${randomUUID()}` })
      .returning();
    categoryIds.push(category!.id);
    await db.insert(gameCategories).values([
      { gameId: source.id, categoryId: category!.id },
      { gameId: target.id, categoryId: category!.id },
    ]);
    await db.insert(cafeGames).values({
      cafeId: cafe!.id,
      gameId: source.id,
      copies: 7,
      addedBy: admin.id,
      addedVia: 'import',
      source: 'owner',
    });
    const [audit] = await db
      .insert(cafeGameEvents)
      .values({
        cafeId: cafe!.id,
        gameId: source.id,
        userId: admin.id,
        action: 'confirm',
        source: 'owner',
      })
      .returning();
    await db
      .insert(clubExternalOwnerships)
      .values({ clubId: club!.id, gameId: source.id, externalMemberId: member!.id });
    const definition = {
      name: 'Historic scoring',
      categories: [{ key: 'points', label: 'Original' }],
    };
    const sources = [{ url: 'https://example.test/rules', note: 'Original attribution' }];
    const [template] = await db
      .insert(scoreTemplates)
      .values({
        gameId: source.id,
        variant: 'historic',
        version: 4,
        status: 'approved',
        definition,
        sources,
        confidence: 'high',
        needsReview: false,
        createdBy: admin.id,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      })
      .returning();
    const [play] = await db
      .insert(plays)
      .values({
        id: randomUUID(),
        gameId: source.id,
        scoreTemplateId: template!.id,
        templateVersion: 4,
        status: 'final',
        createdBy: admin.id,
        meetupTableId: table!.id,
        clubId: club!.id,
        rev: 8,
        endedAt: new Date(),
      })
      .returning();
    const [metadata] = await db
      .insert(gameExternalMetadata)
      .values({
        gameId: source.id,
        source: 'fixture',
        externalId: randomUUID(),
        bestPlayers: [3, 4],
        payload: { original: ['private', 17] },
        fetchedAt: new Date(),
      })
      .returning();
    // Collisions must reject the entire merge rather than combine quantities or overwrite versions.
    await db.insert(cafeGames).values({
      cafeId: cafe!.id,
      gameId: target.id,
      copies: 2,
      addedVia: 'manual',
      source: 'staff',
    });
    await db
      .insert(clubExternalOwnerships)
      .values({ clubId: club!.id, gameId: target.id, externalMemberId: member!.id });
    const [collisionTemplate] = await db
      .insert(scoreTemplates)
      .values({
        gameId: target.id,
        variant: 'historic',
        version: 4,
        status: 'pending',
        definition: { untouched: true },
        sources: [],
        confidence: 'low',
      })
      .returning();
    const blocked = await previewGameMerge(source.id, target.id);
    expect(blocked.blockers.map((b) => b.table)).toEqual(
      expect.arrayContaining(['cafe_games', 'club_external_ownerships', 'score_templates']),
    );
    await expect(
      mergeGames(source.id, target.id, blocked.fingerprint, admin.id),
    ).rejects.toMatchObject({ status: 409 });
    expect(
      await db.query.scoreTemplates.findFirst({ where: eq(scoreTemplates.id, template!.id) }),
    ).toEqual(template);
    expect(
      await db.query.scoreTemplates.findFirst({
        where: eq(scoreTemplates.id, collisionTemplate!.id),
      }),
    ).toEqual(collisionTemplate);
    expect(
      await db.query.cafeGameEvents.findFirst({ where: eq(cafeGameEvents.id, audit!.id) }),
    ).toEqual(audit);
    expect(await db.query.plays.findFirst({ where: eq(plays.id, play!.id) })).toEqual(play);
    await db
      .delete(cafeGames)
      .where(and(eq(cafeGames.cafeId, cafe!.id), eq(cafeGames.gameId, target.id)));
    await db
      .delete(clubExternalOwnerships)
      .where(
        and(
          eq(clubExternalOwnerships.clubId, club!.id),
          eq(clubExternalOwnerships.gameId, target.id),
        ),
      );
    await db.delete(scoreTemplates).where(eq(scoreTemplates.id, collisionTemplate!.id));
    await db
      .insert(userGames)
      .values({ userId: admin.id, gameId: source.id, note: 'bring canonical copy' });
    const preview = await previewGameMerge(source.id, target.id);
    expect(preview.blockers).toEqual([]);
    for (const key of [
      'cafe_games',
      'cafe_game_events',
      'club_external_ownerships',
      'game_categories',
      'score_templates',
      'plays',
      'meetup_tables',
      'game_external_metadata',
    ])
      expect(preview.counts[key]).toBe(1);
    await mergeGames(source.id, target.id, preview.fingerprint, admin.id);
    const [inventory] = await db.select().from(cafeGames).where(eq(cafeGames.cafeId, cafe!.id));
    expect(inventory).toEqual({
      cafeId: cafe!.id,
      gameId: target.id,
      copies: 7,
      addedBy: admin.id,
      addedVia: 'import',
      source: 'owner',
    });
    expect(
      await db.query.cafeGameEvents.findFirst({ where: eq(cafeGameEvents.id, audit!.id) }),
    ).toEqual({ ...audit, gameId: target.id });
    const [ownership] = await db
      .select()
      .from(clubExternalOwnerships)
      .where(eq(clubExternalOwnerships.clubId, club!.id));
    expect(ownership).toEqual({
      clubId: club!.id,
      gameId: target.id,
      externalMemberId: member!.id,
    });
    expect(
      await db.query.scoreTemplates.findFirst({ where: eq(scoreTemplates.id, template!.id) }),
    ).toEqual({ ...template, gameId: target.id });
    expect(await db.query.plays.findFirst({ where: eq(plays.id, play!.id) })).toEqual({
      ...play,
      gameId: target.id,
    });
    expect(
      await db.query.meetupTables.findFirst({ where: eq(meetupTables.id, table!.id) }),
    ).toEqual({ ...table, gameId: target.id });
    const [retainedMetadata] = await db
      .select()
      .from(gameExternalMetadata)
      .where(eq(gameExternalMetadata.externalId, metadata!.externalId));
    expect(retainedMetadata).toEqual({ ...metadata, gameId: target.id });
    const memberships = await db
      .select()
      .from(gameCategories)
      .where(eq(gameCategories.categoryId, category!.id));
    expect(memberships).toEqual([{ gameId: target.id, categoryId: category!.id }]);
    // Offline clients may retain old UUIDs; triggers normalize actual fresh FK writes.
    const [latePlay] = await db
      .insert(plays)
      .values({
        id: randomUUID(),
        gameId: source.id,
        scoreTemplateId: template!.id,
        templateVersion: 4,
        createdBy: admin.id,
      })
      .returning();
    expect(latePlay!.gameId).toBe(target.id);
    expect(latePlay!.scoreTemplateId).toBe(template!.id);
    expect(latePlay!.templateVersion).toBe(4);
    const [lateTable] = await db
      .insert(meetupTables)
      .values({ meetupId: meetup!.id, hostUserId: admin.id, gameId: source.id, position: 1 })
      .returning();
    expect(lateTable!.gameId).toBe(target.id);
    const create = await post(adminApp, `/api/events/${meetup!.id}/tables`, {
      gameId: source.id,
      broughtByUserId: admin.id,
      seats: 4,
    });
    expect(create.status).toBe(201);
    const createdTable = (await create.json()) as MeetupTableDto;
    expect(createdTable.game?.id).toBe(target.id);
    expect(createdTable.broughtBy?.id).toBe(admin.id);
    const update = await adminApp.request(`/api/events/${meetup!.id}/tables/${createdTable.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        gameId: source.id,
        broughtByUserId: admin.id,
        note: 'old UUID remains valid',
      }),
    });
    expect(update.status).toBe(200);
    expect(await update.json()).toMatchObject({
      game: { id: target.id },
      broughtBy: { id: admin.id },
      note: 'old UUID remains valid',
    });
    const file = new File([new Uint8Array([1, 2, 3])], 'image.png', { type: 'image/png' });
    const readBytes = vi.spyOn(file, 'arrayBuffer');
    await expect(setGameImageService(source.id, file, 'late uploader')).rejects.toMatchObject({
      status: 409,
    });
    expect(readBytes).not.toHaveBeenCalled();
    expect((await db.query.games.findFirst({ where: eq(games.id, source.id) }))!.canonicalId).toBe(
      target.id,
    );
  });

  it('blocks excessive merged aliases without modifying either game', async () => {
    const source = await game('Excess source', {
      aliases: Array.from({ length: 100 }, (_, i) => ({ name: `Source alias ${i}`, kind: 'name' })),
    });
    const target = await game('Excess target', {
      aliases: [{ name: 'Target alias', kind: 'custom' }],
    });
    const preview = await previewGameMerge(source.id, target.id);
    expect(preview.blockers.some((b) => b.table === 'games' && b.reason.includes('100'))).toBe(
      true,
    );
    await expect(
      mergeGames(source.id, target.id, preview.fingerprint, admin.id),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.query.games.findFirst({ where: eq(games.id, source.id) })).toEqual(source);
    expect(await db.query.games.findFirst({ where: eq(games.id, target.id) })).toEqual(target);
  });

  it('rejects self/cyclic/tombstone variant parents without changing existing identity', async () => {
    const parent = await game('Variant parent');
    const child = await game('Variant child', { variantOfId: parent.id });
    const tombstone = await game('Variant old parent', { canonicalId: parent.id });
    for (const variantOfId of [parent.id, child.id, tombstone.id]) {
      const response = await adminApp.request(`/api/games/${parent.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variantOfId }),
      });
      expect(response.status).toBe(variantOfId === tombstone.id ? 422 : 409);
      expect(
        (await db.query.games.findFirst({ where: eq(games.id, parent.id) }))!.variantOfId,
      ).toBeNull();
      expect(
        await db.query.gameRevisions.findMany({ where: eq(gameRevisions.gameId, parent.id) }),
      ).toEqual([]);
    }
  });

  it('blocks rules-changing variants from implicit identity merging', async () => {
    const parent = await game('Parent');
    const variant = await game('Variant', { variantOfId: parent.id });
    const preview = await previewGameMerge(variant.id, parent.id);
    expect(preview.blockers.some((b) => b.table === 'games')).toBe(true);
    await expect(
      mergeGames(variant.id, parent.id, preview.fingerprint, admin.id),
    ).rejects.toMatchObject({ status: 409 });
  });
});
