import type { ClubLiveGame, ClubLiveMember, ClubLiveSeat } from '@onboard/shared';
import { formatVnTime } from '../features/events/time';

type Freshness = { stale: boolean; lastSuccessAt: string | null };

const WEEKDAYS_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export function clubLiveRequestScope(
  userId: string | null | undefined,
  ...resourceParts: (string | null | undefined)[]
): string | null {
  if (!userId || resourceParts.some((part) => !part)) return null;
  return JSON.stringify([userId, ...resourceParts]);
}

export function clubLiveSeatLabels(seats: ClubLiveSeat[]): string[] {
  return seats.map((seat) => seat.displayName);
}

export function clubLiveOwnerNames(game: ClubLiveGame, members: ClubLiveMember[]): string[] {
  const nicknameById = new Map(members.map((member) => [member.externalId, member.nickname]));
  return game.owners.map((owner) => nicknameById.get(owner.externalMemberId) ?? 'Thành viên');
}

export function combineClubLiveFreshness(...responses: (Freshness | null | undefined)[]): Freshness {
  const available = responses.filter((response): response is Freshness => !!response);
  const staleResponses = available.filter((response) => response.stale);
  const source = staleResponses.length ? staleResponses : available;
  const timestamps = source.flatMap(({ lastSuccessAt }) =>
    lastSuccessAt === null ? [] : [lastSuccessAt],
  );
  const lastSuccessAt =
    timestamps.length !== source.length
      ? null
      : timestamps.sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null;

  return { stale: staleResponses.length > 0, lastSuccessAt };
}

export function safeClubLiveExternalUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !parsed.hostname) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function formatClubLiveDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;

  const [, year, month, day] = match;
  const dateValue = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    dateValue.getUTCFullYear() !== Number(year) ||
    dateValue.getUTCMonth() !== Number(month) - 1 ||
    dateValue.getUTCDate() !== Number(day)
  ) {
    return date;
  }

  const weekday = WEEKDAYS_VI[dateValue.getUTCDay()];
  return `${weekday} ${day}/${month}/${year}`;
}

export function formatClubLiveTableTime(startsAt: string | null, endsAt: string | null): string {
  if (startsAt && endsAt) return `${formatVnTime(startsAt)}–${formatVnTime(endsAt)}`;
  if (startsAt) return `Bắt đầu ${formatVnTime(startsAt)}`;
  if (endsAt) return `Kết thúc ${formatVnTime(endsAt)}`;
  return 'Chưa có giờ';
}

export function formatClubLiveGameDetails(game: ClubLiveGame): string[] {
  const details: string[] = [];
  if (game.year != null) details.push(String(game.year));
  if (game.minPlayers != null || game.maxPlayers != null) {
    const players =
      game.minPlayers != null && game.maxPlayers != null
        ? `${game.minPlayers}–${game.maxPlayers}`
        : String(game.minPlayers ?? game.maxPlayers);
    details.push(`${players} người`);
  }
  if (game.playMinutes != null) details.push(`${game.playMinutes} phút`);
  return details;
}

export function newestFirstClubLiveDates(dates: string[]): string[] {
  return [...dates].sort((left, right) => right.localeCompare(left));
}

export function clubLiveDayHref(slug: string, clubId: string, date: string): string {
  return `/clubs/${encodeURIComponent(slug)}/day/${encodeURIComponent(date)}?clubId=${encodeURIComponent(clubId)}`;
}

export function clubLiveTableScoreHref(tableId: string): string {
  return `/score/table/${encodeURIComponent(tableId)}`;
}
