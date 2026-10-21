import { z } from 'zod';
import type { IdentityDto } from './identities.js';

export const playStatusEnum = z.enum(['draft', 'final']);
export type PlayStatus = z.infer<typeof playStatusEnum>;

export const MAX_PLAY_PLAYERS = 20;
export const FREE_TOTAL_KEY = 'total';
const MAX_PLAY_SETUP_JSON_LENGTH = 64 * 1024;
const utf8ByteLength = (value: string) => {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
};
export const playSetupSchema = z
  .record(z.string().min(1).max(80), z.unknown())
  .nullable()
  .refine(
    (setup) =>
      setup === null || utf8ByteLength(JSON.stringify(setup)) <= MAX_PLAY_SETUP_JSON_LENGTH,
    { message: 'Play setup is too large.' },
  );
export type PlaySetup = z.infer<typeof playSetupSchema>;

const fieldValueSchema = z.union([
  z.number().finite(),
  z.boolean(),
  z.array(z.number().finite()).max(100),
  z.record(z.string().max(60), z.number().finite()),
]);

export const playCreateSchema = z.object({
  /** Client-generated; replaying the same id returns the existing play. */
  id: z.uuid(),
  gameId: z.uuid().optional(),
  meetupTableId: z.uuid().optional(),
  clubId: z.uuid().optional(),
  scoreTemplateId: z.uuid().nullish(),
  startedAt: z.iso.datetime({ offset: true }).optional(),
  playerIdentityIds: z.array(z.uuid()).max(MAX_PLAY_PLAYERS).optional(),
});
export type PlayCreateInput = z.infer<typeof playCreateSchema>;

export const playPatchSchema = z
  .object({
    scoreTemplateId: z.uuid().nullable(),
    outcome: z.enum(['win', 'loss']).nullable(),
    setup: playSetupSchema,
    startedAt: z.iso.datetime({ offset: true }),
    endedAt: z.iso.datetime({ offset: true }).nullable(),
    addPlayers: z.array(z.uuid()).max(MAX_PLAY_PLAYERS),
    removePlayers: z.array(z.uuid()).max(MAX_PLAY_PLAYERS),
    players: z
      .array(
        z.object({
          identityId: z.uuid(),
          team: z.string().trim().min(1).max(40).nullable().optional(),
          role: z.string().trim().min(1).max(40).nullable().optional(),
          isWinnerOverride: z.boolean().nullable().optional(),
        }),
      )
      .max(MAX_PLAY_PLAYERS),
  })
  .partial();
export type PlayPatchInput = z.infer<typeof playPatchSchema>;

export const playValueOpSchema = z.object({
  opId: z.uuid(),
  identityId: z.uuid(),
  categoryKey: z.string().min(1).max(60),
  /** Updates one scalar inside a numeric record category such as Critter Kitchen's `meal`. */
  inputKey: z.string().min(1).max(60).optional(),
  roundIndex: z.number().int().min(0).max(99).optional(),
  /** `null` clears the field. With `roundIndex` the value must be a number. */
  value: fieldValueSchema.nullable(),
});
export type PlayValueOp = z.infer<typeof playValueOpSchema>;

export const playValuesPatchSchema = z.object({ ops: z.array(playValueOpSchema).min(1).max(100) });
export type PlayValuesPatchInput = z.infer<typeof playValuesPatchSchema>;

export const playPresenceSchema = z.object({
  identityId: z.uuid(),
  categoryKey: z.string().min(1).max(60).optional(),
});
export type PlayPresenceInput = z.infer<typeof playPresenceSchema>;

export const playIdParamSchema = z.object({ id: z.uuid() });
export const playGetQuerySchema = z.object({ sinceRev: z.coerce.number().int().min(0).optional() });
export const myPlaysQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const myPlayHistoryQuerySchema = myPlaysQuerySchema.extend({
  status: z.enum(['finished']).optional(),
});
export type MyPlayHistoryStatus = z.infer<typeof myPlayHistoryQuerySchema>['status'];
export const clubMeetupsQuerySchema = z.object({
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
});

export interface PlayComputedDto {
  categories: Record<string, number>;
  total: number;
  rank: number | null;
  isWinner: boolean;
}

export interface PlayPlayerDto {
  identity: IdentityDto;
  seat: number;
  team: string | null;
  role: string | null;
  values: Record<string, unknown>;
  rounds: Record<string, number[]> | null;
  isWinnerOverride: boolean | null;
  computed: PlayComputedDto | null;
}

export interface PlayDto {
  id: string;
  clubId: string | null;
  meetupTableId: string | null;
  game: { id: string; slug: string; name: string };
  template: {
    id: string;
    version: number;
    variant: string;
    needsReview: boolean;
    definition: unknown;
  } | null;
  setup: PlaySetup;
  status: PlayStatus;
  outcome: 'win' | 'loss' | null;
  rev: number;
  editedAfterFinal: boolean;
  startedAt: string;
  endedAt: string | null;
  createdBy: string;
  players: PlayPlayerDto[];
  tieUnresolved: boolean;
  warnings: string[];
  canEdit: boolean;
  canManage: boolean;
  editableIdentityIds: string[];
}

export interface PlayValuesResponse {
  rev: number;
  applied: string[];
  play: PlayDto;
}

export interface PlayPresenceEntry {
  userId: string;
  identityId: string;
  categoryKey: string | null;
  at: string;
}

/** Payload of each SSE `play` event. */
export interface PlayStreamEvent {
  rev: number;
  ops: PlayValueOp[];
  computed: Record<string, PlayComputedDto | null>;
  presence: PlayPresenceEntry[];
  /** Viewer-specific full state so clients can reconcile edits without replaying local ops. */
  state?: PlayDto;
}

export interface PlayPollResponse {
  rev: number;
  /** Omitted when `sinceRev` equals the current revision. */
  play?: PlayDto;
  presence: PlayPresenceEntry[];
}

export interface PlaySummaryDto {
  id: string;
  game: { id: string; slug: string; name: string };
  clubId: string | null;
  status: PlayStatus;
  startedAt: string;
  playerCount: number;
  myComputed: PlayComputedDto | null;
}

export interface PlayHistoryWinnerDto {
  identityId: string;
  displayName: string;
  isGuest: boolean;
}

export interface PlayHistoryItemDto {
  id: string;
  game: { id: string; slug: string; name: string };
  clubId: string | null;
  status: 'final';
  startedAt: string;
  playerCount: number;
  winners: PlayHistoryWinnerDto[];
}

export interface MyPlayHistoryItemDto extends Omit<PlayHistoryItemDto, 'status'> {
  status: PlayStatus;
  myComputed: PlayComputedDto | null;
}

export interface MyPlaysResponse {
  items: MyPlayHistoryItemDto[];
  nextCursor: string | null;
}

export interface ClubPlaysResponse {
  items: PlayHistoryItemDto[];
  nextCursor: string | null;
}

export interface ScoreTemplateDto {
  id: string;
  gameId: string;
  variant: string;
  version: number;
  status: string;
  needsReview: boolean;
  definition: unknown;
}

export interface TableDetailDto {
  id: string;
  meetupId: string;
  meetupTitle: string;
  startsAt: string;
  clubId: string | null;
  game: { id: string; slug: string; name: string } | null;
  seats: number | null;
  note: string | null;
  position: number;
  host: IdentityDto | null;
  seated: IdentityDto[];
}

export interface TableCurrentPlayResponse {
  table: TableDetailDto;
  play: PlayDto | null;
  canManage: boolean;
  editableIdentityIds: string[];
  template: ScoreTemplateDto | null;
}

export interface ClubMeetupItemDto {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  status: 'scheduled' | 'cancelled';
  tables: TableDetailDto[];
}
export interface ClubMeetupsResponse {
  items: ClubMeetupItemDto[];
}
