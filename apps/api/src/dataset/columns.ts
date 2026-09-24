/** Column orders are the on-disk contract for the dataset export/import/validate trio. */

export const FACTS_GAME_COLUMNS = [
  'slug',
  'nameVi',
  'nameEn',
  'minPlayers',
  'maxPlayers',
  'playMinutes',
  'weight',
  'minAge',
  'isVietnamese',
  'bggId',
  'categories',
  'videoUrls',
] as const;

export const FACTS_CATEGORY_COLUMNS = ['name', 'nameVi', 'kind', 'bggId'] as const;

export const FACTS_BARCODE_COLUMNS = ['code', 'gameSlug', 'edition', 'source'] as const;

/** Third-party MIT data (ThangLeQuoc/vietnamese-provinces-database) — lives in `admin-units/`, not `facts/`. */
export const ADMIN_UNIT_PROVINCE_COLUMNS = ['code', 'name', 'slug'] as const;

export const ADMIN_UNIT_WARD_COLUMNS = ['code', 'provinceCode', 'name', 'slug'] as const;

export const DESCRIPTION_GAME_COLUMNS = ['slug', 'descriptionVi', 'descriptionSource'] as const;

export const CAFE_COLUMNS = [
  'slug',
  'name',
  'provinceCode',
  'wardCode',
  'addressLine',
  'legacyDistrict',
  'lat',
  'lng',
  'links',
  'sourceUrl',
  'consentStatus',
] as const;

export const CAFE_GAME_COLUMNS = ['cafeSlug', 'gameSlug', 'copies', 'addedVia'] as const;

/** Column names that must never appear in any exported file (checked by tests/validate). */
export const FORBIDDEN_PII_COLUMNS = [
  'consentNote',
  'createdBy',
  'addedBy',
  'editorId',
  'userId',
  'email',
  'ipAddress',
  'userAgent',
] as const;
