export function canSubmitClubJoin(clubId: string, requiresClubId: boolean): boolean {
  return !requiresClubId || clubId.trim().length > 0;
}
