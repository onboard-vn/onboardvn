import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { scoreTemplateSchema } from '@onboard/shared';
import { computePlay, type ComputePlayer } from './compute.js';
const load = (slug: string) =>
  scoreTemplateSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../../../data/staging/score-templates/${slug}.json`, import.meta.url)
          .pathname,
        'utf8',
      ),
    ),
  );
const player = (id: string, values: Record<string, unknown>): ComputePlayer => ({
  identityId: id,
  values,
  team: null,
  role: null,
  rounds: null,
  isWinnerOverride: null,
});
const run = (slug: string, players: ComputePlayer[]) => {
  const r = computePlay(load(slug), players, null);
  if (!r.ok) throw Error(r.message);
  return r.value;
};
describe('club game server results', () => {
  it('uses bank-market holdings and authoritative bonuses with one shared price row', () => {
    const r = run('acquire-1963', [
      player('a', {
        cash: 6000,
        chainPrices: { tower: 400 },
        marketShares: { tower: 9 },
        chainShares: { tower: 5 },
        endBonuses: 99999,
      }),
      player('b', { cash: 6000, chainShares: { tower: 3 } }),
    ]);
    expect(r.byIdentity.get('a')).toMatchObject({ total: 10000, rank: 1, isWinner: true });
    expect(r.byIdentity.get('b')).toMatchObject({ total: 7200, rank: 2, isWinner: false });
  });
  it('does not treat neutral setup as a competing team', () => {
    const r = run('age-of-innovation', [
      player('a', {
        neutralFaction: { area: 15, discOne: 7, discTwo: 0, discThree: 0, discFour: 0 },
        area: 14,
        discOne: 6,
      }),
      player('b', { area: 10, discOne: 3 }),
    ]);
    expect(r.byIdentity.get('a')).toMatchObject({ total: 16, isWinner: true });
    expect(r.byIdentity.get('b')).toMatchObject({ total: 8, isWinner: false });
  });
  it('returns combined Cloudspire team totals and the immediate team winner', () => {
    const r = run('cloudspire', [
      player('a', { teamMode: 1, teamSeat: 1, gateHealth: 2, earlyWinner: 1 }),
      player('b', { teamSeat: 1, gateHealth: 2 }),
      player('c', { teamSeat: 2, gateDefeated: 1 }),
      player('d', { teamSeat: 2, gateHealth: 20 }),
    ]);
    expect(r.byIdentity.get('a')).toMatchObject({ total: 4, isWinner: true });
    expect(r.byIdentity.get('b')).toMatchObject({ total: 4, isWinner: true });
    expect(r.byIdentity.get('d')).toMatchObject({ isWinner: false });
  });
  it('keeps an ongoing Vantage session incomplete', () => {
    const r = computePlay(load('vantage'), [player('a', { missionCompleted: 1 })], null);
    expect(r.ok).toBe(false);
  });
  it('does not let a stored winner override reverse a cooperative loss', () => {
    const players = [player('a', { heistsFailed: 3 }), player('b', {}), player('c', {})];
    players[0]!.isWinnerOverride = true;
    const result = computePlay(load('the-gang-2024'), players, 'loss');
    expect(result.ok && [...result.value.byIdentity.values()].every((p) => !p?.isWinner)).toBe(
      true,
    );
  });
  it('keeps individual early Cloudspire winners separate from shared setup', () => {
    const r = run('cloudspire', [
      player('a', { gateHealth: 3, earlyWinner: 1 }),
      player('b', { gateDefeated: 1 }),
    ]);
    expect(r.byIdentity.get('a')).toMatchObject({ total: 3, rank: 1, isWinner: true });
    expect(r.byIdentity.get('b')).toMatchObject({ total: 0, rank: 2, isWinner: false });
  });
  it('excludes an insolvent player even when all remaining scores are negative', () => {
    const r = run('age-of-steam-deluxe-2019', [
      player('a', { insolvent: 1 }),
      player('b', { sharesIssued: 5 }),
    ]);
    expect(r.byIdentity.get('a')).toMatchObject({ rank: null, isWinner: false });
    expect(r.byIdentity.get('b')).toMatchObject({ total: -15, rank: 1, isWinner: true });
  });
});
