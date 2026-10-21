export function buildClubJoinRequest(code: string, clubId?: string) {
  const externalId = clubId?.trim();
  return {
    path: `/clubs/join/${encodeURIComponent(code)}`,
    body: externalId ? { externalId } : {},
  };
}
