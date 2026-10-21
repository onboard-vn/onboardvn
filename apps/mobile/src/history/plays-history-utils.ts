import type { MyPlayHistoryItemDto, PlayDto, PlayHistoryItemDto } from '@onboard/shared';

export function playHistoryErrorMessage(error: unknown): string {
  const status =
    error instanceof Error && 'status' in error && typeof error.status === 'number'
      ? error.status
      : null;

  return status === 401 || status === 403 || status === 404
    ? 'Không tìm thấy'
    : 'Không tải được. Thử lại';
}

export interface PlayHistoryRow {
  id: string;
  gameName: string;
  startedAt: string;
  winners: string[];
  playerCount: number;
  myTotal: number | null;
}

export interface PlayHistoryDetail {
  gameName: string;
  startedAt: string;
  players: { displayName: string; total: number | null; isWinner: boolean }[];
}

export function mapMyPlayHistoryItem(item: MyPlayHistoryItemDto): PlayHistoryRow {
  return {
    id: item.id,
    gameName: item.game.name,
    startedAt: item.startedAt,
    winners: item.winners.map((winner) => winner.displayName),
    playerCount: item.playerCount,
    myTotal: item.myComputed?.total ?? null,
  };
}

export function mapClubPlayHistoryItem(item: PlayHistoryItemDto): PlayHistoryRow {
  return {
    id: item.id,
    gameName: item.game.name,
    startedAt: item.startedAt,
    winners: item.winners.map((winner) => winner.displayName),
    playerCount: item.playerCount,
    myTotal: null,
  };
}

export function appendPlayHistoryPage<T extends { id: string }>(
  current: PlayHistoryRow[],
  page: { items: T[] },
  mapItem: (item: T) => PlayHistoryRow,
): PlayHistoryRow[] {
  const existing = new Set(current.map((item) => item.id));
  const next = page.items
    .map((item) => mapItem(item))
    .filter((item) => !existing.has(item.id));
  return [...current, ...next];
}

export function mapPlayHistoryDetail(play: PlayDto): PlayHistoryDetail {
  return {
    gameName: play.game.name,
    startedAt: play.startedAt,
    players: play.players
      .slice()
      .sort((left, right) => left.seat - right.seat)
      .map((player) => ({
        displayName: player.identity.displayName,
        total: player.computed?.total ?? null,
        isWinner: player.computed?.isWinner ?? false,
      })),
  };
}
