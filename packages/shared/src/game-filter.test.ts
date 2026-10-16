import { describe, expect, it } from 'vitest';
import { gameFilterSchema } from './games.js';

describe('game discovery query', () => {
  it('combines slug sets, update order, search and pagination', () => {
    expect(
      gameFilterSchema.parse({
        slugs: 'acquire-1963,the-gang-2024',
        sort: 'updated',
        q: 'gang',
        pageSize: '4',
      }),
    ).toMatchObject({
      slugs: 'acquire-1963,the-gang-2024',
      sort: 'updated',
      q: 'gang',
      pageSize: 4,
    });
  });
  it('rejects empty or unbounded slug sets and preserves default sorting', () => {
    for (const slugs of ['', 'a,,b', Array.from({ length: 51 }, (_, i) => `game-${i}`).join(',')]) {
      expect(gameFilterSchema.safeParse({ slugs }).success).toBe(false);
    }
    expect(gameFilterSchema.parse({}).sort).toBe('name');
  });
});
