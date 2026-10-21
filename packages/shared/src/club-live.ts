import { z } from 'zod';

const externalIdSchema = z.string().min(1);
const historyDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const playerCountSchema = z.number().int().nonnegative();

export const clubLiveSeatSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('member'),
    externalMemberId: externalIdSchema,
    displayName: z.string(),
  }),
  z.object({
    kind: z.literal('guest'),
    externalId: externalIdSchema,
    invitedByExternalMemberId: externalIdSchema,
    displayName: z.string(),
  }),
]);
export type ClubLiveSeat = z.infer<typeof clubLiveSeatSchema>;

export const clubLiveTableSchema = z.object({
  tableId: z.uuid(),
  externalId: externalIdSchema,
  hostName: z.string().nullable(),
  hasOpenPlay: z.boolean(),
  gameExternalId: externalIdSchema.nullable(),
  gameName: z.string(),
  note: z.string().nullable(),
  startsAt: z.iso.datetime({ offset: true }).nullable(),
  endsAt: z.iso.datetime({ offset: true }).nullable(),
  minPlayers: playerCountSchema.nullable(),
  maxPlayers: playerCountSchema.nullable(),
  seats: z.array(clubLiveSeatSchema),
  status: z.enum(['confirmed', 'poll']),
});
export type ClubLiveTable = z.infer<typeof clubLiveTableSchema>;

export const clubLiveDayDataSchema = z.object({
  date: historyDateSchema,
  venue: z.string().nullable(),
  note: z.string().nullable(),
  tables: z.array(clubLiveTableSchema),
  externalUrl: z.string().nullable(),
});
export type ClubLiveDayData = z.infer<typeof clubLiveDayDataSchema>;

export const clubLiveMemberSchema = z.object({
  externalId: externalIdSchema,
  nickname: z.string().min(1),
});
export type ClubLiveMember = z.infer<typeof clubLiveMemberSchema>;

export const clubLiveMembersDataSchema = z.object({ items: z.array(clubLiveMemberSchema) });
export type ClubLiveMembersData = z.infer<typeof clubLiveMembersDataSchema>;

export const clubLiveGameSchema = z.object({
  externalId: externalIdSchema,
  name: z.string().min(1),
  year: z.number().int().nullable().optional(),
  minPlayers: playerCountSchema.nullable().optional(),
  maxPlayers: playerCountSchema.nullable().optional(),
  playMinutes: playerCountSchema.nullable().optional(),
  bggId: z.number().int().positive().nullable().optional(),
  owners: z.array(z.object({ externalMemberId: externalIdSchema })),
  expansions: z.array(z.object({ externalId: externalIdSchema, name: z.string() })),
});
export type ClubLiveGame = z.infer<typeof clubLiveGameSchema>;

export const clubLiveGamesDataSchema = z.object({ items: z.array(clubLiveGameSchema) });
export type ClubLiveGamesData = z.infer<typeof clubLiveGamesDataSchema>;

export const clubLiveHistoryDatesDataSchema = z.object({ dates: z.array(historyDateSchema) });
export type ClubLiveHistoryDatesData = z.infer<typeof clubLiveHistoryDatesDataSchema>;

const liveResponse = <T extends z.ZodType>(data: T) =>
  z.object({
    data,
    stale: z.boolean(),
    lastSuccessAt: z.iso.datetime({ offset: true }).nullable(),
  });

export const clubLiveDayResponseSchema = liveResponse(clubLiveDayDataSchema);
export type ClubLiveDayResponse = z.infer<typeof clubLiveDayResponseSchema>;

export const clubLiveMembersResponseSchema = liveResponse(clubLiveMembersDataSchema);
export type ClubLiveMembersResponse = z.infer<typeof clubLiveMembersResponseSchema>;

export const clubLiveGamesResponseSchema = liveResponse(clubLiveGamesDataSchema);
export type ClubLiveGamesResponse = z.infer<typeof clubLiveGamesResponseSchema>;

export const clubLiveHistoryDatesResponseSchema = liveResponse(clubLiveHistoryDatesDataSchema);
export type ClubLiveHistoryDatesResponse = z.infer<typeof clubLiveHistoryDatesResponseSchema>;
