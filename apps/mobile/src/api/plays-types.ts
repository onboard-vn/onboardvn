import type { RawValue } from '@onboard/shared';
import type { PlayerKind } from '../mock/club';

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
  | { type: 'op'; op: PlayOp }
  | { type: 'presence'; identityId: string; typing: boolean };

export interface FinishPayload {
  players: { identityId: string; kind: PlayerKind }[];
  winners: string[];
  rows: { id: string; name: string; total: number; rank: number | null }[];
}

export interface FinishReceipt {
  memberCount: number;
  guestCount: number;
}

export interface PlaysApi {
  sendOps(playId: string, ops: PlayOp[]): Promise<{ appliedOpIds: string[] }>;
  subscribe(playId: string, handler: (event: PlayEvent) => void): () => void;
  finish(playId: string, payload: FinishPayload): Promise<FinishReceipt>;
}
