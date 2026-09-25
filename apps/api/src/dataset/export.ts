import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  cafeGames,
  cafes,
  categories,
  gameBarcodes,
  games,
  provinces,
  wards,
} from '../db/schema/index.js';
import { publicCafeWhere } from '../modules/cafes/visibility.js';
import {
  ADMIN_UNIT_PROVINCE_COLUMNS,
  ADMIN_UNIT_WARD_COLUMNS,
  CAFE_COLUMNS,
  CAFE_GAME_COLUMNS,
  DESCRIPTION_GAME_COLUMNS,
  FACTS_BARCODE_COLUMNS,
  FACTS_CATEGORY_COLUMNS,
  FACTS_GAME_COLUMNS,
} from './columns.js';
import { toCsv, toJson } from './csv.js';

const FACTS_README = `# facts/

Dữ liệu sự kiện/dữ kiện khách quan do OnBoardVN tạo ra (tên game, số người chơi, thời gian
chơi, độ khó, thể loại, mã vạch) — **không kèm mô tả sáng tạo**.

## Giấy phép: CC0 1.0 Universal (Public Domain Dedication)

Toàn bộ nội dung trong thư mục \`facts/\` được cấp phép theo CC0 1.0 (xem
\`LICENSE-CC0.txt\`), để tương thích với việc đóng góp lên Wikidata sau này.
`;

const ADMIN_UNITS_README = `# admin-units/

Dữ liệu tỉnh/thành và phường/xã Việt Nam, lấy từ
[ThangLeQuoc/vietnamese-provinces-database](https://github.com/ThangLeQuoc/vietnamese-provinces-database).

## Giấy phép: MIT (xem \`LICENSE-MIT.txt\`)

Đây là dữ liệu của bên thứ ba, **không phải CC0** như \`facts/\` — giữ nguyên thông báo bản
quyền và giấy phép MIT khi tái sử dụng \`provinces.csv\`/\`wards.csv\`.
`;

const ADMIN_UNITS_LICENSE_MIT = `MIT License

Copyright (c) 2021 Thang Le Quoc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

async function writeFileDeterministic(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
}

async function exportGameFacts(outDir: string): Promise<void> {
  const rows = await db.query.games.findMany({
    orderBy: [asc(games.slug)],
    with: { categories: { with: { category: true } } },
  });

  const facts = rows
    .map((row) => ({
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
      categories: row.categories.map((gc) => gc.category.name).sort(),
      videoUrls: [...row.videoUrls].sort(),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  await writeFileDeterministic(join(outDir, 'facts/games.json'), toJson(facts));
  await writeFileDeterministic(join(outDir, 'facts/games.csv'), toCsv(FACTS_GAME_COLUMNS, facts));
}

async function exportCategoryFacts(outDir: string): Promise<void> {
  const rows = await db.select().from(categories).orderBy(asc(categories.name));
  const facts = rows.map((r) => ({ name: r.name, nameVi: r.nameVi, kind: r.kind, bggId: r.bggId }));

  await writeFileDeterministic(join(outDir, 'facts/categories.json'), toJson(facts));
  await writeFileDeterministic(
    join(outDir, 'facts/categories.csv'),
    toCsv(FACTS_CATEGORY_COLUMNS, facts),
  );
}

async function exportBarcodeFacts(outDir: string): Promise<void> {
  const rows = await db
    .select({
      code: gameBarcodes.code,
      gameSlug: games.slug,
      edition: gameBarcodes.edition,
      source: gameBarcodes.source,
    })
    .from(gameBarcodes)
    .innerJoin(games, eq(games.id, gameBarcodes.gameId))
    .orderBy(asc(gameBarcodes.code));

  await writeFileDeterministic(
    join(outDir, 'facts/barcodes.csv'),
    toCsv(FACTS_BARCODE_COLUMNS, rows),
  );
}

async function exportAdminUnits(outDir: string): Promise<void> {
  const provinceRows = await db.select().from(provinces).orderBy(asc(provinces.code));
  const wardRows = await db.select().from(wards).orderBy(asc(wards.code));

  await writeFileDeterministic(join(outDir, 'admin-units/README.md'), ADMIN_UNITS_README);
  await writeFileDeterministic(
    join(outDir, 'admin-units/LICENSE-MIT.txt'),
    ADMIN_UNITS_LICENSE_MIT,
  );
  await writeFileDeterministic(
    join(outDir, 'admin-units/provinces.csv'),
    toCsv(ADMIN_UNIT_PROVINCE_COLUMNS, provinceRows),
  );
  await writeFileDeterministic(
    join(outDir, 'admin-units/wards.csv'),
    toCsv(ADMIN_UNIT_WARD_COLUMNS, wardRows),
  );
}

async function exportDescriptions(outDir: string): Promise<void> {
  const rows = await db
    .select({
      slug: games.slug,
      descriptionVi: games.descriptionVi,
      descriptionSource: games.descriptionSource,
      descriptionLicense: games.descriptionLicense,
    })
    .from(games)
    .where(eq(games.descriptionLicense, 'CC-BY-SA-4.0'))
    .orderBy(asc(games.slug));

  const descriptions = rows
    .filter((r): r is typeof r & { descriptionVi: string } => Boolean(r.descriptionVi))
    .map((r) => ({
      slug: r.slug,
      descriptionVi: r.descriptionVi,
      descriptionSource: r.descriptionSource,
    }));

  await writeFileDeterministic(join(outDir, 'descriptions/games.json'), toJson(descriptions));
  await writeFileDeterministic(
    join(outDir, 'descriptions/games.csv'),
    toCsv(DESCRIPTION_GAME_COLUMNS, descriptions),
  );
}

async function exportCafes(outDir: string): Promise<void> {
  const rows = await db.query.cafes.findMany({
    where: publicCafeWhere(),
    orderBy: [asc(cafes.slug)],
  });

  const cafeFacts = rows.map((row) => {
    const publicOnly = row.consentStatus === 'public_info_only';
    return {
      slug: row.slug,
      name: row.name,
      provinceCode: row.provinceCode,
      wardCode: row.wardCode,
      addressLine: row.addressLine,
      legacyDistrict: publicOnly ? null : row.legacyDistrict,
      lat: publicOnly ? null : row.lat,
      lng: publicOnly ? null : row.lng,
      links: row.links ? JSON.stringify(row.links) : null,
      sourceUrl: publicOnly ? null : row.sourceUrl,
      consentStatus: row.consentStatus,
    };
  });

  await writeFileDeterministic(join(outDir, 'cafes/cafes.json'), toJson(cafeFacts));
  await writeFileDeterministic(join(outDir, 'cafes/cafes.csv'), toCsv(CAFE_COLUMNS, cafeFacts));

  const cafeGameRows = await db
    .select({
      cafeSlug: cafes.slug,
      gameSlug: games.slug,
      copies: cafeGames.copies,
      addedVia: cafeGames.addedVia,
    })
    .from(cafeGames)
    .innerJoin(cafes, eq(cafes.id, cafeGames.cafeId))
    .innerJoin(games, eq(games.id, cafeGames.gameId))
    .where(publicCafeWhere())
    .orderBy(asc(cafes.slug), asc(games.slug));

  await writeFileDeterministic(
    join(outDir, 'cafes/cafe_games.csv'),
    toCsv(CAFE_GAME_COLUMNS, cafeGameRows),
  );
}

export async function exportDataset(outDir: string): Promise<void> {
  await writeFileDeterministic(join(outDir, 'facts/README.md'), FACTS_README);
  await exportGameFacts(outDir);
  await exportCategoryFacts(outDir);
  await exportBarcodeFacts(outDir);
  await exportAdminUnits(outDir);
  await exportDescriptions(outDir);
  await exportCafes(outDir);
}
