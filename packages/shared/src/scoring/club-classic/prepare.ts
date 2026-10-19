import type { ScoreInput, RawValue } from '../compute.js';
import type { ScoreTemplate } from '../template-schema.js';
import type { GameScorePreparation } from '../game-score-types.js';
const chains = ['tower', 'luxor', 'american', 'festival', 'worldwide', 'imperial', 'continental'];
const record = (v: RawValue | undefined): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};
export function prepareClassicScoring(
  template: ScoreTemplate,
  input: ScoreInput,
): GameScorePreparation | null {
  if (
    template.slug === 'the-gang-2024' &&
    template.templateVersion >= 3 &&
    template.categories.some((c) => c.key === 'heistsSucceeded')
  ) {
    input = { ...input };
    delete input.winners;
    const heists = input.players
      .map((p) => p.values.heists)
      .find((value) => Array.isArray(value) && value.length > 0);
    if (Array.isArray(heists)) {
      if (heists.some((value) => value !== 0 && value !== 1) || heists.length > 5)
        return {
          template,
          input,
          error: 'The Gang: mỗi phi vụ chỉ nhận thành công (1) hoặc thất bại (0), tối đa 5 phi vụ.',
        };
      const succeeded = heists.filter((value) => value === 1).length;
      const failed = heists.length - succeeded;
      const conflict = input.players.some(
        (p) =>
          (p.values.heistsSucceeded !== undefined &&
            Number(p.values.heistsSucceeded) !== succeeded) ||
          (p.values.heistsFailed !== undefined && Number(p.values.heistsFailed) !== failed),
      );
      if (conflict)
        return {
          template,
          input,
          error: 'The Gang: dùng danh sách phi vụ hoặc tổng số, không nhập hai kết quả khác nhau.',
        };
      input = {
        ...input,
        players: input.players.map((p) => ({
          ...p,
          values: { ...p.values, heistsSucceeded: succeeded, heistsFailed: failed },
        })),
      };
    }
    const values = input.players.find(
      (p) => p.values.heistsSucceeded !== undefined || p.values.heistsFailed !== undefined,
    )?.values;
    const manual = input.players.some(
      (p) => p.values.manualResult === true || p.values.manualResult === 1,
    );
    if (
      !values ||
      (manual &&
        Number(values.heistsSucceeded ?? 0) === 0 &&
        Number(values.heistsFailed ?? 0) === 0)
    ) {
      return manual && input.outcome
        ? { template, input }
        : {
            template,
            input,
            error: 'The Gang: nhập số phi vụ hoặc chọn kết quả nhanh và xác nhận Thắng/Thua.',
          };
    }
    const success = Number(values.heistsSucceeded ?? 0),
      failed = Number(values.heistsFailed ?? 0);
    const valid =
      Number.isInteger(success) &&
      Number.isInteger(failed) &&
      success >= 0 &&
      failed >= 0 &&
      ((success === 3 && failed < 3) || (failed === 3 && success < 3));
    const outcome = success === 3 ? 'win' : 'loss';
    if (!valid || (input.outcome && input.outcome !== outcome))
      return {
        template,
        input,
        error: 'The Gang: cần đúng 3 phi vụ thành công hoặc 3 thất bại, khớp kết quả cả đội.',
      };
    return { template, input: { ...input, outcome } };
  }
  if (
    template.slug !== 'acquire-1963' ||
    template.templateVersion < 3 ||
    !['chainPrices', 'chainShares', 'marketShares'].every((key) =>
      template.categories.some((c) => c.key === key),
    )
  )
    return null;
  const prices = record(
    input.players.find((p) => p.values.chainPrices !== undefined)?.values.chainPrices,
  );
  const market = record(
    input.players.find((p) => p.values.marketShares !== undefined)?.values.marketShares,
  );
  const players: ScoreInput['players'] = input.players.map((p) => ({
    ...p,
    values: { ...p.values, endBonuses: 0, stockSales: 0 },
  }));
  for (const key of chains) {
    const price = prices[key] ?? 0;
    if (!Number.isInteger(price) || price < 0)
      return { template, input, error: 'Acquire: giá cổ phiếu không hợp lệ.' };
    const holders = players.map((p) => ({ id: p.id, n: record(p.values.chainShares)[key] ?? 0 }));
    if (input.playerCount === 2 && price > 0) {
      if (market[key] === undefined)
        return {
          template,
          input,
          error: 'Acquire 2 người: nhập cổ phần thị trường đã rút cho từng chuỗi đang hoạt động.',
        };
      holders.push({ id: '__bank_market', n: market[key] ?? 0 });
    }
    if (holders.some((h) => !Number.isInteger(h.n) || h.n < 0 || h.n > 25))
      return { template, input, error: 'Acquire: cổ phần phải là số nguyên từ 0 đến 25.' };
    if (!price) continue;
    const ranked = holders.filter((h) => h.n > 0).sort((a, b) => b.n - a.n);
    const first = ranked[0];
    if (!first) continue;
    const payout: Record<string, number> = {};
    const top = ranked.filter((h) => h.n === first.n);
    if (ranked.length === 1) payout[first.id] = price * 15;
    else if (top.length > 1)
      for (const h of top) payout[h.id] = Math.ceil((price * 15) / top.length / 100) * 100;
    else {
      payout[first.id] = price * 10;
      const second = ranked[1]!;
      const tied = ranked.filter((h) => h.n === second.n);
      for (const h of tied) payout[h.id] = Math.ceil((price * 5) / tied.length / 100) * 100;
    }
    for (const p of players) {
      p.values.endBonuses = Number(p.values.endBonuses) + (payout[p.id] ?? 0);
      p.values.stockSales =
        Number(p.values.stockSales) + price * (record(p.values.chainShares)[key] ?? 0);
    }
  }
  return { template, input: { ...input, players } };
}
