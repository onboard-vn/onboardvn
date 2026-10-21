import type { PlayDto } from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import {
  canStartNewPlay,
  isReadOnlyPlayViewer,
  readOnlyPlayHint,
  scoreInputState,
  scoreSheetAccessForPlay,
  shouldUseLegacyTableScoreSheet,
} from './readonly-play';
import { resolveSheetAccess } from './use-sheet';

const base = {
  status: 'draft',
  canEdit: true,
  canManage: false,
  editableIdentityIds: ['identity-own'],
} satisfies Pick<PlayDto, 'status' | 'canEdit' | 'canManage' | 'editableIdentityIds'>;

describe('read-only play access', () => {
  it('disables a row the API does not list as editable', () => {
    expect(scoreInputState(base, 'identity-other')).toEqual({
      disabled: true,
      accessibilityState: { disabled: true },
    });
  });

  it('allows an editable identity and lets the host edit every row', () => {
    expect(scoreInputState(base, 'identity-own').disabled).toBe(false);
    expect(
      scoreInputState({ ...base, canManage: true, editableIdentityIds: [] }, 'identity-other')
        .disabled,
    ).toBe(false);
  });

  it('identifies a viewer with no editable rows', () => {
    expect(
      isReadOnlyPlayViewer({ ...base, canEdit: false, editableIdentityIds: [] }),
    ).toBe(true);
    expect(isReadOnlyPlayViewer(base)).toBe(false);
  });

  it('carries row and manager permissions through the unsupported-template fallback', () => {
    expect(shouldUseLegacyTableScoreSheet(base, false)).toBe(true);
    const inherited = scoreSheetAccessForPlay(base);
    const access = resolveSheetAccess({}, inherited);

    expect(access).toEqual(inherited);
    expect(access.canManage).toBe(false);
    expect(scoreInputState({ ...base, ...access }, 'identity-other').disabled).toBe(true);
    expect(scoreInputState({ ...base, ...access }, 'identity-own').disabled).toBe(false);
  });

  it('treats a final play as read-only for everyone and reports its final state', () => {
    const finalPlay = { ...base, status: 'final' } satisfies Pick<
      PlayDto,
      'status' | 'canEdit' | 'canManage' | 'editableIdentityIds'
    >;

    expect(scoreInputState(finalPlay, 'identity-own').disabled).toBe(true);
    expect(shouldUseLegacyTableScoreSheet(finalPlay, true)).toBe(true);
    expect(isReadOnlyPlayViewer(finalPlay)).toBe(true);
    expect(readOnlyPlayHint(finalPlay)).toBe('Ván đã kết thúc');
    expect(scoreSheetAccessForPlay(finalPlay).canEdit).toBe(false);
  });

  it('allows only the host to start a new play from final results', () => {
    const finalHostPlay = { ...base, status: 'final', canManage: true } satisfies Pick<
      PlayDto,
      'status' | 'canEdit' | 'canManage' | 'editableIdentityIds'
    >;
    const finalViewerPlay = { ...base, status: 'final' } satisfies Pick<
      PlayDto,
      'status' | 'canEdit' | 'canManage' | 'editableIdentityIds'
    >;

    expect(canStartNewPlay(finalHostPlay)).toBe(true);
    expect(canStartNewPlay(finalViewerPlay)).toBe(false);
    expect(canStartNewPlay(base)).toBe(false);
    expect(scoreInputState(finalHostPlay, 'identity-own').disabled).toBe(true);
  });
});
