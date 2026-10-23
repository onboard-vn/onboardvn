import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { MeetupListResponse } from '@onboard/shared';
import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api/client';
import { RequireLogin } from '../../auth/require-login';
import { formatVnDateTime } from '../../features/events/time';
import { Body, CardLink, LoadGate, Muted, Page, Title } from '../../features/events/ui';
import { useFetch } from '../../features/use-fetch';
import { colors, space } from '../../ui/theme';

function Mine() {
  useAppPreferences();
  const load = useCallback(
    (signal: AbortSignal) => api<Pick<MeetupListResponse, 'items'>>('/me/events', { signal }),
    [],
  );
  const { data, error, loading } = useFetch(load);
  return (
    <LoadGate loading={loading} error={error} hasData={!!data}>
      {data && data.items.length === 0 ? (
        <Muted>{t('Bạn chưa tham gia Kèo nào.')}</Muted>
      ) : (
        <View style={{ gap: space.md }}>
          {data?.items.map((meetup) => (
            <CardLink key={meetup.id} to={`/events/${meetup.slug}`}>
              <Body bold>
                {meetup.title}
                {meetup.status === 'cancelled' ? (
                  <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '400' }}>
                    {'  '}
                    {t('Đã hủy')}
                  </Text>
                ) : null}
              </Body>
              <Muted>{formatVnDateTime(meetup.startsAt)}</Muted>
              <Muted>{meetup.locationLabel}</Muted>
            </CardLink>
          ))}
        </View>
      )}
    </LoadGate>
  );
}

export default function MyEventsPage() {
  useAppPreferences();
  return (
    <Page>
      <Stack.Screen options={{ title: t('Kèo của tôi') }} />
      <RequireLogin reason={t('Đăng nhập để xem Kèo của bạn.')}>
        <Title>{t('Kèo của tôi')}</Title>
        <Mine />
      </RequireLogin>
    </Page>
  );
}
