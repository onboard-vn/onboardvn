import type {
  ClubLiveDayData,
  ClubLiveDayResponse,
  ClubLiveGamesData,
  ClubLiveGamesResponse,
  ClubLiveHistoryDatesData,
  ClubLiveHistoryDatesResponse,
  ClubLiveMembersData,
  ClubLiveMembersResponse,
} from '@onboard/shared';
import type { LiveReader, LiveResult } from '../../integrations/external-club/live-types.js';
import { ApiError } from '../../lib/errors.js';
import { requireClubMemberOr404 } from './member-guard.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLUB_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export async function requireClubLiveMember(
  clubId: string,
  userId: string | null | undefined,
): Promise<void> {
  try {
    await requireClubMemberOr404(clubId, userId);
  } catch (error) {
    const cause =
      error && typeof error === 'object' && 'cause' in error ? error.cause : error;
    if (cause && typeof cause === 'object' && 'code' in cause && cause.code === '22P02') {
      throw new ApiError('NOT_FOUND', 404, 'Không tìm thấy club');
    }
    throw error;
  }
}

function isCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function clubToday(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: CLUB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setTime(date.getTime() + days * DAY_MS);
  return date.toISOString().slice(0, 10);
}

export function validateClubLiveDate(value: string): void {
  if (!isCalendarDate(value)) {
    throw new ApiError('BAD_REQUEST', 400, 'Ngày không hợp lệ');
  }

  const today = clubToday();
  if (value < shiftDate(today, -120) || value > shiftDate(today, 30)) {
    throw new ApiError('BAD_REQUEST', 400, 'Ngày nằm ngoài khoảng cho phép');
  }
}

async function readOrUnavailable<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch {
    throw new ApiError('INTERNAL', 503, 'Dữ liệu club tạm thời không khả dụng');
  }
}

function mapDay(
  result: LiveResult<ClubLiveDayData>,
  date: string,
  externalBaseUrl: string | null | undefined,
): ClubLiveDayResponse {
  const baseUrl = externalBaseUrl?.replace(/\/+$/, '');
  return {
    data: {
      date: result.data.date,
      venue: result.data.venue,
      note: result.data.note,
      tables: result.data.tables.map((table) => ({
        tableId: table.tableId,
        externalId: table.externalId,
        hostName: table.hostName,
        hasOpenPlay: table.hasOpenPlay,
        gameExternalId: table.gameExternalId,
        gameName: table.gameName,
        note: table.note,
        startsAt: table.startsAt,
        endsAt: table.endsAt,
        minPlayers: table.minPlayers,
        maxPlayers: table.maxPlayers,
        seats: table.seats.map((seat) =>
          seat.kind === 'member'
            ? {
                kind: 'member',
                externalMemberId: seat.externalMemberId,
                displayName: seat.displayName,
              }
            : {
                kind: 'guest',
                externalId: seat.externalId,
                invitedByExternalMemberId: seat.invitedByExternalMemberId,
                displayName: seat.displayName,
              },
        ),
        status: table.status,
      })),
      externalUrl: baseUrl ? `${baseUrl}/day/${date}` : null,
    },
    stale: result.stale,
    lastSuccessAt: result.lastSuccessAt,
  };
}

function mapMembers(result: LiveResult<ClubLiveMembersData>): ClubLiveMembersResponse {
  return {
    data: {
      items: result.data.items.map((member) => ({
        externalId: member.externalId,
        nickname: member.nickname,
      })),
    },
    stale: result.stale,
    lastSuccessAt: result.lastSuccessAt,
  };
}

function mapGames(result: LiveResult<ClubLiveGamesData>): ClubLiveGamesResponse {
  return {
    data: {
      items: result.data.items.map((game) => ({
        externalId: game.externalId,
        name: game.name,
        year: game.year,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playMinutes: game.playMinutes,
        bggId: game.bggId,
        owners: game.owners.map((owner) => ({ externalMemberId: owner.externalMemberId })),
        expansions: game.expansions.map((expansion) => ({
          externalId: expansion.externalId,
          name: expansion.name,
        })),
      })),
    },
    stale: result.stale,
    lastSuccessAt: result.lastSuccessAt,
  };
}

function mapHistoryDates(
  result: LiveResult<ClubLiveHistoryDatesData>,
): ClubLiveHistoryDatesResponse {
  return {
    data: { dates: result.data.dates.map((date) => date) },
    stale: result.stale,
    lastSuccessAt: result.lastSuccessAt,
  };
}

export async function readClubLiveDayService(
  reader: LiveReader,
  clubId: string,
  date: string,
  externalBaseUrl: string | null | undefined,
): Promise<ClubLiveDayResponse> {
  const result = await readOrUnavailable(() => reader.readDay(clubId, date));
  return mapDay(result, date, externalBaseUrl);
}

export async function readClubLiveMembersService(
  reader: LiveReader,
  clubId: string,
): Promise<ClubLiveMembersResponse> {
  const result = await readOrUnavailable(() => reader.readMembers(clubId));
  return mapMembers(result);
}

export async function readClubLiveGamesService(
  reader: LiveReader,
  clubId: string,
): Promise<ClubLiveGamesResponse> {
  const result = await readOrUnavailable(() => reader.readGames(clubId));
  return mapGames(result);
}

export async function readClubLiveHistoryService(
  reader: LiveReader,
  clubId: string,
): Promise<ClubLiveHistoryDatesResponse> {
  const result = await readOrUnavailable(() => reader.readHistoryDates(clubId));
  return mapHistoryDates(result);
}
