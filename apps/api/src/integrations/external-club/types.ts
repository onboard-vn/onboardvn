import { z } from 'zod';

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

export const externalMemberSchema = z.object({
  externalId: id,
  nickname: z.string().min(1),
  stats: z.record(z.string(), z.unknown()).default({}),
  loginId: id.optional(),
});

export const externalTableSchema = z.object({
  externalId: id,
  gameExternalId: id.nullish(),
  gameName: z.string(),
  note: z.string().nullish(),
  startsAt: isoTime.nullish(),
  endsAt: isoTime.nullish(),
  minPlayers: count.nullish(),
  maxPlayers: count.nullish(),
  players: z.array(z.object({ externalMemberId: id, loginId: id.optional() })),
  status: z.enum(['confirmed', 'poll']),
});

export const externalDaySchema = z.object({
  date: isoDate,
  venue: z.string().nullish(),
  note: z.string().nullish(),
  tables: z.array(externalTableSchema),
});

export type ExternalGame = z.infer<typeof externalGameSchema>;
export type ExternalMember = z.infer<typeof externalMemberSchema>;
export type ExternalTable = z.infer<typeof externalTableSchema>;
export type ExternalDay = z.infer<typeof externalDaySchema>;

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
}

export type ExternalClubSourceFactory = (options: {
  baseUrl: string;
}) => ExternalClubSource | Promise<ExternalClubSource>;
