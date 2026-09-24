import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateDataset } from './validate.js';

const dir = `/tmp/onboard-dataset-validate-test-${Date.now()}`;

const FILES: Record<string, string> = {
  LICENSE: 'CC BY-SA 4.0',
  'facts/LICENSE-CC0.txt': 'CC0 1.0',
  'facts/games.csv':
    'slug,nameVi,nameEn,minPlayers,maxPlayers,playMinutes,weight,minAge,isVietnamese,bggId,categories,videoUrls\nma-soi,Ma Sói,Werewolf,4,18,15,1.5,8,true,,,',
  'facts/categories.csv': 'name,nameVi,kind,bggId\n',
  'facts/barcodes.csv': 'code,gameSlug,edition,source\n',
  'admin-units/LICENSE-MIT.txt': 'MIT License',
  'admin-units/provinces.csv': 'code,name,slug\n',
  'admin-units/wards.csv': 'code,provinceCode,name,slug\n',
  'descriptions/games.csv': 'slug,descriptionVi,descriptionSource\n',
  'cafes/cafes.csv':
    'slug,name,provinceCode,wardCode,addressLine,legacyDistrict,lat,lng,links,sourceUrl,consentStatus\n',
  'cafes/cafe_games.csv': 'cafeSlug,gameSlug,copies,addedVia\n',
};

beforeAll(async () => {
  for (const [rel, content] of Object.entries(FILES)) {
    const path = join(dir, rel);
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, content, 'utf8');
  }
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('dataset validate', () => {
  it('accepts a well-formed dataset directory', async () => {
    const issues = await validateDataset(dir);
    expect(issues).toEqual([]);
  });

  it('reports a missing required file', async () => {
    const missingDir = `${dir}-missing`;
    const issues = await validateDataset(missingDir);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('flags a forbidden PII column', async () => {
    const badDir = `${dir}-bad`;
    for (const [rel, content] of Object.entries(FILES)) {
      const path = join(badDir, rel);
      await mkdir(join(path, '..'), { recursive: true });
      const value =
        rel === 'cafes/cafes.csv'
          ? content.replace('consentStatus', 'consentStatus,consentNote')
          : content;
      await writeFile(path, value, 'utf8');
    }

    const issues = await validateDataset(badDir);
    expect(issues.some((i) => i.message.includes('consentNote'))).toBe(true);

    await rm(badDir, { recursive: true, force: true });
  });
});
