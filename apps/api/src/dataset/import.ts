import {
  cafeCreateSchema,
  cafeGameAddedViaEnum,
  categoryCreateSchema,
  gameCreateSchema,
} from '@onboard/shared';
import { db } from '../db/client.js';
import * as cafesRepo from '../modules/cafes/repo.js';
import * as categoriesRepo from '../modules/categories/repo.js';
import * as gamesRepo from '../modules/games/repo.js';
import type { Tx } from '../modules/games/repo.js';
import { slugify } from '../modules/games/slug.js';
import * as locationsRepo from '../modules/locations/repo.js';
import { parseCsvWithLines } from './csv.js';

export interface ImportRowError {
  line: number;
  field: string;
  message: string;
}

export interface ImportPlanRow {
  line: number;
  slug: string;
  action: 'create' | 'update';
}

export interface ImportResult {
  errors: ImportRowError[];
  rows: ImportPlanRow[];
  created: number;
  updated: number;
  applied: boolean;
}

const SYSTEM_EDITOR_ID = null;

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseNumber(value: string | undefined): number | undefined {
  const trimmed = blankToUndefined(value);
  return trimmed === undefined ? undefined : Number(trimmed);
}

function parseBoolean(value: string | undefined): boolean | undefined {
  const trimmed = blankToUndefined(value)?.toLowerCase();
  if (trimmed === undefined) return undefined;
  return trimmed === 'true' || trimmed === '1';
}

function parseList(value: string | undefined): string[] {
  return (value ?? '')
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean);
}

interface RawRow {
  slug?: string;
  nameVi?: string;
  nameEn?: string;
  minPlayers?: string;
  maxPlayers?: string;
  playMinutes?: string;
  weight?: string;
  minAge?: string;
  isVietnamese?: string;
  bggId?: string;
  categories?: string;
  videoUrls?: string;
}

interface PlanItem {
  line: number;
  slug: string | undefined;
  action: 'create' | 'update';
  existingId?: string;
  values: ReturnType<typeof gameCreateSchema.parse>;
  /** `undefined` means the CSV column was blank/absent: leave existing categories untouched on update. */
  categoryIds: string[] | undefined;
}

export async function importGamesCsv(
  csvContent: string,
  opts: { apply: boolean },
): Promise<ImportResult> {
  const parsedRows = parseCsvWithLines(csvContent) as { record: RawRow; line: number }[];
  const categoryRows = await categoriesRepo.listCategories();
  const categoryIdByName = new Map(categoryRows.map((c) => [c.name, c.id]));

  const errors: ImportRowError[] = [];
  const plan: PlanItem[] = [];

  for (const { record: raw, line } of parsedRows) {
    const videoUrlsRaw = blankToUndefined(raw.videoUrls);

    const parsed = gameCreateSchema.safeParse({
      nameVi: blankToUndefined(raw.nameVi),
      nameEn: blankToUndefined(raw.nameEn) ?? '',
      minPlayers: parseNumber(raw.minPlayers),
      maxPlayers: parseNumber(raw.maxPlayers),
      playMinutes: parseNumber(raw.playMinutes),
      weight: parseNumber(raw.weight),
      minAge: parseNumber(raw.minAge),
      isVietnamese: parseBoolean(raw.isVietnamese),
      bggId: parseNumber(raw.bggId),
      videoUrls: videoUrlsRaw !== undefined ? parseList(videoUrlsRaw) : undefined,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({
          line,
          field: issue.path.join('.') || '(row)',
          message: issue.message,
        });
      }
      continue;
    }

    const categoriesRaw = blankToUndefined(raw.categories);
    let categoryIds: string[] | undefined;
    if (categoriesRaw !== undefined) {
      categoryIds = [];
      for (const name of parseList(categoriesRaw)) {
        const id = categoryIdByName.get(name);
        if (!id) {
          errors.push({ line, field: 'categories', message: `thể loại "${name}" không tồn tại` });
          continue;
        }
        categoryIds.push(id);
      }
    }

    const slug = blankToUndefined(raw.slug);
    const existing = slug ? await gamesRepo.findGameBySlug(slug) : undefined;

    plan.push({
      line,
      slug,
      action: existing ? 'update' : 'create',
      existingId: existing?.id,
      values: parsed.data,
      categoryIds,
    });
  }

  if (errors.length > 0) {
    return { errors, rows: [], created: 0, updated: 0, applied: false };
  }

  async function applyPlan(tx: Tx | undefined) {
    const rows: ImportPlanRow[] = [];
    let created = 0;
    let updated = 0;

    for (const item of plan) {
      if (item.action === 'update' && item.existingId) {
        rows.push({ line: item.line, slug: item.slug!, action: 'update' });
        updated += 1;
        if (opts.apply) {
          const v = item.values;
          await gamesRepo.updateGameWithRevision(
            item.existingId,
            {
              ...(v.nameVi !== undefined && { nameVi: v.nameVi }),
              ...(v.nameEn !== undefined && { nameEn: v.nameEn }),
              ...(v.minPlayers !== undefined && { minPlayers: v.minPlayers }),
              ...(v.maxPlayers !== undefined && { maxPlayers: v.maxPlayers }),
              ...(v.playMinutes !== undefined && { playMinutes: v.playMinutes }),
              ...(v.weight !== undefined && { weight: v.weight.toFixed(2) }),
              ...(v.minAge !== undefined && { minAge: v.minAge }),
              ...(v.isVietnamese !== undefined && { isVietnamese: v.isVietnamese }),
              ...(v.bggId !== undefined && { bggId: v.bggId }),
              ...(v.videoUrls !== undefined && { videoUrls: v.videoUrls }),
            },
            item.categoryIds,
            { editorId: SYSTEM_EDITOR_ID, licenseAcceptedAt: undefined },
            tx,
          );
        }
        continue;
      }

      const finalSlug =
        item.slug ?? (await gamesRepo.findAvailableSlug(slugify(item.values.nameEn)));
      rows.push({ line: item.line, slug: finalSlug, action: 'create' });
      created += 1;
      if (opts.apply) {
        await gamesRepo.insertGameWithRevision(
          {
            slug: finalSlug,
            nameVi: item.values.nameVi,
            nameEn: item.values.nameEn,
            minPlayers: item.values.minPlayers,
            maxPlayers: item.values.maxPlayers,
            playMinutes: item.values.playMinutes,
            weight: item.values.weight !== undefined ? item.values.weight.toFixed(2) : undefined,
            minAge: item.values.minAge,
            isVietnamese: item.values.isVietnamese ?? false,
            bggId: item.values.bggId,
            videoUrls: item.values.videoUrls ?? [],
          },
          item.categoryIds,
          { editorId: SYSTEM_EDITOR_ID, licenseAcceptedAt: undefined },
          tx,
        );
      }
    }

    return { rows, created, updated };
  }

  const result = opts.apply
    ? await db.transaction((tx) => applyPlan(tx))
    : await applyPlan(undefined);

  return { errors: [], ...result, applied: opts.apply };
}

export interface CategoryImportRow {
  line: number;
  name: string;
  action: 'create' | 'update';
}

export interface CategoryImportResult {
  errors: ImportRowError[];
  rows: CategoryImportRow[];
  created: number;
  updated: number;
  applied: boolean;
}

interface RawCategoryRow {
  name?: string;
  nameVi?: string;
  kind?: string;
  bggId?: string;
}

interface CategoryPlanItem {
  line: number;
  name: string;
  action: 'create' | 'update';
  existingId?: string;
  values: ReturnType<typeof categoryCreateSchema.parse>;
}

export async function importCategoriesCsv(
  csvContent: string,
  opts: { apply: boolean },
): Promise<CategoryImportResult> {
  const parsedRows = parseCsvWithLines(csvContent) as { record: RawCategoryRow; line: number }[];

  const errors: ImportRowError[] = [];
  const plan: CategoryPlanItem[] = [];

  for (const { record: raw, line } of parsedRows) {
    const parsed = categoryCreateSchema.safeParse({
      name: blankToUndefined(raw.name),
      nameVi: blankToUndefined(raw.nameVi),
      kind: blankToUndefined(raw.kind),
      bggId: parseNumber(raw.bggId),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ line, field: issue.path.join('.') || '(row)', message: issue.message });
      }
      continue;
    }

    const existing = await categoriesRepo.findCategoryByName(parsed.data.name);
    plan.push({
      line,
      name: parsed.data.name,
      action: existing ? 'update' : 'create',
      existingId: existing?.id,
      values: parsed.data,
    });
  }

  if (errors.length > 0) {
    return { errors, rows: [], created: 0, updated: 0, applied: false };
  }

  async function applyPlan(tx: Tx | undefined) {
    const rows: CategoryImportRow[] = [];
    let created = 0;
    let updated = 0;

    for (const item of plan) {
      rows.push({ line: item.line, name: item.name, action: item.action });
      if (item.action === 'update' && item.existingId) {
        updated += 1;
        if (opts.apply) {
          await categoriesRepo.updateCategoryRow(
            item.existingId,
            {
              nameVi: item.values.nameVi,
              ...(item.values.kind !== undefined && { kind: item.values.kind }),
              bggId: item.values.bggId,
            },
            tx,
          );
        }
      } else {
        created += 1;
        if (opts.apply) {
          await categoriesRepo.insertCategory(
            {
              name: item.values.name,
              nameVi: item.values.nameVi,
              kind: item.values.kind,
              bggId: item.values.bggId,
            },
            tx,
          );
        }
      }
    }

    return { rows, created, updated };
  }

  const result = opts.apply
    ? await db.transaction((tx) => applyPlan(tx))
    : await applyPlan(undefined);

  return { errors: [], ...result, applied: opts.apply };
}

export interface CafeImportRow {
  line: number;
  slug: string;
  action: 'create' | 'update' | 'skip';
}

export interface CafeImportResult {
  errors: ImportRowError[];
  rows: CafeImportRow[];
  created: number;
  updated: number;
  skipped: number;
  applied: boolean;
}

interface RawCafeRow {
  slug?: string;
  name?: string;
  provinceCode?: string;
  wardCode?: string;
  addressLine?: string;
  legacyDistrict?: string;
  lat?: string;
  lng?: string;
  links?: string;
  sourceUrl?: string;
  consentStatus?: string;
}

interface CafePlanItem {
  line: number;
  slug: string;
  action: 'create' | 'update' | 'skip';
  existingId?: string;
  values: ReturnType<typeof cafeCreateSchema.parse>;
}

export async function importCafesCsv(
  csvContent: string,
  opts: { apply: boolean },
): Promise<CafeImportResult> {
  const parsedRows = parseCsvWithLines(csvContent) as { record: RawCafeRow; line: number }[];

  const errors: ImportRowError[] = [];
  const plan: CafePlanItem[] = [];

  for (const { record: raw, line } of parsedRows) {
    const slug = blankToUndefined(raw.slug);
    if (!slug) {
      errors.push({ line, field: 'slug', message: 'thiếu' });
      continue;
    }

    let links: unknown;
    const linksRaw = blankToUndefined(raw.links);
    if (linksRaw !== undefined) {
      try {
        links = JSON.parse(linksRaw);
      } catch {
        errors.push({ line, field: 'links', message: 'JSON không hợp lệ' });
        continue;
      }
    }

    const parsed = cafeCreateSchema.safeParse({
      name: blankToUndefined(raw.name),
      provinceCode: blankToUndefined(raw.provinceCode),
      wardCode: blankToUndefined(raw.wardCode),
      addressLine: blankToUndefined(raw.addressLine),
      legacyDistrict: blankToUndefined(raw.legacyDistrict),
      lat: parseNumber(raw.lat),
      lng: parseNumber(raw.lng),
      links,
      sourceUrl: blankToUndefined(raw.sourceUrl),
      consentStatus: blankToUndefined(raw.consentStatus),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push({ line, field: issue.path.join('.') || '(row)', message: issue.message });
      }
      continue;
    }

    const province = await locationsRepo.findProvinceByCode(parsed.data.provinceCode);
    if (!province) {
      errors.push({ line, field: 'provinceCode', message: 'không tồn tại' });
      continue;
    }
    const ward = await locationsRepo.findWardByCode(parsed.data.wardCode);
    if (!ward || ward.provinceCode !== parsed.data.provinceCode) {
      errors.push({ line, field: 'wardCode', message: 'không thuộc tỉnh/thành đã chọn' });
      continue;
    }

    const existing = await cafesRepo.findCafeFullBySlug(slug);
    const downgradesGranted =
      existing?.consentStatus === 'granted' && parsed.data.consentStatus !== 'granted';

    plan.push({
      line,
      slug,
      action: downgradesGranted ? 'skip' : existing ? 'update' : 'create',
      existingId: existing?.id,
      values: parsed.data,
    });
  }

  if (errors.length > 0) {
    return { errors, rows: [], created: 0, updated: 0, skipped: 0, applied: false };
  }

  async function applyPlan(tx: Tx | undefined) {
    const rows: CafeImportRow[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of plan) {
      rows.push({ line: item.line, slug: item.slug, action: item.action });

      if (item.action === 'skip') {
        skipped += 1;
        continue;
      }

      if (item.action === 'update' && item.existingId) {
        updated += 1;
        if (opts.apply) {
          await cafesRepo.updateCafeRow(item.existingId, item.values, tx);
        }
        continue;
      }

      created += 1;
      if (opts.apply) {
        await cafesRepo.insertCafe({ ...item.values, slug: item.slug, createdBy: null }, tx);
      }
    }

    return { rows, created, updated, skipped };
  }

  const result = opts.apply
    ? await db.transaction((tx) => applyPlan(tx))
    : await applyPlan(undefined);

  return { errors: [], ...result, applied: opts.apply };
}

export interface CafeGameImportRow {
  line: number;
  cafeSlug: string;
  gameSlug: string;
  action: 'create' | 'update';
}

export interface CafeGameImportResult {
  errors: ImportRowError[];
  rows: CafeGameImportRow[];
  created: number;
  updated: number;
  applied: boolean;
}

interface RawCafeGameRow {
  cafeSlug?: string;
  gameSlug?: string;
  copies?: string;
  addedVia?: string;
}

interface CafeGamePlanItem {
  line: number;
  cafeSlug: string;
  gameSlug: string;
  action: 'create' | 'update';
  cafeId: string;
  gameId: string;
  copies: number;
  addedVia: 'manual' | 'scan';
}

export async function importCafeGamesCsv(
  csvContent: string,
  opts: { apply: boolean },
): Promise<CafeGameImportResult> {
  const parsedRows = parseCsvWithLines(csvContent) as { record: RawCafeGameRow; line: number }[];

  const errors: ImportRowError[] = [];
  const plan: CafeGamePlanItem[] = [];

  for (const { record: raw, line } of parsedRows) {
    const cafeSlug = blankToUndefined(raw.cafeSlug);
    const gameSlug = blankToUndefined(raw.gameSlug);
    if (!cafeSlug) errors.push({ line, field: 'cafeSlug', message: 'thiếu' });
    if (!gameSlug) errors.push({ line, field: 'gameSlug', message: 'thiếu' });
    if (!cafeSlug || !gameSlug) continue;

    const cafe = await cafesRepo.findCafeFullBySlug(cafeSlug);
    if (!cafe) {
      errors.push({ line, field: 'cafeSlug', message: 'không tồn tại' });
      continue;
    }
    const game = await gamesRepo.findGameBySlug(gameSlug);
    if (!game) {
      errors.push({ line, field: 'gameSlug', message: 'không tồn tại' });
      continue;
    }

    const copies = parseNumber(raw.copies) ?? 1;
    const addedViaRaw = blankToUndefined(raw.addedVia) ?? 'manual';
    const addedViaParsed = cafeGameAddedViaEnum.safeParse(addedViaRaw);
    if (!addedViaParsed.success) {
      errors.push({ line, field: 'addedVia', message: 'không hợp lệ' });
      continue;
    }

    const existing = await cafesRepo.findCafeGame(cafe.id, game.id);
    plan.push({
      line,
      cafeSlug,
      gameSlug,
      action: existing ? 'update' : 'create',
      cafeId: cafe.id,
      gameId: game.id,
      copies,
      addedVia: addedViaParsed.data,
    });
  }

  if (errors.length > 0) {
    return { errors, rows: [], created: 0, updated: 0, applied: false };
  }

  async function applyPlan(tx: Tx | undefined) {
    const rows: CafeGameImportRow[] = [];
    let created = 0;
    let updated = 0;

    for (const item of plan) {
      rows.push({
        line: item.line,
        cafeSlug: item.cafeSlug,
        gameSlug: item.gameSlug,
        action: item.action,
      });
      if (item.action === 'update') {
        updated += 1;
        if (opts.apply) {
          await cafesRepo.updateCafeGameCopies(item.cafeId, item.gameId, item.copies, tx);
        }
      } else {
        created += 1;
        if (opts.apply) {
          await cafesRepo.insertCafeGame(
            {
              cafeId: item.cafeId,
              gameId: item.gameId,
              copies: item.copies,
              addedBy: null,
              addedVia: item.addedVia,
            },
            tx,
          );
        }
      }
    }

    return { rows, created, updated };
  }

  const result = opts.apply
    ? await db.transaction((tx) => applyPlan(tx))
    : await applyPlan(undefined);

  return { errors: [], ...result, applied: opts.apply };
}
