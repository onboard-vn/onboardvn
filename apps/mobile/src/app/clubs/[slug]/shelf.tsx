import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../api/client';
import { clubLiveApi } from '../../../api/club-live';
import {
  clubLiveOwnerNames,
  combineClubLiveFreshness,
  clubLiveRequestScope,
  formatClubLiveGameDetails,
} from '../../../club/club-live-utils';
import { RequireLogin } from '../../../auth/require-login';
import { useSession } from '../../../auth/session';
import { ClubLiveScreenState, ClubLiveStaleBanner } from '../../../club/club-live-ui';
import { useFetch } from '../../../features/use-fetch';
import { Body, Box, Muted, Page, SectionTitle, Title } from '../../../features/events/ui';
import { space } from '../../../ui/theme';

export default function ClubLiveShelfScreen() {
  useAppPreferences();
  const { user } = useSession();
  return (
    <RequireLogin reason={t('Đăng nhập để xem kệ game của club.')}>
      {user ? <ClubLiveShelfContent key={user.id} userId={user.id} /> : null}
    </RequireLogin>
  );
}

function ClubLiveShelfContent({ userId }: { userId: string }) {
  useAppPreferences();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const scope = clubLiveRequestScope(userId, clubId);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!scope || !clubId) throw new ApiError(404, t('Không tìm thấy'));
      const [games, members] = await Promise.all([
        clubLiveApi.games(clubId, { signal }),
        clubLiveApi.members(clubId, { signal }),
      ]);
      return { scope, games, members };
    },
    [clubId, scope],
  );
  const { data: fetched, error, status, loading, reload } = useFetch(load);
  const data = scope && fetched?.scope === scope ? fetched : null;
  const freshness = combineClubLiveFreshness(data?.games, data?.members);

  return (
    <Page>
      <Stack.Screen options={{ title: t('Kệ game club') }} />
      <Title>{t('Kệ game')}</Title>
      <ClubLiveScreenState
        loading={loading}
        error={error}
        status={status}
        hasData={!!data}
        onRefresh={reload}
      >
        {data ? (
          <View style={{ gap: space.lg }}>
            <ClubLiveStaleBanner {...freshness} />
            <SectionTitle>
              {t('Game bên app CLB (')}
              {data.games.data.items.length})
            </SectionTitle>
            {data.games.data.items.length === 0 ? (
              <Muted>{t('Chưa có game nào trên kệ.')}</Muted>
            ) : (
              <View style={{ gap: space.sm }}>
                {data.games.data.items.map((game) => {
                  const details = formatClubLiveGameDetails(game);
                  const owners = clubLiveOwnerNames(game, data.members.data.items);
                  return (
                    <Box key={game.externalId}>
                      <View style={{ gap: space.xs }}>
                        <Body bold>{game.name}</Body>
                        {details.length ? <Muted>{details.join(' · ')}</Muted> : null}
                        {owners.length ? (
                          <Muted>
                            {t('Chủ sở hữu:')} {owners.join(' · ')}
                          </Muted>
                        ) : null}
                        {game.expansions.length ? (
                          <Muted>
                            {t('Mở rộng:')} {game.expansions.map((item) => item.name).join(' · ')}
                          </Muted>
                        ) : null}
                      </View>
                    </Box>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ClubLiveScreenState>
    </Page>
  );
}
