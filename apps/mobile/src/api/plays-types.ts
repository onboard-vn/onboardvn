import type { IdentityKind, RawValue } from '@onboard/shared';

export type PlayerKind = IdentityKind;

export const TEAM_ID = 'team';
export const ROUND_KEY = '$round';
export const QUICK_KEY = '$quick';

export interface PlayOp {
  opId: string;
  actorId: string;
  identityId: string;
  categoryKey: string;
  roundIndex?: number;
  value: RawValue;
}

export type PlayEvent =
  { type: 'op'; op: PlayOp } | { type: 'presence'; identityId: string; typing: boolean };

export interface FinishPayload {
  outcome?: 'win' | 'loss' | null;
  players: { identityId: string; kind: PlayerKind }[];
  winners: string[];
  rows: { id: string; name: string; total: number; rank: number | null }[];
}

export interface FinishReceipt {
  memberCount: number;
  guestCount: number;
}

export interface RosterPlayer {
  id: string;
  name: string;
  kind: PlayerKind;
  avatarColor: string;
  birthYear?: number;
}

export interface RosterApi {
  search(query: string): Promise<RosterPlayer[]>;
  createGuest(input: { displayName: string; birthYear?: number }): Promise<RosterPlayer>;
  add(identityId: string): Promise<void>;
  remove(identityId: string): Promise<void>;
}

export interface PlaysApi {
  roster?: RosterApi;
  sendOps(playId: string, ops: PlayOp[]): Promise<{ appliedOpIds: string[] }>;
  subscribe(playId: string, handler: (event: PlayEvent) => void): () => void;
  finish(playId: string, payload: FinishPayload): Promise<FinishReceipt>;
}
