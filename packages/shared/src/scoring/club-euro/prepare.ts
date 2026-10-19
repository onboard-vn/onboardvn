import type { RawValue, ScoreInput } from '../compute.js';
import { cloneScoringValue, type GameScorePreparation } from '../game-score-types.js';
import type { ScoreTemplate } from '../template-schema.js';

const contracts: Record<string, string[]> = {
  barrage: ['supplyQuantities', 'leeghwaterEnabled', 'privateBuildingVp', 'lastRoundEnergy'],
  'trajan-2011': ['entryMode', 'trackBeforeFinal', 'constructionTriples', 'senatePosition'],
  'galactic-cruise': ['supplyQuantities', 'cockpits', 'cockpitVp', 'turnOrder'],
  luthier: [
    'chairCount',
    'finishingInstruments',
    'resourceQuantities',
    'patronPenalty',
    'finishingVp',
  ],
  'entropy-2026': ['resourceQuantities', 'leftoverItems', 'leftoverVp'],
  'the-old-kings-crown': ['supplyTokens', 'siteEmpty', 'loreBonus'],
  'yinzi-ming': ['turnOrder', 'negotiation'],
  'gaia-project-2017': ['researchTrackLevels', 'researchLevels', 'leftoverResources'],
};

/** Derive only current template-backed quantity contracts; legacy pinned plays retain their scorer. */
export function prepareEuroScoring(
  template: ScoreTemplate,
  input: ScoreInput,
): GameScorePreparation | null {
  const required = contracts[template.slug];
  if (
    !required ||
    template.templateVersion < 3 ||
    !required.every((key) => template.categories.some((c) => c.key === key))
  )
    return null;
  const out: GameScorePreparation = {
    template: cloneScoringValue(template),
    input: cloneScoringValue(input),
  };
  const failures: string[] = [];
  const orders: number[] = [];
  let favourCount = 0;
  const fail = (name: string, message: string): void => {
    failures.push(`${name}: ${message}`);
  };
  for (const player of out.input.players) {
    const values = player.values;
    const set = (key: string, value: number): void => {
      values[key] = value;
    };
    const scalar = (key: string, fallback = 0): number => {
      const raw = values[key];
      if (raw === undefined) return fallback;
      if (typeof raw === 'boolean') return Number(raw);
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        fail(player.id, `${key} phải là số.`);
        return fallback;
      }
      return raw;
    };
    const integer = (key: string, min = 0, max = Infinity): number => {
      const n = scalar(key);
      if (!Number.isInteger(n) || n < min || n > max)
        fail(
          player.id,
          `${key} phải là số nguyên từ ${min}${max < Infinity ? ` đến ${max}` : ' trở lên'}.`,
        );
      return n;
    };
    const record = (key: string): Record<string, number> | null => {
      const raw: RawValue | undefined = values[key];
      if (raw === undefined) return null;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        fail(player.id, `${key} cần các số lượng.`);
        return {};
      }
      for (const [name, n] of Object.entries(raw)) {
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
          fail(player.id, `${key}.${name} phải là số nguyên không âm.`);
      }
      return raw;
    };
    const sum = (r: Record<string, number>): number => Object.values(r).reduce((a, b) => a + b, 0);
    const order = (key: string): void => {
      orders.push(integer(key, 1, input.players.length));
    };
    switch (template.slug) {
      case 'barrage': {
        const quantities = record('supplyQuantities');
        if (quantities) set('leftoverItems', sum(quantities));
        const enabled = integer('leeghwaterEnabled', 0, 1);
        if (!enabled && scalar('privateBuildingVp') !== 0)
          fail(player.id, 'Bật Leeghwater trước khi nhập VP Private Buildings.');
        integer('lastRoundEnergy');
        break;
      }
      case 'trajan-2011':
        integer('entryMode', 0, 1);
        for (const key of [
          'handCards',
          'campWorkers',
          'campLegionnaires',
          'constructionTriples',
          'constructionQuadruples',
        ])
          integer(key);
        order('senatePosition');
        break;
      case 'galactic-cruise': {
        const quantities = record('supplyQuantities');
        if (quantities) set('supplies', sum(quantities));
        set('cockpitVp', scalar('cockpits'));
        const progress = record('progress');
        if (progress && (progress.mostReputation ?? 0) > 1)
          fail(player.id, 'Thưởng nhiều uy tín nhất chỉ là 0 hoặc 1 cube.');
        order('turnOrder');
        break;
      }
      case 'luthier': {
        const count =
          values.chairCount === undefined
            ? integer(input.playerCount === 4 ? 'firstChairs4p' : 'firstChairs')
            : integer('chairCount');
        set('firstChairs', input.playerCount === 4 ? 0 : count);
        set('firstChairs4p', input.playerCount === 4 ? count : 0);
        const instruments = values.finishingInstruments;
        if (instruments !== undefined) {
          if (!Array.isArray(instruments) || instruments.some((n) => !Number.isInteger(n) || n < 0))
            fail(player.id, 'Nhập uy tín không âm của từng nhạc cụ ở finishing bench.');
          else {
            set(
              'finishingVp',
              instruments.reduce((total, n) => total + Math.ceil(n / 2), 0),
            );
          }
        }
        if (instruments === undefined)
          set('finishingVp', Math.ceil(scalar('unfinishedPrestige') / 2));
        const resources = record('resourceQuantities');
        if (resources) set('leftoverResources', sum(resources));
        integer('leftoverMoney', 0, 9);
        break;
      }
      case 'entropy-2026': {
        const resources = record('resourceQuantities');
        if (resources) set('leftoverItems', sum(resources));
        break;
      }
      case 'the-old-kings-crown': {
        const tokens = record('supplyTokens');
        if (tokens) set('influence', (tokens.ones ?? 0) + 5 * (tokens.fives ?? 0));
        if (!integer('siteEmpty', 0, 1)) set('loreBonus', 0);
        favourCount += integer('favour', 0, 1);
        order('orderPos');
        break;
      }
      case 'yinzi-ming': {
        const negotiation = record('negotiation');
        if (negotiation && ((negotiation.level ?? 0) > 4 || (negotiation.destinations ?? 0) > 6))
          fail(player.id, 'Đàm phán tối đa cấp 4 và 6 điểm đến.');
        order('turnOrder');
        break;
      }
      case 'gaia-project-2017': {
        const levels = record('researchTrackLevels');
        if (levels) {
          if (Object.values(levels).some((n) => n > 5))
            fail(player.id, 'Mỗi nhánh nghiên cứu chỉ có cấp 0–5.');
          set(
            'researchLevels',
            Object.values(levels).reduce((total, level) => total + Math.max(0, level - 2), 0),
          );
        }
        record('leftoverResources');
        break;
      }
    }
  }
  if (orders.length && new Set(orders).size !== orders.length)
    failures.push('Mỗi người cần một vị trí thứ tự khác nhau.');
  if (favourCount > 1) failures.push('Chỉ một người có thể giữ Kingdom’s Favour.');
  if (failures.length) out.error = failures.join(' ');
  return out;
}
