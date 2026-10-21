import type {
  MyPlayHistoryItemDto,
  MyPlaysResponse,
  PlayDto,
  PlayHistoryItemDto,
} from '@onboard/shared';
import { describe, expect, it } from 'vitest';
import {
  appendPlayHistoryPage,
  mapClubPlayHistoryItem,
  mapMyPlayHistoryItem,
  mapPlayHistoryDetail,
  playHistoryErrorMessage,
} from './plays-history-utils';

const winner = { identityId: 'identity-secret', displayName: 'Người chơi A', isGuest: false };

const personalItem: MyPlayHistoryItemDto = {
  id: 'play-1',
  game: { id: 'game-1', slug: 'game', name: 'Game mẫu' },
  clubId: 'club-1',
  status: 'final',
  startedAt: '2026-10-21T10:00:00.000Z',
  playerCount: 2,
  winners: [winner],
  myComputed: { categories: {}, total: 42, rank: 1, isWinner: true },
};

const clubItem: PlayHistoryItemDto = {
  ...personalItem,
  status: 'final',
};

describe('play history error classification', () => {
  it.each([401, 403, 404])('classifies a %i response as unavailable', (status) => {
    const error = Object.assign(new Error(`HTTP ${status}`), { status });

    expect(playHistoryErrorMessage(error)).toBe('Không tìm thấy');
  });

  it('keeps the retry message for other errors', () => {
    expect(playHistoryErrorMessage(new Error('network error'))).toBe('Không tải được. Thử lại');
  });
});

describe('play history mapping', () => {
  it('maps personal rows without keeping identity ids', () => {
    const row = mapMyPlayHistoryItem(personalItem);

    expect(row).toEqual({
      id: 'play-1',
      gameName: 'Game mẫu',
      startedAt: '2026-10-21T10:00:00.000Z',
      winners: ['Người chơi A'],
      playerCount: 2,
      myTotal: 42,
    });
    expect(row.winners).not.toContain(winner.identityId);
  });

  it('maps club rows without inventing a personal total', () => {
    expect(mapClubPlayHistoryItem(clubItem).myTotal).toBeNull();
  });

  it('appends cursor pages in server order and removes duplicate plays', () => {
    const page: MyPlaysResponse = {
      items: [personalItem, { ...personalItem, id: 'play-2' }],
      nextCursor: 'next-page',
    };
    const current = [mapMyPlayHistoryItem(personalItem)];

    expect(appendPlayHistoryPage(current, page, mapMyPlayHistoryItem).map((row) => row.id)).toEqual(
      ['play-1', 'play-2'],
    );
    expect(page.nextCursor).toBe('next-page');
  });

  it('maps play details to display values without exposing account ids', () => {
    const play = {
      id: 'play-1',
      createdBy: 'account-secret',
      game: personalItem.game,
      startedAt: personalItem.startedAt,
      players: [
        {
          identity: { id: winner.identityId, displayName: winner.displayName },
          seat: 1,
          computed: { total: 42, isWinner: true },
        },
      ],
    } as PlayDto;

    expect(mapPlayHistoryDetail(play)).toEqual({
      gameName: 'Game mẫu',
      startedAt: personalItem.startedAt,
      players: [{ displayName: 'Người chơi A', total: 42, isWinner: true }],
    });
    expect(mapPlayHistoryDetail(play)).not.toHaveProperty('createdBy');
  });
});
