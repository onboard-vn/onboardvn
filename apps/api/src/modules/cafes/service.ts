import type {
  BulkAddGamesResult,
  CafeCreateInput,
  CafeFilter,
  CafeForGameDto,
  CafeGameAddedVia,
  CafeGameInput,
  CafeInventoryItemDto,
  CafeListResponse,
  CafeMaintainerDto,
  CafeMaintainerInventoryItemDto,
  CafeOwnerDto,
  CafeOwnerInventoryItemDto,
  CafePublicDetailDto,
  CafePublicSummaryDto,
  CafeUpdateInput,
} from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import { storage } from '../../lib/storage/index.js';
import * as locationsRepo from '../locations/repo.js';
import { slugify } from '../games/slug.js';
import * as repo from './repo.js';
import type { CafeFullRow, CafeListRow } from './repo.js';
import { isPubliclyVisibleCafe } from './visibility.js';

function toPublicSummaryFromListRow(row: CafeListRow, forceShowAll = false): CafePublicSummaryDto {
  const hideDetails = !forceShowAll && row.consentStatus === 'public_info_only';
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    provinceCode: row.provinceCode,
    provinceName: row.provinceName,
    wardCode: row.wardCode,
    wardName: row.wardName,
    addressLine: row.addressLine,
    legacyDistrict: hideDetails ? null : row.legacyDistrict,
    lat: hideDetails || row.lat === null ? null : Number(row.lat),
    lng: hideDetails || row.lng === null ? null : Number(row.lng),
    links: row.links ?? undefined,
    gameCount: row.gameCount,
    verified: row.consentStatus === 'granted',
  };
}

function toInventoryDto(row: CafeFullRow['inventory'][number]): CafeInventoryItemDto {
  return {
    gameId: row.gameId,
    slug: row.game.slug,
    nameVi: row.game.nameVi,
    nameEn: row.game.nameEn,
    imageUrl: row.game.imageKey ? storage.url(row.game.imageKey) : null,
    copies: row.copies,
  };
}

function toMaintainerInventoryDto(
  row: CafeFullRow['inventory'][number],
): CafeMaintainerInventoryItemDto {
  return { ...toInventoryDto(row), addedVia: row.addedVia, addedBy: row.addedBy };
}

function toPublicDetail(row: CafeFullRow, forceShowAll = false): CafePublicDetailDto {
  const hideDetails = !forceShowAll && row.consentStatus === 'public_info_only';
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    provinceCode: row.provinceCode,
    provinceName: row.province.name,
    wardCode: row.wardCode,
    wardName: row.ward.name,
    addressLine: row.addressLine,
    legacyDistrict: hideDetails ? null : row.legacyDistrict,
    lat: hideDetails || row.lat === null ? null : Number(row.lat),
    lng: hideDetails || row.lng === null ? null : Number(row.lng),
    links: row.links ?? undefined,
    gameCount: row.inventory.length,
    verified: row.consentStatus === 'granted',
    openingHours: hideDetails ? undefined : (row.openingHours ?? undefined),
    inventory: row.inventory.map(toInventoryDto),
  };
}

function toMaintainerDto(row: CafeFullRow): CafeMaintainerDto {
  return {
    ...toPublicDetail(row, true),
    sourceUrl: row.sourceUrl,
    consentStatus: row.consentStatus,
    consentNote: row.consentNote,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    createdBy: row.createdBy,
    inventory: row.inventory.map(toMaintainerInventoryDto),
  };
}

function toOwnerInventoryDto(row: CafeFullRow['inventory'][number]): CafeOwnerInventoryItemDto {
  return { ...toInventoryDto(row), addedVia: row.addedVia };
}

/** Owner/staff view of a café: same as the maintainer DTO but never exposes `addedBy` or the
 * admin-only `consentNote` (decline reason). */
function toOwnerDto(row: CafeFullRow): CafeOwnerDto {
  return {
    ...toPublicDetail(row, true),
    sourceUrl: row.sourceUrl,
    consentStatus: row.consentStatus,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    inventory: row.inventory.map(toOwnerInventoryDto),
  };
}

async function resolveListFilter(
  filter: CafeFilter,
): Promise<{ provinceCode?: string; wardCodes?: string[] } | null> {
  if (!filter.province) {
    if (filter.ward) {
      throw new ApiError('VALIDATION_FAILED', 422, 'Cần chọn tỉnh/thành trước khi lọc theo phường');
    }
    return {};
  }

  const province = await locationsRepo.findProvinceBySlug(filter.province);
  if (!province) return null;

  if (!filter.ward) return { provinceCode: province.code };

  const wardRows = await locationsRepo.findWardsByProvinceAndSlug(province.code, filter.ward);
  if (wardRows.length === 0) return null;

  return { provinceCode: province.code, wardCodes: wardRows.map((w) => w.code) };
}

export async function listCafesService(
  filter: CafeFilter,
  opts: { includePending?: boolean; showAll?: boolean } = {},
): Promise<CafeListResponse> {
  const resolved = await resolveListFilter(filter);
  if (!resolved) return { items: [], page: filter.page, pageSize: filter.pageSize, total: 0 };

  const { rows, total } = await repo.listCafes(resolved, filter.page, filter.pageSize, opts);
  return {
    items: rows.map((row) => toPublicSummaryFromListRow(row, opts.showAll)),
    page: filter.page,
    pageSize: filter.pageSize,
    total,
  };
}

/** Pending cafés (no publishing consent yet) are hidden from the public detail page. */
export async function getCafeBySlugService(slug: string): Promise<CafePublicDetailDto> {
  const row = await repo.findCafeFullBySlug(slug);
  if (!row || !isPubliclyVisibleCafe(row.consentStatus)) {
    throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  }
  return toPublicDetail(row);
}

async function getCafeManageDtoOrThrow(id: string): Promise<CafeMaintainerDto> {
  const row = await repo.findCafeFullById(id);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  return toMaintainerDto(row);
}

export async function getCafeForManageService(id: string): Promise<CafeMaintainerDto> {
  return getCafeManageDtoOrThrow(id);
}

export async function getCafeForOwnerService(id: string): Promise<CafeOwnerDto> {
  const row = await repo.findCafeFullById(id);
  if (!row) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  return toOwnerDto(row);
}

async function assertWardInProvince(provinceCode: string, wardCode: string): Promise<void> {
  const province = await locationsRepo.findProvinceByCode(provinceCode);
  if (!province) throw new ApiError('VALIDATION_FAILED', 422, 'Tỉnh/thành không hợp lệ');

  const ward = await locationsRepo.findWardByCode(wardCode);
  if (!ward || ward.provinceCode !== provinceCode) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Phường/xã không thuộc tỉnh/thành đã chọn');
  }
}

function assertConsentSourceUrl(consentStatus: string, sourceUrl: string | undefined | null): void {
  if (consentStatus !== 'granted' && !sourceUrl) {
    throw new ApiError(
      'VALIDATION_FAILED',
      422,
      'sourceUrl bắt buộc khi consentStatus khác "granted"',
      { path: ['sourceUrl'] },
    );
  }
}

export async function createCafeService(
  input: CafeCreateInput,
  userId: string,
): Promise<CafeMaintainerDto> {
  await assertWardInProvince(input.provinceCode, input.wardCode);
  assertConsentSourceUrl(input.consentStatus, input.sourceUrl);

  const slug = await repo.findAvailableSlug(slugify(input.name));
  const created = await repo.insertCafe({ ...input, slug, createdBy: userId });
  return getCafeManageDtoOrThrow(created.id);
}

export async function updateCafeService(
  id: string,
  input: CafeUpdateInput,
): Promise<CafeMaintainerDto> {
  const existing = await repo.findCafeFullById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const mergedProvinceCode = input.provinceCode ?? existing.provinceCode;
  const mergedWardCode = input.wardCode ?? existing.wardCode;
  if (input.provinceCode !== undefined || input.wardCode !== undefined) {
    await assertWardInProvince(mergedProvinceCode, mergedWardCode);
  }

  const mergedConsentStatus = input.consentStatus ?? existing.consentStatus;
  const mergedSourceUrl = input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl;
  assertConsentSourceUrl(mergedConsentStatus, mergedSourceUrl);

  await repo.updateCafeRow(id, input);
  return getCafeManageDtoOrThrow(id);
}

export async function deleteCafeService(id: string): Promise<void> {
  const existing = await repo.findCafeFullById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  await repo.deleteCafeRow(id);
}

export async function addGameToCafeService(
  cafeId: string,
  input: CafeGameInput,
  userId: string,
): Promise<CafeMaintainerDto> {
  const existing = await repo.findCafeFullById(cafeId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const gameExists = await repo.gameExists(input.gameId);
  if (!gameExists) throw new ApiError('VALIDATION_FAILED', 422, 'Game không hợp lệ');

  const duplicate = await repo.findCafeGame(cafeId, input.gameId);
  if (duplicate) throw new ApiError('CONFLICT', 409, 'Game đã có trong kho của quán này');

  await repo.insertCafeGame({
    cafeId,
    gameId: input.gameId,
    copies: input.copies ?? 1,
    addedBy: userId,
    addedVia: input.addedVia ?? 'manual',
  });

  return getCafeManageDtoOrThrow(cafeId);
}

export async function updateCafeGameCopiesService(
  cafeId: string,
  gameId: string,
  copies: number,
): Promise<CafeMaintainerDto> {
  const existing = await repo.findCafeGame(cafeId, gameId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Game không có trong kho của quán này');
  await repo.updateCafeGameCopies(cafeId, gameId, copies);
  return getCafeManageDtoOrThrow(cafeId);
}

export async function removeGameFromCafeService(
  cafeId: string,
  gameId: string,
): Promise<CafeMaintainerDto> {
  await repo.deleteCafeGame(cafeId, gameId);
  return getCafeManageDtoOrThrow(cafeId);
}

export async function bulkAddGamesToCafeService(
  cafeId: string,
  gameIds: string[],
  userId: string,
  addedVia: CafeGameAddedVia = 'manual',
): Promise<BulkAddGamesResult> {
  const existing = await repo.findCafeFullById(cafeId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const uniqueIds = [...new Set(gameIds)];
  const allExist = await repo.gameIdsExist(uniqueIds);
  if (!allExist) throw new ApiError('VALIDATION_FAILED', 422, 'Danh sách game có mục không hợp lệ');

  return repo.bulkInsertCafeGames(cafeId, uniqueIds, userId, addedVia);
}

export async function getCafesForGameService(gameId: string): Promise<CafeForGameDto[]> {
  const rows = await repo.findCafesForGame(gameId);
  return rows
    .filter((row) => isPubliclyVisibleCafe(row.cafe.consentStatus))
    .map((row) => {
      const hideDetails = row.cafe.consentStatus === 'public_info_only';
      return {
        id: row.cafe.id,
        slug: row.cafe.slug,
        name: row.cafe.name,
        provinceName: row.cafe.province.name,
        wardName: row.cafe.ward.name,
        addressLine: row.cafe.addressLine,
        links: hideDetails ? { fanpage: row.cafe.links?.fanpage } : (row.cafe.links ?? undefined),
        copies: row.copies,
      };
    });
}
