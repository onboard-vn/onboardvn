import type {
  BarcodeInput,
  DescriptionLicense,
  DescriptionSource,
  GameBarcodeDto,
  GameCreateInput,
  GameDetailDto,
  GameFilter,
  GameListResponse,
  GameRevisionDto,
  GameSummaryDto,
  GameUpdateInput,
} from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import { storage } from '../../lib/storage/index.js';
import { countOwners } from '../shelf/repo.js';
import { normalizeBarcode } from './barcode.js';
import { findExternalByGameIds } from './external.js';
import * as repo from './repo.js';
import type { GameRow } from './repo.js';
import { slugify } from './slug.js';

export function toSummaryDto(row: GameRow): GameSummaryDto {
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
    imageUrl: row.imageKey ? storage.url(row.imageKey) : row.externalImageUrl,
    categories: row.categories.map((gc) => ({
      id: gc.category.id,
      name: gc.category.name,
      nameVi: gc.category.nameVi,
      kind: gc.category.kind,
      bggId: gc.category.bggId,
    })),
  };
}

function toDetailDto(
  row: GameRow,
  includePermissionRef: boolean,
  ownersCount: number,
): GameDetailDto {
  return {
    ...toSummaryDto(row),
    descriptionVi: row.descriptionVi,
    descriptionSource: row.descriptionSource,
    descriptionRightsHolder: row.descriptionRightsHolder,
    descriptionLicense: row.descriptionLicense,
    ...(includePermissionRef ? { descriptionPermissionRef: row.descriptionPermissionRef } : {}),
    videoUrls: row.videoUrls,
    imageCredit: row.imageCredit,
    bggUrl: row.bggId ? `https://boardgamegeek.com/boardgame/${row.bggId}` : null,
    barcodes: row.barcodes.map((b): GameBarcodeDto => ({
      code: b.code,
      edition: b.edition,
      source: b.source,
    })),
    ownersCount,
  };
}

export async function listGamesService(
  filter: GameFilter,
  includeExternal = false,
): Promise<GameListResponse> {
  const { rows, total } = await repo.listGames(filter);
  const external = includeExternal
    ? await findExternalByGameIds(rows.map((r) => r.id))
    : new Map<string, never>();
  const items = rows.map((row) => ({
    ...toSummaryDto(row),
    ...(includeExternal ? { externalThumbUrl: external.get(row.id)?.thumbUrl ?? null } : {}),
  }));
  return { items, page: filter.page, pageSize: filter.pageSize, total };
}

export async function getGameBySlugService(
  slug: string,
  includePermissionRef = false,
  includeExternal = false,
): Promise<GameDetailDto> {
  const row = await repo.findGameBySlug(slug);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  const dto = toDetailDto(row, includePermissionRef, await countOwners(row.id));
  if (!includeExternal) return dto;
  const external = await findExternalByGameIds([row.id]);
  return { ...dto, external: external.get(row.id) ?? null };
}

async function getGameByIdOrThrow(id: string): Promise<GameDetailDto> {
  const row = await repo.findGameById(id);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  return toDetailDto(row, true, await countOwners(row.id));
}

function assertDescriptionInvariants(params: {
  source: DescriptionSource;
  rightsHolder: string | null | undefined;
  permissionRef: string | null | undefined;
  license: DescriptionLicense;
  acceptLicense: boolean | undefined;
  descriptionChanged: boolean;
}): void {
  const { source, rightsHolder, permissionRef, license, acceptLicense, descriptionChanged } =
    params;

  if (source === 'translated_with_permission') {
    if (!rightsHolder || !permissionRef) {
      throw new ApiError(
        'VALIDATION_FAILED',
        422,
        'Bản dịch có phép cần ghi rõ đơn vị cấp phép và tham chiếu giấy phép',
      );
    }
    return;
  }
  if (source === 'translated_from_bgg') {
    if (license !== 'permission-only') {
      throw new ApiError('VALIDATION_FAILED', 422, 'Bản dịch từ BGG không được gắn CC BY-SA 4.0');
    }
    return;
  }

  if (license !== 'CC-BY-SA-4.0') {
    throw new ApiError('VALIDATION_FAILED', 422, 'Mô tả gốc phải dùng giấy phép CC BY-SA 4.0');
  }
  if (descriptionChanged && acceptLicense !== true) {
    throw new ApiError(
      'VALIDATION_FAILED',
      422,
      'Cần xác nhận đồng ý cấp phép CC BY-SA 4.0 trước khi lưu mô tả',
    );
  }
}

async function assertCategoriesExist(categoryIds: string[] | undefined): Promise<void> {
  if (!categoryIds || categoryIds.length === 0) return;
  const ok = await repo.categoryIdsExist(categoryIds);
  if (!ok) throw new ApiError('VALIDATION_FAILED', 422, 'Thể loại không hợp lệ');
}

async function assertBggIdAvailable(
  bggId: number | null | undefined,
  excludeId?: string,
): Promise<void> {
  if (bggId === undefined || bggId === null) return;
  const existing = await repo.findGameByBggId(bggId);
  if (existing && existing.id !== excludeId) {
    throw new ApiError('CONFLICT', 409, 'bggId đã được dùng cho game khác');
  }
}

export async function createGameService(
  input: GameCreateInput,
  userId: string,
): Promise<GameDetailDto> {
  await assertCategoriesExist(input.categoryIds);
  await assertBggIdAvailable(input.bggId);

  const source = input.descriptionSource ?? 'original';
  const license = input.descriptionLicense ?? 'CC-BY-SA-4.0';
  assertDescriptionInvariants({
    source,
    rightsHolder: input.descriptionRightsHolder,
    permissionRef: input.descriptionPermissionRef,
    license,
    acceptLicense: input.acceptLicense,
    descriptionChanged: true,
  });

  const slug = await repo.findAvailableSlug(slugify(input.nameEn));
  const created = await repo.insertGameWithRevision(
    {
      slug,
      nameVi: input.nameVi,
      nameEn: input.nameEn,
      minPlayers: input.minPlayers,
      maxPlayers: input.maxPlayers,
      playMinutes: input.playMinutes,
      weight: input.weight !== undefined ? input.weight.toFixed(2) : undefined,
      minAge: input.minAge,
      isVietnamese: input.isVietnamese ?? false,
      bggId: input.bggId,
      descriptionVi: input.descriptionVi,
      descriptionSource: source,
      descriptionRightsHolder: input.descriptionRightsHolder,
      descriptionPermissionRef: input.descriptionPermissionRef,
      descriptionLicense: license,
      videoUrls: input.videoUrls ?? [],
      imageCredit: input.imageCredit,
      createdBy: userId,
    },
    input.categoryIds,
    { editorId: userId, licenseAcceptedAt: input.acceptLicense ? new Date() : undefined },
  );

  return getGameByIdOrThrow(created.id);
}

export async function updateGameService(
  id: string,
  input: GameUpdateInput,
  userId: string,
): Promise<GameDetailDto> {
  const existing = await repo.findGameById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');

  await assertCategoriesExist(input.categoryIds);
  await assertBggIdAvailable(input.bggId, id);

  const source = input.descriptionSource ?? existing.descriptionSource;
  const rightsHolder =
    input.descriptionRightsHolder !== undefined
      ? input.descriptionRightsHolder
      : existing.descriptionRightsHolder;
  const permissionRef =
    input.descriptionPermissionRef !== undefined
      ? input.descriptionPermissionRef
      : existing.descriptionPermissionRef;
  const license = input.descriptionLicense ?? existing.descriptionLicense;
  const descriptionChanged =
    input.descriptionVi !== undefined && input.descriptionVi !== existing.descriptionVi;

  assertDescriptionInvariants({
    source,
    rightsHolder,
    permissionRef,
    license,
    acceptLicense: input.acceptLicense,
    descriptionChanged,
  });

  // slug is intentionally never regenerated here: it must stay stable once assigned.
  await repo.updateGameWithRevision(
    id,
    {
      ...(input.nameVi !== undefined && { nameVi: input.nameVi }),
      ...(input.nameEn !== undefined && { nameEn: input.nameEn }),
      ...(input.minPlayers !== undefined && { minPlayers: input.minPlayers }),
      ...(input.maxPlayers !== undefined && { maxPlayers: input.maxPlayers }),
      ...(input.playMinutes !== undefined && { playMinutes: input.playMinutes }),
      ...(input.weight !== undefined && {
        weight: input.weight === null ? null : input.weight.toFixed(2),
      }),
      ...(input.minAge !== undefined && { minAge: input.minAge }),
      ...(input.isVietnamese !== undefined && { isVietnamese: input.isVietnamese }),
      ...(input.bggId !== undefined && { bggId: input.bggId }),
      ...(input.descriptionVi !== undefined && { descriptionVi: input.descriptionVi }),
      ...(input.descriptionSource !== undefined && { descriptionSource: input.descriptionSource }),
      ...(input.descriptionRightsHolder !== undefined && {
        descriptionRightsHolder: input.descriptionRightsHolder,
      }),
      ...(input.descriptionPermissionRef !== undefined && {
        descriptionPermissionRef: input.descriptionPermissionRef,
      }),
      ...(input.descriptionLicense !== undefined && {
        descriptionLicense: input.descriptionLicense,
      }),
      ...(input.videoUrls !== undefined && { videoUrls: input.videoUrls }),
      ...(input.imageCredit !== undefined && { imageCredit: input.imageCredit }),
    },
    input.categoryIds,
    {
      editorId: userId,
      licenseAcceptedAt: input.acceptLicense ? new Date() : undefined,
    },
  );

  return getGameByIdOrThrow(id);
}

export async function getGameRevisionsService(slug: string): Promise<GameRevisionDto[]> {
  const game = await repo.findGameBySlug(slug);
  if (!game) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  const rows = await repo.listGameRevisions(game.id);
  return rows.map((row) => ({
    id: row.id,
    editorName: row.editorName,
    createdAt: row.createdAt.toISOString(),
    licenseAcceptedAt: row.licenseAcceptedAt ? row.licenseAcceptedAt.toISOString() : null,
  }));
}

export async function deleteGameService(id: string): Promise<void> {
  const existing = await repo.findGameById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  if (existing.imageKey) await storage.delete(existing.imageKey);
  await repo.deleteGameRow(id);
}

export async function addBarcodeService(
  gameId: string,
  input: BarcodeInput,
): Promise<GameDetailDto> {
  const existing = await repo.findGameById(gameId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');

  const code = normalizeBarcode(input.code);
  const duplicate = await repo.findBarcode(code);
  if (duplicate) throw new ApiError('CONFLICT', 409, 'Mã vạch đã được gắn cho game khác');

  await repo.insertBarcode({ code, gameId, edition: input.edition, source: 'manual' });
  return getGameByIdOrThrow(gameId);
}

export async function removeBarcodeService(gameId: string, code: string): Promise<GameDetailDto> {
  const existing = await repo.findGameById(gameId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');
  await repo.deleteBarcode(gameId, code);
  return getGameByIdOrThrow(gameId);
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export async function setGameImageService(
  gameId: string,
  file: File,
  imageCredit: string | undefined,
): Promise<GameDetailDto> {
  const existing = await repo.findGameById(gameId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy game');

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) throw new ApiError('VALIDATION_FAILED', 422, 'Chỉ chấp nhận ảnh JPEG/PNG/WEBP');
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError('VALIDATION_FAILED', 422, 'Ảnh vượt quá 2MB');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = `games/${gameId}.${ext}`;
  await storage.put(key, bytes, file.type);
  if (existing.imageKey && existing.imageKey !== key) await storage.delete(existing.imageKey);

  await repo.updateGameRow(gameId, {
    imageKey: key,
    ...(imageCredit !== undefined && { imageCredit }),
  });

  return getGameByIdOrThrow(gameId);
}
