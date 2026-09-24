import { gameCreateSchema } from '@onboard/shared';
import { db } from '../db/client.js';
import * as categoriesRepo from '../modules/categories/repo.js';
import * as gamesRepo from '../modules/games/repo.js';
import type { Tx } from '../modules/games/repo.js';
import { slugify } from '../modules/games/slug.js';
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
