import type { ShelfItemDto } from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COLUMNS, formatLastPlayed, isStale, parseColumns, sortShelf } from './logic';

const now = Date.parse('2026-10-02T00:00:00Z');
const ago = (d: number) => new Date(now - d * 86_400_000).toISOString();

const item = (nameEn: string, lastPlayedAt: string | null, createdAt: string): ShelfItemDto =>
  ({
    game: { id: nameEn, nameVi: null, nameEn },
    lastPlayedAt,
    createdAt,
  }) as unknown as ShelfItemDto;

describe('shelf logic', () => {
  it('flags never played and older than 90 days as stale', () => {
    expect(isStale(null, now)).toBe(true);
    expect(isStale(ago(91), now)).toBe(true);
    expect(isStale(ago(90), now)).toBe(false);
    expect(isStale(ago(3), now)).toBe(false);
  });

  it('formats relative dates in Vietnamese', () => {
    expect(formatLastPlayed(null, now)).toBe('Chưa chơi');
    expect(formatLastPlayed(ago(0), now)).toBe('Hôm nay');
    expect(formatLastPlayed(ago(3), now)).toBe('3 ngày trước');
    expect(formatLastPlayed(ago(14), now)).toBe('2 tuần trước');
    expect(formatLastPlayed(ago(65), now)).toBe('2 tháng trước');
    expect(formatLastPlayed(ago(800), now)).toBe('2 năm trước');
  });

  it('sorts by name, last played (never first) and added (newest first)', () => {
    const items = [
      item('Catan', ago(5), ago(10)),
      item('Azul', null, ago(1)),
      item('Bang', ago(40), ago(20)),
    ];
    const names = (s: Parameters<typeof sortShelf>[1]) =>
      sortShelf(items, s).map((i) => i.game.nameEn);
    expect(names('name')).toEqual(['Azul', 'Bang', 'Catan']);
    expect(names('lastPlayed')).toEqual(['Azul', 'Bang', 'Catan']);
    expect(names('added')).toEqual(['Azul', 'Catan', 'Bang']);
  });

  it('parses stored columns defensively', () => {
    expect(parseColumns(null)).toEqual(DEFAULT_COLUMNS);
    expect(parseColumns('nope')).toEqual(DEFAULT_COLUMNS);
    expect(parseColumns('["note","bogus","condition"]')).toEqual(['condition', 'note']);
  });
});
