import type { ScoreInput } from './compute.js';
import type { ScoreTemplate } from './template-schema.js';

export function prepareOrleansScoring(template: ScoreTemplate, input: ScoreInput) {
  if (template.slug !== 'orleans' || template.templateVersion < 2) return undefined;

  for (const { values } of input.players) {
    for (const category of template.categories) {
      const value = values[category.key];
      if (category.key === 'bonusCitizen' || value === undefined) continue;
      if (category.key === 'manualCitizenBonus') {
        if (typeof value !== 'boolean') return { error: 'Chọn lại cách tính thẻ Công dân thưởng.' };
      } else if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        value < (category.min ?? 0) ||
        (category.max != null && value > category.max)
      ) {
        return { error: `${category.labelVi}: nhập số nguyên trong phạm vi cho phép.` };
      }
    }
  }

  const stations = input.players.map(({ values }) => Number(values.tradingStations ?? 0));
  const mostStations = Math.max(...stations);
  const leaders = input.players.filter((_, index) => stations[index] === mostStations);
  const manual = input.players.some(({ values }) => values.manualCitizenBonus === true);
  const recipient =
    leaders.length === 1 && input.players.length >= 2 && !manual ? leaders[0] : null;

  return {
    input: {
      ...input,
      players: input.players.map((player) => ({
        ...player,
        values: { ...player.values, bonusCitizen: player === recipient ? 1 : 0 },
      })),
    },
  };
}
