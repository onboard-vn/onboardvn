import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../api/client';
import { clubLiveApi } from '../../../api/club-live';
import {
  clubLiveDayHref,
  clubLiveRequestScope,
  formatClubLiveDate,
  newestFirstClubLiveDates,
} from '../../../club/club-live-utils';
import { RequireLogin } from '../../../auth/require-login';
import { useSession } from '../../../auth/session';
import { ClubLiveScreenState, ClubLiveStaleBanner } from '../../../club/club-live-ui';
import { useFetch } from '../../../features/use-fetch';
import { Body, CardLink, Muted, Page, SectionTitle, Title } from '../../../features/events/ui';
import { space } from '../../../ui/theme';

export default function ClubLiveHistoryScreen() {
  const { user } = useSession();
  return (
    <RequireLogin reason="Đăng nhập để xem lịch sử club.">
      {user ? <ClubLiveHistoryContent key={user.id} userId={user.id} /> : null}
    </RequireLogin>
  );
}

function ClubLiveHistoryContent({ userId }: { userId: string }) {
  const { slug, clubId } = useLocalSearchParams<{ slug: string; clubId?: string }>();
  const scope = clubLiveRequestScope(userId, clubId);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!scope || !clubId) throw new ApiError(404, 'Không tìm thấy');
      return clubLiveApi.history(clubId, { signal }).then((response) => ({ scope, response }));
    },
    [clubId, scope],
  );
  const { data: fetched, error, status, loading, reload } = useFetch(load);
  const data = scope && fetched?.scope === scope ? fetched.response : null;
  const dates = data ? newestFirstClubLiveDates(data.data.dates) : [];

  return (
    <Page>
      <Stack.Screen options={{ title: 'Lịch sử club' }} />
      <Title>Lịch sử</Title>
      <ClubLiveScreenState
        loading={loading}
        error={error}
        status={status}
        hasData={!!data}
        onRefresh={reload}
      >
        {data ? (
          <View style={{ gap: space.lg }}>
            <ClubLiveStaleBanner stale={data.stale} lastSuccessAt={data.lastSuccessAt} />
            <SectionTitle>Ngày đã chơi ({dates.length})</SectionTitle>
            {dates.length === 0 ? (
              <Muted>Chưa có ngày chơi nào.</Muted>
            ) : (
              <View style={{ gap: space.sm }}>
                {dates.map((date) => (
                  <CardLink key={date} to={clubLiveDayHref(slug, clubId ?? '', date)}>
                    <View style={{ gap: space.xs }}>
                      <Body bold>{formatClubLiveDate(date)}</Body>
                      <Muted>Xem các bàn trong ngày</Muted>
                    </View>
                  </CardLink>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ClubLiveScreenState>
    </Page>
  );
}
