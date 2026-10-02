import { describe, expect, it } from 'vitest';
import { buildGameBody, gameValuesFrom, validateGame } from './game-body';

describe('buildGameBody', () => {
  it('omits empty numbers on create and nulls them on edit', () => {
    const v = { ...gameValuesFrom(undefined), nameEn: 'Catan', minPlayers: '3' };
    const create = buildGameBody(v, false);
    expect(create.minPlayers).toBe(3);
    expect(create.maxPlayers).toBeUndefined();
    expect(buildGameBody(v, true).maxPlayers).toBeNull();
  });

  it('locks license to CC-BY-SA for original descriptions and parses videos', () => {
    const v = { ...gameValuesFrom(undefined), nameEn: 'X', videoUrls: ' a \n\n b ', weight: '2,5' };
    const body = buildGameBody(v, false);
    expect(body.descriptionLicense).toBe('CC-BY-SA-4.0');
    expect(body.videoUrls).toEqual(['a', 'b']);
    expect(body.weight).toBe(2.5);
  });
});

describe('validateGame', () => {
  it('requires name and license acceptance for original source', () => {
    const v = gameValuesFrom(undefined);
    expect(validateGame(v)).toBe('Nhập tên tiếng Anh');
    expect(validateGame({ ...v, nameEn: 'X' })).toMatch(/CC BY-SA/);
    expect(validateGame({ ...v, nameEn: 'X', acceptLicense: true })).toBeNull();
  });
  it('requires rights holder and ref for translated source', () => {
    const v = {
      ...gameValuesFrom(undefined),
      nameEn: 'X',
      source: 'translated_with_permission' as const,
    };
    expect(validateGame(v)).toMatch(/cấp phép/);
    expect(validateGame({ ...v, rightsHolder: 'NPH', permissionRef: '#1' })).toBeNull();
  });
});

describe('translated_from_bgg descriptions', () => {
  it('needs no CC BY-SA consent and always sends permission-only', () => {
    const v = {
      ...gameValuesFrom(undefined),
      nameEn: 'Catan',
      source: 'translated_from_bgg' as const,
    };
    expect(validateGame(v)).toBeNull();
    expect(buildGameBody({ ...v, license: 'CC-BY-SA-4.0' }, true).descriptionLicense).toBe(
      'permission-only',
    );
  });
});
