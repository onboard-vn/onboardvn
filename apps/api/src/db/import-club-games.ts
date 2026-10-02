import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db, pool } from './client.js';
import {
  categories,
  gameCategories,
  gameExternalMetadata,
  games,
  scoreTemplates,
} from './schema/index.js';

const DATA_DIR = resolve(process.env.DATA_DIR ?? '../../data');
const CLUB_DIR = resolve(process.env.CLUB_SNAPSHOT_DIR ?? `${DATA_DIR}/private/club`);
const CLUB_SOURCE = process.env.CLUB_SOURCE ?? 'external_club';
const CLUB_FILE = `${CLUB_DIR}/games.json`;
const CLUB_RAW_FILE = `${CLUB_DIR}/games-raw.json`;
const BGG_CACHE = `${DATA_DIR}/private/bgg/cache`;
const TEMPLATE_DIR = `${DATA_DIR}/staging/score-templates`;

interface ClubGame {
  slug: string;
  name: string;
  year: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playingTimeMinutes: number | null;
  externalId: string;
}

interface BggLink {
  name: string;
  objectid: string;
}

interface BggCache {
  imageSource: { id: string };
  item: {
    name: string;
    minplayers: string;
    maxplayers: string;
    minplaytime: string;
    maxplaytime: string;
    minage: string;
    links: Record<string, BggLink[] | undefined>;
  };
  dynamic: {
    polls: {
      userplayers?: { best?: { min: number; max: number }[] };
      boardgameweight?: { averageweight: number };
    };
  };
}

const toInt = (value: string | number | null | undefined): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const expandRanges = (ranges: { min: number; max: number }[] = []): number[] => [
  ...new Set(
    ranges.flatMap(({ min, max }) => Array.from({ length: max - min + 1 }, (_, i) => min + i)),
  ),
];

async function findOrCreateGame(club: ClubGame, bgg: BggCache | null): Promise<string> {
  const bggId = bgg ? Number(bgg.imageSource.id) : null;
  const weight = bgg?.dynamic.polls.boardgameweight?.averageweight;
  const values = {
    nameEn: bgg?.item.name ?? club.name,
    minPlayers: toInt(bgg?.item.minplayers) ?? club.minPlayers,
    maxPlayers: toInt(bgg?.item.maxplayers) ?? club.maxPlayers,
    playMinutes: toInt(bgg?.item.maxplaytime) ?? toInt(club.playingTimeMinutes),
    weight: weight ? weight.toFixed(2) : null,
    minAge: toInt(bgg?.item.minage),
  };

  const mapped = await db.query.gameExternalMetadata.findFirst({
    where: and(
      eq(gameExternalMetadata.source, CLUB_SOURCE),
      eq(gameExternalMetadata.externalId, club.externalId),
    ),
  });
  const existing =
    (bggId && (await db.query.games.findFirst({ where: eq(games.bggId, bggId) }))) ||
    (mapped && (await db.query.games.findFirst({ where: eq(games.id, mapped.gameId) }))) ||
    (await db.query.games.findFirst({ where: eq(games.slug, club.slug) }));

  if (existing) {
    await db
      .update(games)
      .set({
        minPlayers: existing.minPlayers ?? values.minPlayers,
        maxPlayers: existing.maxPlayers ?? values.maxPlayers,
        playMinutes: existing.playMinutes ?? values.playMinutes,
        weight: existing.weight ?? values.weight,
        minAge: existing.minAge ?? values.minAge,
        bggId: existing.bggId ?? bggId,
      })
      .where(eq(games.id, existing.id));
    return existing.id;
  }

  const slugTaken = await db.query.games.findFirst({ where: eq(games.slug, club.slug) });
  const slug = slugTaken ? `${club.slug}-bgg${bggId ?? club.externalId}` : club.slug;
  const [row] = await db
    .insert(games)
    .values({ slug, bggId, ...values })
    .returning({ id: games.id });
  return row!.id;
}

async function linkCategories(gameId: string, bgg: BggCache): Promise<void> {
  const groups = [
    ['category', bgg.item.links.boardgamecategory],
    ['mechanic', bgg.item.links.boardgamemechanic],
  ] as const;
  for (const [kind, links] of groups) {
    for (const link of links ?? []) {
      const bggId = Number(link.objectid);
      let category = await db.query.categories.findFirst({
        where: and(eq(categories.kind, kind), eq(categories.bggId, bggId)),
      });
      if (!category) {
        const name = (await db.query.categories.findFirst({
          where: eq(categories.name, link.name),
        }))
          ? `${link.name} (${kind})`
          : link.name;
        [category] = await db.insert(categories).values({ name, kind, bggId }).returning();
      }
      await db
        .insert(gameCategories)
        .values({ gameId, categoryId: category!.id })
        .onConflictDoNothing();
    }
  }
}

async function upsertMetadata(
  gameId: string,
  source: string,
  externalId: string,
  payload: unknown,
  extra: { bestPlayers?: number[]; playMinutesMax?: number | null } = {},
): Promise<void> {
  const values = {
    gameId,
    source,
    externalId,
    payload,
    bestPlayers: extra.bestPlayers ?? [],
    playMinutesMax: extra.playMinutesMax ?? null,
    fetchedAt: new Date(),
  };
  await db
    .insert(gameExternalMetadata)
    .values(values)
    .onConflictDoUpdate({
      target: [gameExternalMetadata.source, gameExternalMetadata.externalId],
      set: values,
    });
}

async function importTemplates(gameIdBySlug: Map<string, string>): Promise<number> {
  let count = 0;
  for (const file of readdirSync(TEMPLATE_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'schema.json',
  )) {
    let def;
    try {
      def = JSON.parse(readFileSync(`${TEMPLATE_DIR}/${file}`, 'utf8'));
    } catch {
      console.warn(`template ${file}: invalid JSON, skipped`);
      continue;
    }
    const gameId = gameIdBySlug.get(def.slug) ?? gameIdBySlug.get(String(def.slug).split('--')[0]!);
    if (!gameId) {
      console.warn(`template ${file}: no game for slug ${def.slug}`);
      continue;
    }
    const approved = def.confidence === 'high' && !def.needsReview;
    const values = {
      gameId,
      variant: def.variant ?? 'base',
      version: def.templateVersion,
      status: approved ? ('approved' as const) : ('pending' as const),
      definition: def,
      scoringFamily: def.scoringFamily ?? null,
      confidence: def.confidence,
      needsReview: def.needsReview ?? !approved,
      sources: def.sources,
    };
    await db
      .insert(scoreTemplates)
      .values(values)
      .onConflictDoUpdate({
        target: [scoreTemplates.gameId, scoreTemplates.variant, scoreTemplates.version],
        set: values,
      });
    count++;
  }
  return count;
}

const club: { games: ClubGame[] } = JSON.parse(readFileSync(CLUB_FILE, 'utf8'));
const rawById = new Map<string, unknown>(
  existsSync(CLUB_RAW_FILE)
    ? (JSON.parse(readFileSync(CLUB_RAW_FILE, 'utf8')) as { id: string }[]).map((g) => [g.id, g])
    : [],
);

const gameIdBySlug = new Map<string, string>();
let withBgg = 0;
for (const clubGame of club.games) {
  const cachePath = `${BGG_CACHE}/${clubGame.slug}.json`;
  const bgg: BggCache | null = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, 'utf8'))
    : null;
  const gameId = await findOrCreateGame(clubGame, bgg);
  gameIdBySlug.set(clubGame.slug, gameId);

  if (bgg) {
    withBgg++;
    await linkCategories(gameId, bgg);
    await upsertMetadata(
      gameId,
      'bgg',
      bgg.imageSource.id,
      { item: bgg.item, dynamic: bgg.dynamic },
      {
        bestPlayers: expandRanges(bgg.dynamic.polls.userplayers?.best),
        playMinutesMax: toInt(bgg.item.maxplaytime),
      },
    );
  }
  await upsertMetadata(
    gameId,
    CLUB_SOURCE,
    clubGame.externalId,
    rawById.get(clubGame.externalId) ?? clubGame,
  );
}

const templates = await importTemplates(gameIdBySlug);
await pool.end();
console.log(`club games: ${club.games.length} (bgg: ${withBgg}), templates: ${templates}`);
