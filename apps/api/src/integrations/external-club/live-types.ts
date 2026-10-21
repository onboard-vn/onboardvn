import type {
  ClubLiveDayData,
  ClubLiveGamesData,
  ClubLiveHistoryDatesData,
  ClubLiveMembersData,
} from '@onboard/shared';

export type LiveResult<T> = {
  data: T;
  stale: boolean;
  lastSuccessAt: string | null;
};

export interface LiveReader {
  readDay(clubId: string, date: string): Promise<LiveResult<ClubLiveDayData>>;
  readMembers(clubId: string): Promise<LiveResult<ClubLiveMembersData>>;
  readGames(clubId: string): Promise<LiveResult<ClubLiveGamesData>>;
  readHistoryDates(clubId: string): Promise<LiveResult<ClubLiveHistoryDatesData>>;
}
