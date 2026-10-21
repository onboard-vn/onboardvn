import { describe, expect, it } from 'vitest';
import type { ClubLiveGame, ClubLiveMember, ClubLiveSeat } from '@onboard/shared';
import {
  clubLiveDayHref,
  clubLiveOwnerNames,
  clubLiveRequestScope,
  clubLiveSeatLabels,
  clubLiveTableScoreHref,
  combineClubLiveFreshness,
  formatClubLiveDate,
  formatClubLiveGameDetails,
  formatClubLiveTableTime,
  newestFirstClubLiveDates,
  safeClubLiveExternalUrl,
} from './club-live-utils';

const members: ClubLiveMember[] = [
  { externalId: 'member-a', nickname: 'Meeple' },
  { externalId: 'member-b', nickname: 'Panda' },
];

describe('clubLiveRequestScope', () => {
  it('requires a signed-in user and a complete resource scope', () => {
    expect(clubLiveRequestScope(null, 'club-a')).toBeNull();
    expect(clubLiveRequestScope('user-a', 'club-a', '')).toBeNull();
  });

  it('isolates the same resource between signed-in users', () => {
    expect(clubLiveRequestScope('user-a', 'club-a', '2026-10-21')).not.toBe(
      clubLiveRequestScope('user-b', 'club-a', '2026-10-21'),
    );
    expect(clubLiveRequestScope('user-a', 'club-a')).toBe(
      clubLiveRequestScope('user-a', 'club-a'),
    );
  });
});

describe('clubLiveSeatLabels', () => {
  it('uses display names carried by the day DTO', () => {
    const seats: ClubLiveSeat[] = [
      { kind: 'member', externalMemberId: 'member-a', displayName: 'Meeple' },
      {
        kind: 'guest',
        externalId: 'guest-a',
        invitedByExternalMemberId: 'member-b',
        displayName: 'Khách của Panda',
      },
      { kind: 'member', externalMemberId: 'missing-member', displayName: 'Thành viên' },
    ];

    expect(clubLiveSeatLabels(seats)).toEqual(['Meeple', 'Khách của Panda', 'Thành viên']);
  });
});

describe('clubLiveOwnerNames', () => {
  it('resolves game owner refs to nicknames', () => {
    const game = {
      externalId: 'game-a',
      name: 'Game',
      owners: [{ externalMemberId: 'member-b' }],
      expansions: [],
    } satisfies ClubLiveGame;

    expect(clubLiveOwnerNames(game, members)).toEqual(['Panda']);
    expect(clubLiveOwnerNames(game, [])).toEqual(['Thành viên']);
  });
});

describe('combineClubLiveFreshness', () => {
  it('uses the oldest successful time among stale resources', () => {
    expect(
      combineClubLiveFreshness(
        { stale: true, lastSuccessAt: '2026-10-21T10:00:00.000Z' },
        { stale: false, lastSuccessAt: '2026-10-21T12:00:00.000Z' },
        { stale: true, lastSuccessAt: '2026-10-21T09:00:00.000Z' },
      ),
    ).toEqual({ stale: true, lastSuccessAt: '2026-10-21T09:00:00.000Z' });
  });

  it('keeps a fresh timestamp when no resource is stale', () => {
    expect(combineClubLiveFreshness({ stale: false, lastSuccessAt: '2026-10-21T12:00:00.000Z' }))
      .toEqual({ stale: false, lastSuccessAt: '2026-10-21T12:00:00.000Z' });
  });

  it('handles no responses and stale responses without a success timestamp', () => {
    expect(combineClubLiveFreshness()).toEqual({ stale: false, lastSuccessAt: null });
    expect(combineClubLiveFreshness({ stale: true, lastSuccessAt: null })).toEqual({
      stale: true,
      lastSuccessAt: null,
    });
  });

  it('keeps the combined time unknown when a stale resource has no timestamp', () => {
    expect(
      combineClubLiveFreshness(
        { stale: true, lastSuccessAt: '2026-10-21T09:00:00.000Z' },
        { stale: true, lastSuccessAt: null },
        { stale: false, lastSuccessAt: '2026-10-21T12:00:00.000Z' },
      ),
    ).toEqual({ stale: true, lastSuccessAt: null });
  });
});

describe('safeClubLiveExternalUrl', () => {
  it('allows absolute HTTP and HTTPS URLs', () => {
    expect(safeClubLiveExternalUrl('https://example.com/club')).toBe('https://example.com/club');
    expect(safeClubLiveExternalUrl('http://example.com/club')).toBe('http://example.com/club');
  });

  it('rejects other protocols, malformed URLs, and URLs without a host', () => {
    expect(safeClubLiveExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeClubLiveExternalUrl('file:///etc/passwd')).toBeNull();
    expect(safeClubLiveExternalUrl('https://')).toBeNull();
    expect(safeClubLiveExternalUrl(null)).toBeNull();
  });
});

describe('club live date and time formatting', () => {
  it('formats date keys as Vietnamese weekdays without timezone shifts', () => {
    expect(formatClubLiveDate('2026-10-21')).toBe('Thứ tư 21/10/2026');
    expect(formatClubLiveDate('not-a-date')).toBe('not-a-date');
    expect(formatClubLiveDate('2026-02-30')).toBe('2026-02-30');
  });

  it('formats a time range in Vietnam time and handles missing times', () => {
    expect(formatClubLiveTableTime('2026-10-21T02:00:00.000Z', '2026-10-21T04:30:00.000Z'))
      .toBe('09:00–11:30');
    expect(formatClubLiveTableTime(null, null)).toBe('Chưa có giờ');
    expect(formatClubLiveTableTime('2026-10-21T02:00:00.000Z', null)).toBe('Bắt đầu 09:00');
    expect(formatClubLiveTableTime(null, '2026-10-21T04:30:00.000Z')).toBe('Kết thúc 11:30');
  });

  it('formats available game details and sorts history dates newest first', () => {
    const game = {
      externalId: 'game-a',
      name: 'Game',
      year: 2024,
      minPlayers: 2,
      maxPlayers: 4,
      playMinutes: 45,
      owners: [],
      expansions: [],
    } satisfies ClubLiveGame;

    expect(formatClubLiveGameDetails(game)).toEqual(['2024', '2–4 người', '45 phút']);
    expect(
      formatClubLiveGameDetails({
        externalId: 'game-b',
        name: 'Another game',
        owners: [],
        expansions: [],
      }),
    ).toEqual([]);
    expect(newestFirstClubLiveDates(['2026-10-01', '2026-10-20', '2026-09-30'])).toEqual([
      '2026-10-20',
      '2026-10-01',
      '2026-09-30',
    ]);
    expect(clubLiveDayHref('demo club', 'club-id', '2026-10-21')).toBe(
      '/clubs/demo%20club/day/2026-10-21?clubId=club-id',
    );
    expect(clubLiveTableScoreHref('table/id')).toBe('/score/table/table%2Fid');
  });
});
