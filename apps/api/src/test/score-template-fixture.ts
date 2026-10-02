import type { ScoreTemplate } from '@onboard/shared';

export const scoreTemplateFixture = (over: Partial<ScoreTemplate> = {}): ScoreTemplate => ({
  slug: 't',
  name: 'T',
  templateVersion: 1,
  mode: 'competitive',
  winRule: 'highest',
  categories: [
    {
      key: 'coins',
      label: 'Coins',
      scope: 'player',
      input: 'count',
      formula: { type: 'expr', expr: 'floor(value / 3)' },
      countsToTotal: true,
    },
    {
      key: 'rounds',
      label: 'Rounds',
      scope: 'player',
      input: 'perRound',
      formula: { type: 'sum' },
      countsToTotal: true,
    },
  ],
  sources: [{ url: 'https://example.com', title: 'x', type: 'other' }],
  confidence: 'high',
  ...over,
});
