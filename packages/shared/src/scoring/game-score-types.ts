import type { ScoreInput } from './compute.js';
import type { ScoreTemplate } from './template-schema.js';

/** Pure, in-memory preparation; original stored quantities and pinned definitions stay intact. */
export interface GameScorePreparation {
  template: ScoreTemplate;
  input: ScoreInput;
  excludedIds?: string[];
  warnings?: string[];
  error?: string;
}

/** Score contracts and inputs contain only JSON values; works in native JS runtimes too. */
export const cloneScoringValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
