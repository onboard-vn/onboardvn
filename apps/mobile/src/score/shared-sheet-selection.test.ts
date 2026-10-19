import { describe, expect, it } from 'vitest';
import type { ScoreTemplate } from '@onboard/shared';
import { usesSharedScoreSheet } from './shared-sheet-selection';
const guides = {
  guided: {
    edition: 'Base',
    summary: 'Guide',
    groups: [],
    minTemplateVersion: 3,
    requiredKeys: ['quantity'],
  },
};
const template = (slug: string, version: number, keys: string[]) =>
  ({ slug, templateVersion: version, categories: keys.map((key) => ({ key })) }) as ScoreTemplate;
describe('shared score screen selection', () => {
  it('keeps older pinned templates and unrelated games on the legacy screen', () => {
    expect(usesSharedScoreSheet(template('guided', 2, ['quantity']), guides)).toBe(false);
    expect(usesSharedScoreSheet(template('unrelated', 3, ['quantity']), guides)).toBe(false);
    expect(usesSharedScoreSheet(null, guides)).toBe(false);
  });
  it('requires the versioned guide contract or Critter meal schema', () => {
    expect(usesSharedScoreSheet(template('guided', 3, ['quantity']), guides)).toBe(true);
    expect(usesSharedScoreSheet(template('guided', 3, []), guides)).toBe(false);
    expect(usesSharedScoreSheet(template('critter-kitchen', 3, ['meal']), guides)).toBe(true);
    expect(usesSharedScoreSheet(template('critter-kitchen', 2, ['meal']), guides)).toBe(false);
  });
});
