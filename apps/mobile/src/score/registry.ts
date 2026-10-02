import type { ComponentType } from 'react';
import type { SheetApi } from './use-sheet';
import { AcquireInput } from './custom/acquire-input';
import { GrandAustriaInput } from './custom/grand-austria-input';

export type ScoreInputComponent = ComponentType<{ sheet: SheetApi }>;

export const scoreInputRegistry: Record<string, ScoreInputComponent> = {
  'acquire-1963': AcquireInput,
  'grand-austria-hotel-deluxe': GrandAustriaInput,
};
