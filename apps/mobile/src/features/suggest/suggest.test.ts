import { describe, expect, it } from 'vitest';
import { DECK_SIZE, HAND_SIZE, dealPlan, pickHand, tableLayout } from './deal';
import { RARITY } from './rarity';
import type { SuggestPoolItemDto } from '@onboard/shared';
import { cafeContacts } from './cafe-contacts';
import {
  actionGroup,
  buildSuggestQuery,
  eventParams,
  initialChoice,
  parseSavedChoice,
  poolLabel,
  whoHasIt,
} from './sources';

const item = (over: Partial<SuggestPoolItemDto> = {}) =>
  ({ rarity: 'common', cafeCount: 7, ...over }) as SuggestPoolItemDto;

describe('rarity map', () => {
  it('covers all five tiers with distinct colors and Vietnamese labels', () => {
    expect(Object.keys(RARITY)).toEqual(['common', 'rare', 'epic', 'legendary', 'ancient']);
    expect(new Set(Object.values(RARITY).map((r) => r.color)).size).toBe(5);
    expect(RARITY.common.label).toBe('Thường');
    expect(RARITY.ancient.label).toBe('Cổ vật');
  });
});

describe('pickHand', () => {
  it('draws five distinct items from a big pool', () => {
    const pool = Array.from({ length: 20 }, (_, i) => i);
    const hand = pickHand(pool);
    expect(hand).toHaveLength(HAND_SIZE);
    expect(new Set(hand).size).toBe(HAND_SIZE);
    hand.forEach((x) => expect(pool).toContain(x));
  });

  it('repeats a small pool to fill the hand and handles empty pools', () => {
    const hand = pickHand(['a', 'b']);
    expect(hand).toHaveLength(HAND_SIZE);
    expect(new Set(hand)).toEqual(new Set(['a', 'b']));
    expect(pickHand([])).toEqual([]);
  });
});

describe('dealPlan', () => {
  it('burns 3 and deals flop, turn, river into slots 0..4 from the top of the deck', () => {
    const plan = dealPlan();
    expect(plan.map((m) => m.to)).toEqual(['muck', 0, 1, 2, 'muck', 3, 'muck', 4]);
    expect(plan.map((m) => m.card)).toEqual([10, 9, 8, 7, 6, 5, 4, 3]);
    expect(new Set(plan.map((m) => m.card)).size).toBe(plan.length);
    expect(plan.length).toBeLessThan(DECK_SIZE);
  });
});

describe('tableLayout', () => {
  it('fits five cards in a row on a phone and caps card width on desktop', () => {
    const phone = tableLayout(343, 320);
    expect(5 * phone.cardW + 4 * 12).toBeLessThan(343 - 48);
    expect(tableLayout(900, 400).cardW).toBe(110);
    const desk = tableLayout(900, 400);
    expect(desk.deck.y - (desk.cardH * desk.pileScale) / 2).toBeGreaterThanOrEqual(-200 + 48);
    expect(phone.slotX(2)).toBe(0);
    expect(phone.slotX(0)).toBe(-phone.slotX(4));
  });
});

describe('buildSuggestQuery', () => {
  it('waits until the source has what it needs', () => {
    expect(buildSuggestQuery(initialChoice())).toBeNull();
    expect(buildSuggestQuery({ ...initialChoice(), source: 'cafe' })).toBeNull();
    expect(buildSuggestQuery({ ...initialChoice(), source: 'province' })).toBeNull();
  });

  it('sends only the chosen source fields', () => {
    expect(buildSuggestQuery({ ...initialChoice(), source: 'shelf', players: 4 })).toEqual({
      source: 'shelf',
      players: 4,
    });
    expect(
      buildSuggestQuery({
        ...initialChoice(),
        source: 'cafe',
        cafe: { id: 'c1', slug: 'q', name: 'Q' },
        province: { code: '79', name: 'HCM' },
      }),
    ).toEqual({ source: 'cafe', cafeId: 'c1' });
    expect(
      buildSuggestQuery({
        ...initialChoice(),
        source: 'province',
        province: { code: '79', name: 'HCM' },
      }),
    ).toEqual({ source: 'province', provinceCode: '79' });
  });
});

describe('labels', () => {
  it('names the pool and who has the game per source', () => {
    const cafe = {
      ...initialChoice(),
      source: 'cafe' as const,
      cafe: { id: 'c', slug: 'meeple', name: 'Meeple' },
    };
    expect(poolLabel(cafe, 12)).toBe('Tủ game của Meeple: 12 game');
    expect(whoHasIt(cafe, item())).toBe('Meeple đang có game này trong tủ.');
    expect(whoHasIt({ ...initialChoice(), source: 'all' }, item())).toBe(
      '7 quán trên toàn quốc có game này.',
    );
  });
});

describe('new sources', () => {
  const club = { id: 'k1', slug: 'clb', name: 'CLB' };

  it('needs a club for the club source and a province for the city source', () => {
    expect(buildSuggestQuery({ ...initialChoice(), source: 'club' })).toBeNull();
    expect(buildSuggestQuery({ ...initialChoice(), source: 'club', club })).toEqual({
      source: 'club',
      clubId: 'k1',
    });
    expect(buildSuggestQuery({ ...initialChoice(), source: 'city' })).toBeNull();
    expect(
      buildSuggestQuery({
        ...initialChoice(),
        source: 'city',
        province: { code: '79', name: 'HCM' },
      }),
    ).toEqual({ source: 'city', provinceCode: '79' });
    expect(buildSuggestQuery({ ...initialChoice(), source: 'friends' })).toEqual({
      source: 'friends',
    });
  });

  it('names owners and the people left out', () => {
    const owners = [
      { name: 'Minh Anh', username: 'minhanh' },
      { name: 'Quang Huy', username: null },
    ];
    expect(
      whoHasIt({ ...initialChoice(), source: 'club', club }, item({ owners, ownerCount: 4 })),
    ).toBe('Thành viên có game: Minh Anh, Quang Huy và 2 người khác.');
    expect(
      whoHasIt({ ...initialChoice(), source: 'friends' }, item({ owners: [], ownerCount: 0 })),
    ).toBe('Game này có trong tủ của bạn.');
  });

  it('groups actions and builds the Kèo link per source', () => {
    expect(actionGroup('cafe')).toBe('cafe');
    expect(actionGroup('club')).toBe('personal');
    expect(actionGroup('city')).toBe('area');
    expect(eventParams({ ...initialChoice(), source: 'club', club }, 'catan')).toEqual({
      game: 'catan',
      club: 'clb',
    });
    expect(
      eventParams(
        { ...initialChoice(), source: 'cafe', cafe: { id: 'c', slug: 'meeple', name: 'M' } },
        'catan',
      ),
    ).toEqual({ game: 'catan', cafe: 'meeple' });
  });
});

describe('cafeContacts', () => {
  it('lists only filled links and normalises Zalo phone and tel links', () => {
    expect(cafeContacts(undefined)).toEqual([]);
    expect(
      cafeContacts({
        zalo: '+84 912 345 678',
        maps: 'https://maps.app.goo.gl/x',
        phone: '028 3822 1234',
      }),
    ).toEqual([
      { label: 'Nhắn Zalo quán', url: 'https://zalo.me/0912345678' },
      { label: 'Chỉ đường', url: 'https://maps.app.goo.gl/x' },
      { label: 'Gọi quán', url: 'tel:02838221234' },
    ]);
    expect(cafeContacts({ zalo: 'https://zalo.me/abc' })[0]?.url).toBe('https://zalo.me/abc');
  });
});

describe('saved choice', () => {
  it('defaults to the same-city source and restores only valid saved fields', () => {
    expect(initialChoice().source).toBe('city');
    expect(parseSavedChoice(null)).toBeNull();
    expect(parseSavedChoice('not json')).toBeNull();
    expect(parseSavedChoice(JSON.stringify({ source: 'all' }))).toBeNull();
    expect(
      parseSavedChoice(
        JSON.stringify({
          source: 'club',
          club: { id: 'k', slug: 'c', name: 'CLB' },
          cafe: { id: 1 },
          players: 4,
        }),
      ),
    ).toEqual({
      ...initialChoice(),
      source: 'club',
      club: { id: 'k', slug: 'c', name: 'CLB' },
      players: 4,
    });
  });
});
