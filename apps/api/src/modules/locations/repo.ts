import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { provinces, wards } from '../../db/schema/index.js';

export function listProvinces() {
  return db.select().from(provinces).orderBy(asc(provinces.name));
}

export function findProvinceByCode(code: string) {
  return db.query.provinces.findFirst({ where: eq(provinces.code, code) });
}

export function findProvinceBySlug(slug: string) {
  return db.query.provinces.findFirst({ where: eq(provinces.slug, slug) });
}

export function listWardsByProvince(provinceCode: string) {
  return db
    .select()
    .from(wards)
    .where(eq(wards.provinceCode, provinceCode))
    .orderBy(asc(wards.name));
}

export function findWardByCode(code: string) {
  return db.query.wards.findFirst({ where: eq(wards.code, code) });
}

export function findWardsByProvinceAndSlug(provinceCode: string, slug: string) {
  return db
    .select()
    .from(wards)
    .where(and(eq(wards.provinceCode, provinceCode), eq(wards.slug, slug)));
}
