import type { RawValue, ScoreInput } from '../compute.js';
import type { GameScorePreparation } from '../game-score-types.js';
import type { ScoreTemplate } from '../template-schema.js';

const contracts: Record<string, string[]> = {
  cloudspire: ['teamMode', 'teamSeat', 'earlyWinner', 'gateHealth', 'advancements'],
  'age-of-steam-deluxe-2019': ['insolvent', 'mapVariant', 'cashRemaining', 'tieRoll'],
  'concordia-venus': ['vestaSupply', 'prefectOrder'],
  'feya-s-swamp-2025': ['islandQuantities', 'scoreCardOne', 'scoreCardTwo'],
  vantage: ['sessionEnded', 'missionCompleted', 'destinyCompleted'],
  'abomination-the-heir-of-frankenstein-2019': [
    'bodyParts',
    'captainEnded',
    'humanityValue',
    'turnOrder',
  ],
  'zoo-tycoon': ['newShores', 'endQuantities', 'eliminated'],
};
const n = (v: RawValue | undefined): number => (typeof v === 'number' ? v : v === true ? 1 : 0);
const record = (v: RawValue | undefined): Record<string, number> =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {};
const cardKeys = [
  'cardLargestGroup',
  'cardTemple',
  'cardIslandMajority',
  'cardSingleSettlement',
  'cardLargestIsland',
  'cardSmallestIsland',
];

/** Prepare only the new category contract, never rewrite meanings in legacy pinned templates. */
export function prepareMixedScoring(
  template: ScoreTemplate,
  raw: ScoreInput,
): GameScorePreparation | null {
  const required = contracts[template.slug];
  if (
    !required ||
    template.templateVersion < 3 ||
    required.some((key) => !template.categories.some((c) => c.key === key))
  )
    return null;
  const input: ScoreInput = {
    ...raw,
    players: raw.players.map((p) => ({ ...p, values: { ...p.values } })),
  };
  const result: GameScorePreparation = { template, input };
  const setup = (key: string): number =>
    n(input.players.find((p) => p.values[key] !== undefined)?.values[key]);
  const fail = (error: string): GameScorePreparation => ({ ...result, error });
  // Stored winner overrides must never contradict this calculator's authoritative quantities.
  delete input.winners;

  switch (template.slug) {
    case 'age-of-steam-deluxe-2019': {
      const map = setup('mapVariant');
      if (map !== 0 && map !== 1)
        return fail('Chọn bản đồ Rust Belt hoặc Western US; bản đồ khác chưa được xác minh.');
      result.excludedIds = input.players
        .filter((p) => n(p.values.insolvent) !== 0)
        .map((p) => p.id);
      if (map === 1) {
        result.template = {
          ...template,
          sharedVictoryOnTie: false,
          tiebreakers: [
            { categoryKey: 'cashRemaining', dir: 'highest', description: 'Most cash' },
            { categoryKey: 'trackSections', dir: 'highest', description: 'Most track' },
            { categoryKey: 'tieRoll', dir: 'highest', description: 'Die roll; reroll tied dice' },
          ],
        };
      }
      break;
    }
    case 'concordia-venus': {
      if (
        input.playerCount < 2 ||
        input.playerCount > 5 ||
        input.players.some((p) => p.team !== undefined)
      )
        return fail('Bảng Venus này dành cho cá nhân 2–5 người; không dùng cho đội.');
      const orders = input.players.map((p) => n(p.values.prefectOrder));
      if (
        orders.some((v) => !Number.isInteger(v) || v < 0 || v >= input.playerCount) ||
        new Set(orders).size !== orders.length
      )
        return fail(
          'Mỗi người cần thứ tự nhận Præfectus Magnus khác nhau, từ 0 đến số người trừ 1.',
        );
      for (const p of input.players) {
        const q = record(p.values.vestaSupply);
        p.values.vesta = {
          cards: q.cards ?? 0,
          sestertii:
            (q.cash ?? 0) +
            3 * (q.brick ?? 0) +
            4 * (q.food ?? 0) +
            5 * (q.tool ?? 0) +
            6 * (q.wine ?? 0) +
            7 * (q.cloth ?? 0),
        };
      }
      break;
    }
    case 'feya-s-swamp-2025': {
      const a = setup('scoreCardOne'),
        b = setup('scoreCardTwo');
      if (![a, b].every((v) => Number.isInteger(v) && v >= 1 && v <= 6) || a === b)
        return fail('Chọn đúng hai thẻ tính điểm khác nhau.');
      for (const p of input.players) {
        const q = record(p.values.islandQuantities);
        if (
          Object.values(q).some((v) => !Number.isInteger(v) || v < 0) ||
          Array.from({ length: 20 }, (_, i) => q[`settlements${i + 1}`] ?? 0).reduce(
            (a, b) => a + b,
            0,
          ) > 20
        )
          return fail('Nhập số lượng nguyên không âm, tối đa 20 khu định cư của mỗi người.');
        p.values.islandPoints = Array.from(
          { length: 20 },
          (_, i) => (q[`settlements${i + 1}`] ?? 0) * (q[`spirits${i + 1}`] ?? 0),
        ).reduce((x, y) => x + y, 0);
        for (const [i, key] of cardKeys.entries())
          if (i + 1 !== a && i + 1 !== b) p.values[key] = 0;
      }
      break;
    }
    case 'vantage': {
      if (setup('sessionEnded') === 0) {
        delete input.outcome;
        return fail(
          'Phiên chưa kết thúc: hoàn thành Mission vẫn có thể tiếp tục tìm Destiny. Xác nhận kết thúc phiên trước khi lưu kết quả.',
        );
      } else
        input.outcome =
          setup('missionCompleted') !== 0 || setup('destinyCompleted') !== 0 ? 'win' : 'loss';
      break;
    }
    case 'abomination-the-heir-of-frankenstein-2019': {
      if (input.playerCount < 2 || input.playerCount > 4)
        return fail('Chỉ hỗ trợ luật gốc cạnh tranh 2–4 người.');
      const orders = input.players.map((p) => n(p.values.turnOrder));
      if (
        orders.some((v) => !Number.isInteger(v) || v < 1 || v > input.playerCount) ||
        new Set(orders).size !== orders.length
      )
        return fail('Mỗi người cần vị trí thứ tự riêng từ 1 đến số người.');
      const highest = Math.max(0, ...input.players.map((p) => n(p.values.humanityValue)));
      for (const p of input.players) {
        const q = record(p.values.bodyParts);
        if (
          Object.entries(q).some(
            ([key, value]) =>
              !Number.isInteger(value) || value < 0 || (key.endsWith('Alive') && value > 1),
          )
        )
          return fail('Bộ phận sống chỉ nhận 0/1; VP in trên bộ phận là số nguyên không âm.');
        const alive = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'].filter(
          (part) => (q[`${part}Alive`] ?? 0) !== 0,
        );
        p.values.aliveParts = alive.map((part) => q[`${part}Vp`] ?? 0);
        p.values.aliveCount = alive.length;
        p.values.humanityLeaderBonus =
          setup('captainEnded') !== 0 && highest > 0 && n(p.values.humanityValue) === highest;
      }
      break;
    }
    case 'cloudspire': {
      const teamMode = setup('teamMode') !== 0;
      const early = input.players.filter((p) => n(p.values.earlyWinner) !== 0);
      if (teamMode) {
        if (
          input.playerCount !== 4 ||
          input.players.length !== 4 ||
          input.players.some((p) => ![1, 2].includes(n(p.values.teamSeat)))
        )
          return fail('Cloudspire đội cần 4 người, mỗi người chọn đội 1 hoặc 2.');
        for (const p of input.players) p.team = `team-${n(p.values.teamSeat)}`;
        if (
          [1, 2].some(
            (team) => input.players.filter((p) => n(p.values.teamSeat) === team).length !== 2,
          )
        )
          return fail('Mỗi đội phải có đúng hai người.');
        result.template = { ...template, mode: 'team', tiebreakers: [], sharedVictoryOnTie: false };
        if (early.length) {
          const winning = new Set(early.map((p) => p.team));
          if (
            winning.size !== 1 ||
            !input.players.some((p) => p.team !== early[0]?.team && n(p.values.gateDefeated) !== 0)
          )
            return fail('Thắng đội sớm cần cổng đối thủ đã bị hạ và chỉ một đội thắng.');
          input.winners = input.players.filter((p) => p.team === early[0]?.team).map((p) => p.id);
        } else if (input.players.some((p) => n(p.values.gateDefeated) !== 0))
          return fail('Trong chế độ đội, hạ bất kỳ cổng nào kết thúc ngay; chọn đội thắng.');
        else {
          const power = (team: number) =>
            input.players
              .filter((p) => n(p.values.teamSeat) === team)
              .reduce((sum, p) => sum + n(p.values.gateHealth) + n(p.values.advancements), 0);
          if (power(1) === power(2))
            return fail(
              'Cloudspire: hai đội hòa sức mạnh pháo đài; chưa xác minh luật phân hòa đội, chưa thể chốt kết quả.',
            );
        }
      } else {
        for (const p of input.players) delete p.team;
        if (early.length) {
          if (
            early.length !== 1 ||
            input.players.some((p) => p.id !== early[0]?.id && n(p.values.gateDefeated) === 0) ||
            n(early[0]?.values.gateDefeated) !== 0
          )
            return fail('Thắng sớm cá nhân chỉ khi duy nhất một cổng còn lại.');
          input.winners = [early[0]!.id];
        }
      }
      break;
    }
    case 'zoo-tycoon': {
      if (input.playerCount < 2 || input.playerCount > 4)
        return fail('Zoo Tycoon hỗ trợ cạnh tranh 2–4 người; solo/co-op chưa xác minh.');
      const shores = setup('newShores') !== 0;
      const active = input.players.filter((p) => n(p.values.eliminated) === 0);
      result.excludedIds = input.players
        .filter((p) => n(p.values.eliminated) !== 0)
        .map((p) => p.id);
      const qOf = (p: (typeof input.players)[number]) => record(p.values.endQuantities);
      const welfare = (p: (typeof input.players)[number]) =>
        2 * (qOf(p).darkGreenSpecies ?? 0) - (qOf(p).yellowSpecies ?? 0);
      const award = (value: number, values: number[], first: number, second: number): number => {
        const ahead = values.filter((v) => v > value).length;
        return ahead === 0 ? first : ahead === 1 ? second : 0;
      };
      for (const p of input.players) {
        const q = qOf(p);
        if (
          Object.entries(q).some(
            ([key, value]) =>
              !Number.isInteger(value) || (!key.startsWith('building') && value < 0),
          ) ||
          (q.equalTrackFirst ?? 0) > 1 ||
          (q.breedingTrack ?? 0) > 10
        )
          return fail(
            'Số lượng Zoo phải là số nguyên hợp lệ; chương trình sinh sản 0–10, lựa chọn đường 0/1.',
          );
        if (shores && ((q.vivariumSections ?? 0) > 3 || (q.vivariumSections ?? 0) < 0))
          return fail('Vivarium có tối đa ba khu đầy.');
        if (!shores && ((q.enclosureEggs ?? 0) !== 0 || (q.vivariumSections ?? 0) !== 0))
          return fail('Chọn New Shores để tính trứng bò sát và Vivarium.');
        let popularity =
          (q.popularity ?? 0) -
          (q.offspring ?? 0) -
          (shores ? (q.enclosureEggs ?? 0) : 0) +
          (shores ? (q.vivariumSections ?? 0) : 0);
        let conservation = (q.conservation ?? 0) + (q.parkPoints ?? 0);
        if (active.includes(p)) {
          const breeding = q.breedingTrack ?? 0;
          const tracks = active.map((x) => qOf(x).breedingTrack ?? 0);
          let breedingAward = award(breeding, tracks, 8, 4);
          if (
            input.playerCount === 2 &&
            breedingAward === 4 &&
            Math.floor((breeding - 1) / 5) !== Math.floor((Math.max(...tracks) - 1) / 5)
          )
            breedingAward = 0;
          conservation += breedingAward;
          const score = welfare(p);
          const points =
            score < -1
              ? -2
              : score < 1
                ? 0
                : award(score, active.map(welfare), 5, input.playerCount === 2 ? 0 : 3);
          let nextPopularity = (q.equalTrackFirst ?? 0) === 0;
          let alternating = popularity === conservation;
          for (let i = 0; i < Math.abs(points); i++) {
            if (alternating) {
              if (nextPopularity) popularity += Math.sign(points);
              else conservation += Math.sign(points);
              nextPopularity = !nextPopularity;
            } else {
              if (popularity < conservation) popularity += Math.sign(points);
              else conservation += Math.sign(points);
              if (popularity === conservation) alternating = true;
            }
          }
        }
        p.values.popularity = popularity + (q.buildingPopularity ?? 0);
        p.values.conservation = conservation + (q.buildingConservation ?? 0);
      }
      break;
    }
  }
  return result;
}
