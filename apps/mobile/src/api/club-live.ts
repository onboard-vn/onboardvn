import type {
  ClubLiveDayResponse,
  ClubLiveGamesResponse,
  ClubLiveHistoryDatesResponse,
  ClubLiveMembersResponse,
} from '@onboard/shared';
import { api } from './client';

export interface ClubLiveRequestOptions {
  signal?: AbortSignal;
}

const clubPath = (clubId: string) => `/clubs/${encodeURIComponent(clubId)}`;

export const clubLiveApi = {
  day: (clubId: string, date: string, options: ClubLiveRequestOptions = {}) =>
    api<ClubLiveDayResponse>(
      `${clubPath(clubId)}/days/${encodeURIComponent(date)}`,
      { signal: options.signal },
    ),
  members: (clubId: string, options: ClubLiveRequestOptions = {}) =>
    api<ClubLiveMembersResponse>(`${clubPath(clubId)}/members-live`, {
      signal: options.signal,
    }),
  games: (clubId: string, options: ClubLiveRequestOptions = {}) =>
    api<ClubLiveGamesResponse>(`${clubPath(clubId)}/games-live`, {
      signal: options.signal,
    }),
  history: (clubId: string, options: ClubLiveRequestOptions = {}) =>
    api<ClubLiveHistoryDatesResponse>(`${clubPath(clubId)}/history-live`, {
      signal: options.signal,
    }),
};
