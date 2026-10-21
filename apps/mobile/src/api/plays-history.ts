import type { ClubPlaysResponse, MyPlaysResponse, PlayDto } from '@onboard/shared';
import { api } from './client';

export interface PlaysHistoryRequestOptions {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

const DEFAULT_PAGE_SIZE = 20;

export const playsHistoryApi = {
  mine: (options: PlaysHistoryRequestOptions = {}) =>
    api<MyPlaysResponse>('/me/plays', {
      query: {
        status: 'finished',
        cursor: options.cursor,
        limit: options.limit ?? DEFAULT_PAGE_SIZE,
      },
      signal: options.signal,
    }),
  club: (clubId: string, options: PlaysHistoryRequestOptions = {}) =>
    api<ClubPlaysResponse>(`/clubs/${encodeURIComponent(clubId)}/plays`, {
      query: { cursor: options.cursor, limit: options.limit ?? DEFAULT_PAGE_SIZE },
      signal: options.signal,
    }),
  play: (playId: string, options: Pick<PlaysHistoryRequestOptions, 'signal'> = {}) =>
    api<PlayDto>(`/plays/${encodeURIComponent(playId)}`, { signal: options.signal }),
};
