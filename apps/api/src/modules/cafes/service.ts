import type {
  BulkAddGamesResult,
  CafeCreateInput,
  CafeFilter,
  CafeForGameDto,
  CafeGameAddedVia,
  CafeGameInput,
  CafeInventoryItemDto,
  CafeLinks,
  CafeListResponse,
  CafeMaintainerDto,
  CafeMaintainerInventoryItemDto,
  CafeOwnerDto,
  CafeOwnerInventoryItemDto,
  CafePhotoDto,
  CafePublicDetailDto,
  CafePublicSummaryDto,
  CafeUpdateInput,
} from '@onboard/shared';
import { CAFE_PHOTO_MAX_COUNT, getOpenStatus } from '@onboard/shared';
import sharp from 'sharp';
import { ApiError } from '../../lib/errors.js';
import { sniffImageMime } from '../../lib/image-mime.js';
import { storage } from '../../lib/storage/index.js';
import * as locationsRepo from '../locations/repo.js';
import { slugify } from '../games/slug.js';
import * as repo from './repo.js';
import type { CafeFullRow, CafeListRow } from './repo.js';
import { isPubliclyVisibleCafe } from './visibility.js';

const PUBLIC_LINK_KEYS = ['fanpage'] as const;

/** Only `fanpage` is public for a `public_info_only` café — the rest (maps, instagram, tiktok,
 * zalo, website) follow the same visibility as amenities/hours. */
function visibleLinks(links: CafeLinks, hideDetails: boolean): CafeLinks {
  if (!links || !hideDetails) return links;
  const result: CafeLinks = {};
  for (const key of PUBLIC_LINK_KEYS) {
    if (links[key] !== undefined) result[key] = links[key];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

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
    links: visibleLinks(row.links ?? undefined, hideDetails),
    gameCount: row.gameCount,
    verified: row.consentStatus === 'granted',
    venueType: row.venueType,
    openStatus: hideDetails ? undefined : getOpenStatus(row.openingHours, new Date()),
    logoUrl: hideDetails ? undefined : row.logoPath ? storage.url(row.logoPath) : null,
    coverUrl: hideDetails ? undefined : row.coverPath ? storage.url(row.coverPath) : null,
  };
}

function toPhotoDto(row: CafeFullRow['photos'][number]): CafePhotoDto {
  return {
    id: row.id,
    url: storage.url(row.path),
    caption: row.caption,
    sortOrder: row.sortOrder,
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
    minPlayers: row.game.minPlayers,
    maxPlayers: row.game.maxPlayers,
    playMinutes: row.game.playMinutes,
    categories: row.game.categories.map((gc) => ({
      id: gc.category.id,
      name: gc.category.name,
      nameVi: gc.category.nameVi,
    })),
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
    links: visibleLinks(row.links ?? undefined, hideDetails),
    gameCount: row.inventory.length,
    verified: row.consentStatus === 'granted',
    venueType: row.venueType,
    openStatus: hideDetails ? undefined : getOpenStatus(row.openingHours, new Date()),
    openingHours: hideDetails ? undefined : (row.openingHours ?? undefined),
    amenities: hideDetails ? undefined : (row.amenities ?? undefined),
    feeModel: hideDetails ? undefined : row.feeModel,
    feeNote: hideDetails ? undefined : row.feeNote,
    logoUrl: hideDetails ? undefined : row.logoPath ? storage.url(row.logoPath) : null,
    coverUrl: hideDetails ? undefined : row.coverPath ? storage.url(row.coverPath) : null,
    inventory: row.inventory.map(toInventoryDto),
    photos: hideDetails ? [] : row.photos.map(toPhotoDto),
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

async function resolveListFilter(filter: CafeFilter): Promise<repo.CafeListFilter | null> {
  const base: repo.CafeListFilter = {
    venueType: filter.venueType,
    byog: filter.byog,
    food: filter.food,
    privateRoom: filter.privateRoom,
    largeTables: filter.largeTables,
    free: filter.free,
  };

  if (!filter.province) {
    if (filter.ward) {
      throw new ApiError('VALIDATION_FAILED', 422, 'Cần chọn tỉnh/thành trước khi lọc theo phường');
    }
    return base;
  }

  const province = await locationsRepo.findProvinceBySlug(filter.province);
  if (!province) return null;

  if (!filter.ward) return { ...base, provinceCode: province.code };

  const wardRows = await locationsRepo.findWardsByProvinceAndSlug(province.code, filter.ward);
  if (wardRows.length === 0) return null;

  return { ...base, provinceCode: province.code, wardCodes: wardRows.map((w) => w.code) };
}

/** `openNow` can't be expressed against per-day JSON ranges in SQL, so it fetches the full
 * (small) filtered café set, computes {@link getOpenStatus} per row in JS, then paginates. */
async function listCafesOpenNow(
  resolved: repo.CafeListFilter,
  filter: CafeFilter,
  opts: { includePending?: boolean; showAll?: boolean },
): Promise<CafeListResponse> {
  const allRows = await repo.listAllCafesForFilter(resolved, opts);
  const now = new Date();
  const openRows = allRows.filter((row) => {
    // public_info_only cafés don't expose hours publicly, so openNow must never match them.
    if (!opts.showAll && row.consentStatus === 'public_info_only') return false;
    const status = getOpenStatus(row.openingHours, now).state;
    return status === 'open' || status === 'closing_soon';
  });

  const start = (filter.page - 1) * filter.pageSize;
  const pageRows = openRows.slice(start, start + filter.pageSize);
  return {
    items: pageRows.map((row) => toPublicSummaryFromListRow(row, opts.showAll)),
    page: filter.page,
    pageSize: filter.pageSize,
    total: openRows.length,
  };
}

export async function listCafesService(
  filter: CafeFilter,
  opts: { includePending?: boolean; showAll?: boolean } = {},
): Promise<CafeListResponse> {
  const resolved = await resolveListFilter(filter);
  if (!resolved) return { items: [], page: filter.page, pageSize: filter.pageSize, total: 0 };

  if (filter.openNow) return listCafesOpenNow(resolved, filter, opts);

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

/** BYOG cafés default `byogAllowed` to true unless the caller explicitly set it (or cleared
 * amenities entirely with `null`). */
function withByogDefault<T extends CafeCreateInput['amenities'] | null>(
  venueType: CafeCreateInput['venueType'],
  amenities: T,
): T {
  if (venueType !== 'byog_cafe' || amenities === null || amenities?.byogAllowed !== undefined) {
    return amenities;
  }
  return { ...amenities, byogAllowed: true } as T;
}

export async function createCafeService(
  input: CafeCreateInput,
  userId: string,
): Promise<CafeMaintainerDto> {
  await assertWardInProvince(input.provinceCode, input.wardCode);
  assertConsentSourceUrl(input.consentStatus, input.sourceUrl);

  const amenities = withByogDefault(input.venueType, input.amenities);
  const slug = await repo.findAvailableSlug(slugify(input.name));
  const created = await repo.insertCafe({ ...input, amenities, slug, createdBy: userId });
  return getCafeManageDtoOrThrow(created.id);
}

export async function updateCafeService(
  id: string,
  input: CafeUpdateInput,
): Promise<CafeMaintainerDto> {
  const existing = await repo.findCafeRowById(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const mergedProvinceCode = input.provinceCode ?? existing.provinceCode;
  const mergedWardCode = input.wardCode ?? existing.wardCode;
  if (input.provinceCode !== undefined || input.wardCode !== undefined) {
    await assertWardInProvince(mergedProvinceCode, mergedWardCode);
  }

  const mergedConsentStatus = input.consentStatus ?? existing.consentStatus;
  const mergedSourceUrl = input.sourceUrl !== undefined ? input.sourceUrl : existing.sourceUrl;
  assertConsentSourceUrl(mergedConsentStatus, mergedSourceUrl);

  const mergedVenueType = input.venueType ?? existing.venueType;
  const amenities =
    input.amenities !== undefined ? withByogDefault(mergedVenueType, input.amenities) : undefined;

  await repo.updateCafeRow(id, { ...input, ...(amenities !== undefined && { amenities }) });
  return getCafeManageDtoOrThrow(id);
}

export async function deleteCafeService(id: string): Promise<void> {
  const existing = await repo.findCafeMediaPaths(id);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');
  const photoPaths = await repo.listCafePhotoPaths(id);

  // `cafe_photos` cascades on delete, so the file paths are grabbed above before the row (and
  // its FK-cascaded siblings) are gone; the on-disk files are removed only after that commits.
  await repo.deleteCafeRow(id);

  const paths = [existing.logoPath, existing.coverPath, ...photoPaths].filter(
    (p): p is string => p !== null,
  );
  await Promise.all(
    paths.map((path) =>
      storage.delete(path).catch((err) => console.error(`Failed to delete café file ${path}`, err)),
    ),
  );
}

export async function addGameToCafeService(
  cafeId: string,
  input: CafeGameInput,
  userId: string,
): Promise<CafeMaintainerDto> {
  const exists = await repo.cafeExists(cafeId);
  if (!exists) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

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
  const exists = await repo.cafeExists(cafeId);
  if (!exists) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const uniqueIds = [...new Set(gameIds)];
  const allExist = await repo.gameIdsExist(uniqueIds);
  if (!allExist) throw new ApiError('VALIDATION_FAILED', 422, 'Danh sách game có mục không hợp lệ');

  return repo.bulkInsertCafeGames(cafeId, uniqueIds, userId, addedVia);
}

const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 4e7;
const MAX_OUTPUT_DIMENSION = 2048;
const WEBP_QUALITY = 82;

/** Validates size + real (magic-byte sniffed) MIME, then re-encodes to WebP via `sharp`: this
 * strips all metadata (EXIF/GPS included — `sharp` only carries it over with `.withMetadata()`,
 * which we never call), auto-rotates from the original EXIF orientation before stripping it, and
 * caps both input decode size and output dimensions. */
async function readAndValidateImage(file: File): Promise<Uint8Array> {
  if (file.size > MAX_MEDIA_BYTES) throw new ApiError('VALIDATION_FAILED', 422, 'Ảnh vượt quá 5MB');

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageMime(bytes);
  if (!mime) throw new ApiError('VALIDATION_FAILED', 422, 'Chỉ chấp nhận ảnh JPEG/PNG/WEBP');

  try {
    return await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({
        width: MAX_OUTPUT_DIMENSION,
        height: MAX_OUTPUT_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
  } catch {
    throw new ApiError(
      'VALIDATION_FAILED',
      422,
      'Ảnh không hợp lệ hoặc vượt quá kích thước cho phép',
    );
  }
}

async function setCafeMedia(
  cafeId: string,
  field: 'logoPath' | 'coverPath',
  folder: 'logos' | 'covers',
  file: File,
): Promise<void> {
  const existing = await repo.findCafeMediaPaths(cafeId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const webp = await readAndValidateImage(file);
  const key = `cafes/${folder}/${cafeId}/${crypto.randomUUID()}.webp`;
  await storage.put(key, webp, 'image/webp');
  await repo.updateCafeMediaPath(cafeId, field, key);

  const previousPath = field === 'logoPath' ? existing.logoPath : existing.coverPath;
  if (previousPath && previousPath !== key) await storage.delete(previousPath);
}

export async function setCafeLogoService(cafeId: string, file: File): Promise<CafeOwnerDto> {
  await setCafeMedia(cafeId, 'logoPath', 'logos', file);
  return getCafeForOwnerService(cafeId);
}

export async function setCafeCoverService(cafeId: string, file: File): Promise<CafeOwnerDto> {
  await setCafeMedia(cafeId, 'coverPath', 'covers', file);
  return getCafeForOwnerService(cafeId);
}

async function deleteCafeMedia(cafeId: string, field: 'logoPath' | 'coverPath'): Promise<void> {
  const existing = await repo.findCafeMediaPaths(cafeId);
  if (!existing) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  const path = field === 'logoPath' ? existing.logoPath : existing.coverPath;
  await repo.updateCafeMediaPath(cafeId, field, null);
  if (path) await storage.delete(path);
}

export async function deleteCafeLogoService(cafeId: string): Promise<CafeOwnerDto> {
  await deleteCafeMedia(cafeId, 'logoPath');
  return getCafeForOwnerService(cafeId);
}

export async function deleteCafeCoverService(cafeId: string): Promise<CafeOwnerDto> {
  await deleteCafeMedia(cafeId, 'coverPath');
  return getCafeForOwnerService(cafeId);
}

export async function addCafePhotoService(
  cafeId: string,
  file: File,
  caption: string | undefined,
  userId: string,
): Promise<CafeOwnerDto> {
  const exists = await repo.cafeExists(cafeId);
  if (!exists) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy quán');

  // Re-encoding happens before the lock is taken — only the cheap count+insert runs while held.
  const webp = await readAndValidateImage(file);

  const key = `cafes/photos/${cafeId}/${crypto.randomUUID()}.webp`;
  await storage.put(key, webp, 'image/webp');

  try {
    await repo.lockCafeAndInsertPhoto(cafeId, CAFE_PHOTO_MAX_COUNT, {
      cafeId,
      path: key,
      caption: caption ?? null,
      uploadedBy: userId,
    });
  } catch (err) {
    await storage.delete(key);
    throw err;
  }

  return getCafeForOwnerService(cafeId);
}

export async function deleteCafePhotoService(
  cafeId: string,
  photoId: string,
): Promise<CafeOwnerDto> {
  const photo = await repo.findCafePhoto(photoId);
  if (!photo || photo.cafeId !== cafeId) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy ảnh');

  await repo.deleteCafePhoto(photoId);
  try {
    await storage.delete(photo.path);
  } catch (err) {
    console.error(`Failed to delete café photo file ${photo.path}`, err);
  }

  return getCafeForOwnerService(cafeId);
}

export async function reorderCafePhotosService(
  cafeId: string,
  photoIds: string[],
): Promise<CafeOwnerDto> {
  const existingPhotos = await repo.listCafePhotos(cafeId);
  const existingIds = new Set(existingPhotos.map((p) => p.id));
  const sameSet =
    photoIds.length === existingIds.size && photoIds.every((id) => existingIds.has(id));
  if (!sameSet) {
    throw new ApiError('VALIDATION_FAILED', 422, 'Danh sách ảnh không khớp với kho ảnh hiện tại');
  }

  await repo.reorderCafePhotos(cafeId, photoIds);
  return getCafeForOwnerService(cafeId);
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
        links: visibleLinks(row.cafe.links ?? undefined, hideDetails),
        copies: row.copies,
      };
    });
}
