import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  clubLiveDayDataSchema,
  clubLiveDayResponseSchema,
  clubLiveGameSchema,
  clubLiveGamesDataSchema,
  clubLiveGamesResponseSchema,
  clubLiveHistoryDatesDataSchema,
  clubLiveHistoryDatesResponseSchema,
  clubLiveMemberSchema,
  clubLiveMembersDataSchema,
  clubLiveMembersResponseSchema,
  clubLiveSeatSchema,
  clubLiveTableSchema,
} from './club-live.js';

const sensitiveFields = {
  loginId: 'private-login-id',
  secretId: 'private-secret-id',
  digest: 'private-digest',
  email: 'private@example.test',
  realName: 'Private Name',
};

const withSensitiveFields = (fields: Record<string, unknown>) => ({
  ...sensitiveFields,
  ...fields,
});

function expectNoSensitiveFields(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(expectNoSensitiveFields);
    return;
  }
  if (typeof value !== 'object' || value === null) return;

  for (const key of Object.keys(sensitiveFields)) {
    expect(value).not.toHaveProperty(key);
  }
  Object.values(value).forEach(expectNoSensitiveFields);
}

const seat = withSensitiveFields({
  kind: 'member',
  externalMemberId: 'member-1',
  displayName: 'Player One',
});
const guestSeat = withSensitiveFields({
  kind: 'guest',
  externalId: 'guest-1',
  invitedByExternalMemberId: 'member-1',
  displayName: 'Guest One',
});
const table = withSensitiveFields({
  tableId: '00000000-0000-4000-8000-000000000001',
  externalId: 'table-1',
  hostName: 'Player One',
  hasOpenPlay: true,
  gameExternalId: 'game-1',
  gameName: 'Board game',
  note: null,
  startsAt: null,
  endsAt: null,
  minPlayers: 2,
  maxPlayers: 4,
  seats: [seat, guestSeat],
  status: 'confirmed',
});
const dayData = withSensitiveFields({
  date: '2026-10-21',
  venue: 'Community hall',
  note: null,
  tables: [table],
  externalUrl: null,
});
const member = withSensitiveFields({ externalId: 'member-1', nickname: 'Player One' });
const membersData = withSensitiveFields({ items: [member] });
const game = withSensitiveFields({
  externalId: 'game-1',
  name: 'Board game',
  year: 2020,
  minPlayers: 2,
  maxPlayers: 4,
  playMinutes: 60,
  bggId: 12345,
  owners: [withSensitiveFields({ externalMemberId: 'member-1' })],
  expansions: [withSensitiveFields({ externalId: 'expansion-1', name: 'Expansion' })],
});
const gamesData = withSensitiveFields({ items: [game] });
const historyDatesData = withSensitiveFields({ dates: ['2026-10-21'] });
const responseMetadata = { stale: false, lastSuccessAt: null };

const cases: Array<{
  name: string;
  schema: ZodType;
  payload: unknown;
  expected: Record<string, unknown>;
}> = [
  {
    name: 'clubLiveSeatSchema',
    schema: clubLiveSeatSchema,
    payload: seat,
    expected: { kind: 'member', externalMemberId: 'member-1' },
  },
  {
    name: 'clubLiveTableSchema',
    schema: clubLiveTableSchema,
    payload: table,
    expected: {
      tableId: '00000000-0000-4000-8000-000000000001',
      externalId: 'table-1',
      hostName: 'Player One',
      hasOpenPlay: true,
      seats: [
        { externalMemberId: 'member-1', displayName: 'Player One' },
        { externalId: 'guest-1', displayName: 'Guest One' },
      ],
    },
  },
  {
    name: 'clubLiveDayDataSchema',
    schema: clubLiveDayDataSchema,
    payload: dayData,
    expected: {
      date: '2026-10-21',
      tables: [
        {
          tableId: '00000000-0000-4000-8000-000000000001',
          hostName: 'Player One',
          hasOpenPlay: true,
          externalId: 'table-1',
          seats: [
            { kind: 'member', displayName: 'Player One' },
            { kind: 'guest', displayName: 'Guest One' },
          ],
        },
      ],
    },
  },
  {
    name: 'clubLiveMemberSchema',
    schema: clubLiveMemberSchema,
    payload: member,
    expected: { externalId: 'member-1', nickname: 'Player One' },
  },
  {
    name: 'clubLiveMembersDataSchema',
    schema: clubLiveMembersDataSchema,
    payload: membersData,
    expected: { items: [{ externalId: 'member-1', nickname: 'Player One' }] },
  },
  {
    name: 'clubLiveGameSchema',
    schema: clubLiveGameSchema,
    payload: game,
    expected: { externalId: 'game-1', name: 'Board game', owners: [{ externalMemberId: 'member-1' }] },
  },
  {
    name: 'clubLiveGamesDataSchema',
    schema: clubLiveGamesDataSchema,
    payload: gamesData,
    expected: { items: [{ externalId: 'game-1', name: 'Board game' }] },
  },
  {
    name: 'clubLiveHistoryDatesDataSchema',
    schema: clubLiveHistoryDatesDataSchema,
    payload: historyDatesData,
    expected: { dates: ['2026-10-21'] },
  },
  {
    name: 'clubLiveDayResponseSchema',
    schema: clubLiveDayResponseSchema,
    payload: withSensitiveFields({ data: dayData, ...responseMetadata }),
    expected: { data: { date: '2026-10-21', tables: [{ externalId: 'table-1' }] }, stale: false },
  },
  {
    name: 'clubLiveMembersResponseSchema',
    schema: clubLiveMembersResponseSchema,
    payload: withSensitiveFields({ data: membersData, ...responseMetadata }),
    expected: { data: { items: [{ externalId: 'member-1' }] }, stale: false },
  },
  {
    name: 'clubLiveGamesResponseSchema',
    schema: clubLiveGamesResponseSchema,
    payload: withSensitiveFields({ data: gamesData, ...responseMetadata }),
    expected: { data: { items: [{ externalId: 'game-1' }] }, stale: false },
  },
  {
    name: 'clubLiveHistoryDatesResponseSchema',
    schema: clubLiveHistoryDatesResponseSchema,
    payload: withSensitiveFields({ data: historyDatesData, ...responseMetadata }),
    expected: { data: { dates: ['2026-10-21'] }, stale: false },
  },
];

describe('club live DTO schemas', () => {
  it.each(cases)('$name strips sensitive fields and retains public fields', ({ schema, payload, expected }) => {
    const parsed = schema.parse(payload);

    expectNoSensitiveFields(parsed);
    expect(parsed).toMatchObject(expected);
  });
});
