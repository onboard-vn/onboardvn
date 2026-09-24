import type { ProvinceDto, WardDto } from '@onboard/shared';
import { ApiError } from '../../lib/errors.js';
import * as repo from './repo.js';

function toProvinceDto(row: { code: string; name: string; slug: string }): ProvinceDto {
  return { code: row.code, name: row.name, slug: row.slug };
}

function toWardDto(row: {
  code: string;
  provinceCode: string;
  name: string;
  slug: string;
}): WardDto {
  return { code: row.code, provinceCode: row.provinceCode, name: row.name, slug: row.slug };
}

export async function listProvincesService(): Promise<ProvinceDto[]> {
  const rows = await repo.listProvinces();
  return rows.map(toProvinceDto);
}

export async function listWardsService(provinceCode: string): Promise<WardDto[]> {
  const province = await repo.findProvinceByCode(provinceCode);
  if (!province) throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy tỉnh/thành');
  const rows = await repo.listWardsByProvince(provinceCode);
  return rows.map(toWardDto);
}
