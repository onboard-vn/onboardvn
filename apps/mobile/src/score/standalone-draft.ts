import type { ScoreTemplate } from '@onboard/shared';
import { initialState, type SheetState } from './model';

export interface StandaloneDraft {
  sessionId: string;
  templateSlug: string;
  templateVersion: number;
  updatedAt: string;
  state: SheetState;
}

export interface StandaloneStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}

type TemplateIdentity = Pick<ScoreTemplate, 'slug' | 'templateVersion'>;
export type DraftSaveStatus = 'saving' | 'saved' | 'error';

export const standaloneDraftKey = (template: TemplateIdentity) =>
  `onboard:standalone-score:v1:${template.slug}:${template.templateVersion}`;

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const numericRecord = (value: unknown): boolean =>
  record(value) && Object.values(value).every((v) => typeof v === 'number' && Number.isFinite(v));
const rawValue = (value: unknown): boolean =>
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value)) ||
  (Array.isArray(value) && value.every((v) => typeof v === 'number' && Number.isFinite(v))) ||
  numericRecord(value);
const valuesRecord = (value: unknown): boolean =>
  record(value) && Object.values(value).every(rawValue);

function validState(value: unknown): value is SheetState {
  if (!record(value) || !Array.isArray(value.players)) return false;
  const ids = new Set<string>();
  for (const player of value.players) {
    if (
      !record(player) ||
      typeof player.id !== 'string' ||
      !player.id ||
      typeof player.name !== 'string' ||
      ids.has(player.id)
    )
      return false;
    ids.add(player.id);
  }
  return (
    Number.isInteger(value.roundCount) &&
    Number(value.roundCount) >= 1 &&
    (value.mode === 'quick' || value.mode === 'detailed') &&
    Array.isArray(value.expansions) &&
    value.expansions.every((v) => typeof v === 'string') &&
    (value.outcome === null || value.outcome === 'win' || value.outcome === 'loss') &&
    record(value.values) &&
    Object.values(value.values).every(valuesRecord) &&
    valuesRecord(value.teamValues) &&
    numericRecord(value.quickTotals) &&
    record(value.rounds) &&
    Object.values(value.rounds).every(
      (v) => Array.isArray(v) && v.every((n) => typeof n === 'number' && Number.isFinite(n)),
    ) &&
    record(value.extras) &&
    Array.isArray(value.pendingOps)
  );
}

export function newStandaloneDraft(template: TemplateIdentity, sessionId: string): StandaloneDraft {
  return {
    sessionId,
    templateSlug: template.slug,
    templateVersion: template.templateVersion,
    updatedAt: new Date().toISOString(),
    state: initialState([]),
  };
}

export async function loadStandaloneDraft(
  storage: StandaloneStorage,
  template: TemplateIdentity,
): Promise<StandaloneDraft | null> {
  const raw = await storage.getItem(standaloneDraftKey(template));
  if (raw === null) return null;
  const draft: unknown = JSON.parse(raw);
  if (
    !record(draft) ||
    draft.templateSlug !== template.slug ||
    draft.templateVersion !== template.templateVersion ||
    typeof draft.sessionId !== 'string' ||
    !draft.sessionId ||
    typeof draft.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(draft.updatedAt)) ||
    !validState(draft.state)
  ) {
    throw new Error('Invalid standalone score draft');
  }
  // Standalone sheets do not send queued edits to a shared play.
  return { ...draft, state: { ...draft.state, pendingOps: [] } } as unknown as StandaloneDraft;
}

/** Serialize writes so a slow earlier save cannot replace a newer draft. */
export function createStandaloneSaver(
  storage: StandaloneStorage,
  draft: StandaloneDraft,
  onStatus: (status: DraftSaveStatus) => void,
) {
  let revision = 0;
  let tail: Promise<unknown> = Promise.resolve();
  return {
    save(state: SheetState) {
      const current = ++revision;
      const raw = JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
        state: { ...state, pendingOps: [] },
      });
      onStatus('saving');
      tail = tail
        .catch(() => undefined)
        .then(() =>
          storage.setItem(
            standaloneDraftKey({
              slug: draft.templateSlug,
              templateVersion: draft.templateVersion,
            }),
            raw,
          ),
        );
      void tail.then(
        () => current === revision && onStatus('saved'),
        () => current === revision && onStatus('error'),
      );
    },
    flush: () => tail,
  };
}
