import type { PlayDto } from '@onboard/shared';

type PlayAccess = Pick<PlayDto, 'status' | 'canEdit' | 'canManage' | 'editableIdentityIds'>;

export interface ScoreInputState {
  disabled: boolean;
  accessibilityState: { disabled: boolean };
}

export interface ScoreSheetAccess {
  canEdit: boolean;
  canManage: boolean;
  editableIdentityIds: string[];
}

export function disabledScoreInputState(disabled: boolean): ScoreInputState {
  return { disabled, accessibilityState: { disabled } };
}

export function scoreInputState(play: PlayAccess, identityId: string): ScoreInputState {
  const editable =
    play.status === 'draft' &&
    play.canEdit &&
    (play.canManage || play.editableIdentityIds.includes(identityId));
  return disabledScoreInputState(!editable);
}

export function scoreSheetAccessForPlay(play: PlayAccess): ScoreSheetAccess {
  return {
    canEdit: play.status === 'draft' && play.canEdit,
    canManage: play.canManage,
    editableIdentityIds: play.editableIdentityIds,
  };
}

export function shouldUseLegacyTableScoreSheet(
  play: PlayAccess,
  supportsSharedScoreSheet: boolean,
): boolean {
  return play.status === 'final' || !supportsSharedScoreSheet;
}

export function canStartNewPlay(play: PlayAccess): boolean {
  return play.status === 'final' && play.canManage;
}

export function isReadOnlyPlayViewer(play: PlayAccess): boolean {
  return (
    play.status === 'final' ||
    (!play.canManage && (!play.canEdit || play.editableIdentityIds.length === 0))
  );
}

export function readOnlyPlayHint(play: PlayAccess): string | null {
  if (play.status === 'final') return 'Ván đã kết thúc';
  return isReadOnlyPlayViewer(play) ? 'Đang xem — chỉ chủ bàn và người chơi được sửa' : null;
}
