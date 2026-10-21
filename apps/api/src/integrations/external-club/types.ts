import { z } from 'zod';
import { digestLoginId } from '../../lib/login-digest.js';

const id = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoTime = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();

export const externalGameSchema = z.object({
  externalId: id,
  name: z.string().min(1),
  year: z.number().int().nullish(),
  minPlayers: count.nullish(),
  maxPlayers: count.nullish(),
  playMinutes: count.nullish(),
  bggId: z.number().int().positive().nullish(),
  owners: z.array(z.object({ externalMemberId: id })),
  expansions: z.array(z.object({ externalId: id, name: z.string() })),
});

export const externalMemberSchema = z
  .object({
    externalId: id,
    nickname: z.string().min(1),
    stats: z
      .object({
        gamesOwned: count.optional(),
        tablesHosted: count.optional(),
        bringingsMade: count.optional(),
        joinedAt: z.string().nullable().optional(),
      })
      .default({}),
    loginId: id.optional(),
  })
  .transform(({ loginId, ...member }) => ({
    ...member,
    ...(loginId === undefined ? {} : { loginDigest: digestLoginId(loginId) }),
  }));

const externalPlayerSchema = z
  .object({ externalMemberId: id, loginId: id.optional() })
  .transform(({ loginId, ...player }) => ({
    ...player,
    ...(loginId === undefined ? {} : { loginDigest: digestLoginId(loginId) }),
  }));

export const externalTableSchema = z.object({
  externalId: id,
  hostExternalMemberId: id.nullish(),
  gameExternalId: id.nullish(),
  gameName: z.string(),
  note: z.string().nullish(),
  startsAt: isoTime.nullish(),
  endsAt: isoTime.nullish(),
  minPlayers: count.nullish(),
  maxPlayers: count.nullish(),
  players: z.array(externalPlayerSchema),
  guests: z.array(z.object({ externalId: id, invitedByExternalMemberId: id })).optional(),
  status: z.enum(['confirmed', 'poll']),
});

export const externalDaySchema = z.object({
  date: isoDate,
  venue: z.string().nullish(),
  note: z.string().nullish(),
  tables: z.array(externalTableSchema),
});

export type ExternalGame = z.infer<typeof externalGameSchema>;
export type ExternalMemberInput = z.input<typeof externalMemberSchema>;
export type ExternalMember = z.output<typeof externalMemberSchema>;
export type ExternalTableInput = z.input<typeof externalTableSchema>;
export type ExternalTable = z.output<typeof externalTableSchema>;
export type ExternalDayInput = z.input<typeof externalDaySchema>;
export type ExternalDay = z.output<typeof externalDaySchema>;

export interface ExternalDayRange {
  from?: string;
  to?: string;
}

export interface ExternalClubSource {
  /** Stable key stored with every imported record; must never change for a given plugin. */
  readonly source: string;
  listGames(): Promise<ExternalGame[]>;
  listMembers(): Promise<ExternalMember[]>;
  listDays(range: ExternalDayRange): Promise<ExternalDay[]>;
  fetchDay?(date: string): Promise<ExternalDay | null>;
  fetchMembers?(): Promise<ExternalMember[]>;
  fetchGames?(): Promise<ExternalGame[]>;
  fetchHistoryDates?(): Promise<string[]>;
}

export interface ExternalClubPluginSource {
  /** Stable key stored with every imported record; must never change for a given plugin. */
  readonly source: string;
  listGames(): Promise<ExternalGame[]>;
  listMembers(): Promise<ExternalMemberInput[]>;
  listDays(range: ExternalDayRange): Promise<ExternalDayInput[]>;
  fetchDay?(date: string): Promise<ExternalDayInput | null>;
  fetchMembers?(): Promise<ExternalMemberInput[]>;
  fetchGames?(): Promise<ExternalGame[]>;
  fetchHistoryDates?(): Promise<string[]>;
}

export type ExternalClubSourceFactory = (options: {
  baseUrl: string;
}) => ExternalClubPluginSource | Promise<ExternalClubPluginSource>;
