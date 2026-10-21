import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../api/client';
import { clubLiveApi } from '../../../api/club-live';
import { RequireLogin } from '../../../auth/require-login';
import { useSession } from '../../../auth/session';
import { clubLiveRequestScope } from '../../../club/club-live-utils';
import { ClubLiveScreenState, ClubLiveStaleBanner } from '../../../club/club-live-ui';
import { useFetch } from '../../../features/use-fetch';
import { Box, Muted, Page, SectionTitle, Title } from '../../../features/events/ui';
import { space } from '../../../ui/theme';

export default function ClubLiveMembersScreen() {
  const { user } = useSession();
  return (
    <RequireLogin reason="Đăng nhập để xem thành viên club.">
      {user ? <ClubLiveMembersContent key={user.id} userId={user.id} /> : null}
    </RequireLogin>
  );
}

function ClubLiveMembersContent({ userId }: { userId: string }) {
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const scope = clubLiveRequestScope(userId, clubId);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!scope || !clubId) throw new ApiError(404, 'Không tìm thấy');
      return clubLiveApi.members(clubId, { signal }).then((response) => ({ scope, response }));
    },
    [clubId, scope],
  );
  const { data: fetched, error, status, loading, reload } = useFetch(load);
  const data = scope && fetched?.scope === scope ? fetched.response : null;

  return (
    <Page>
      <Stack.Screen options={{ title: 'Thành viên club' }} />
      <Title>Thành viên</Title>
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
            <SectionTitle>Thành viên bên app CLB ({data.data.items.length})</SectionTitle>
            {data.data.items.length === 0 ? (
              <Muted>Chưa có thành viên nào.</Muted>
            ) : (
              <View style={{ gap: space.sm }}>
                {data.data.items.map((member) => (
                  <Box key={member.externalId}>
                    <Muted>{member.nickname}</Muted>
                  </Box>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </ClubLiveScreenState>
    </Page>
  );
}
