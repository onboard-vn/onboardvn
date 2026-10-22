import { t } from '../../../../ui/i18n';
import { useAppPreferences } from '../../../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../../../api/client';
import { clubLiveApi } from '../../../../api/club-live';
import { RequireLogin } from '../../../../auth/require-login';
import { useSession } from '../../../../auth/session';
import {
  combineClubLiveFreshness,
  clubLiveRequestScope,
  clubLiveSeatLabels,
  clubLiveTableScoreHref,
  formatClubLiveDate,
  formatClubLiveTableTime,
} from '../../../../club/club-live-utils';
import {
  ClubLiveExternalLink,
  ClubLiveScreenState,
  ClubLiveStaleBanner,
} from '../../../../club/club-live-ui';
import { useFetch } from '../../../../features/use-fetch';
import { Body, CardLink, Muted, Page, SectionTitle, Title } from '../../../../features/events/ui';
import { space } from '../../../../ui/theme';

export default function ClubLiveDayScreen() {
  useAppPreferences();
  const { user } = useSession();
  return (
    <RequireLogin reason={t('Đăng nhập để xem ngày của club.')}>
      {user ? <ClubLiveDayContent key={user.id} userId={user.id} /> : null}
    </RequireLogin>
  );
}

function ClubLiveDayContent({ userId }: { userId: string }) {
  useAppPreferences();
  const { clubId, date } = useLocalSearchParams<{ clubId?: string; date?: string }>();
  const scope = clubLiveRequestScope(userId, clubId, date);
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (!scope || !clubId || !date) throw new ApiError(404, t('Không tìm thấy'));
      const day = await clubLiveApi.day(clubId, date, { signal });
      return { scope, day };
    },
    [clubId, date, scope],
  );
  const { data: fetched, error, status, loading, reload } = useFetch(load);
  const data = scope && fetched?.scope === scope ? fetched : null;
  const freshness = combineClubLiveFreshness(data?.day);

  return (
    <Page>
      <Stack.Screen options={{ title: t('Ngày club') }} />
      <Title>{date ? formatClubLiveDate(date) : t('Ngày club')}</Title>
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
            <ClubLiveExternalLink url={data.day.data.externalUrl} />
            {data.day.data.venue ? <Muted>{data.day.data.venue}</Muted> : null}
            {data.day.data.note ? <Body>{data.day.data.note}</Body> : null}
            <View style={{ gap: space.md }}>
              <SectionTitle>
                {t('Bàn trong ngày (')}
                {data.day.data.tables.length})
              </SectionTitle>
              {data.day.data.tables.length === 0 ? (
                <Muted>{t('Chưa có bàn nào trong ngày này.')}</Muted>
              ) : (
                data.day.data.tables.map((table) => {
                  const seats = clubLiveSeatLabels(table.seats);
                  return (
                    <CardLink key={table.tableId} to={clubLiveTableScoreHref(table.tableId)}>
                      <View style={{ gap: space.xs }}>
                        <Body bold>{table.gameName || t('Chưa xác định game')}</Body>
                        <Muted>
                          {formatClubLiveTableTime(table.startsAt, table.endsAt)} ·{' '}
                          {table.status === 'confirmed' ? t('Đã xác nhận') : t('Đang bình chọn')}
                        </Muted>
                        <Muted>
                          {t('Chủ bàn:')} {table.hostName ?? t('Chưa rõ')}
                        </Muted>
                        <Muted>{seats.length ? seats.join(' · ') : t('Chưa có người chơi')}</Muted>
                        {table.hasOpenPlay ? <Muted>{t('Đang chấm điểm')}</Muted> : null}
                        {table.note ? <Muted>{table.note}</Muted> : null}
                      </View>
                    </CardLink>
                  );
                })
              )}
            </View>
          </View>
        ) : null}
      </ClubLiveScreenState>
    </Page>
  );
}
