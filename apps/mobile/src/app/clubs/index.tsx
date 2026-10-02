import type { ClubListResponse } from '@onboard/shared';
import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { RequireLogin } from '../../auth/require-login';
import { ROLE_LABEL } from '../../features/clubs/club-manage-panel';
import { useFetch } from '../../features/use-fetch';
import {
  Body,
  CardLink,
  LinkBtn,
  LoadGate,
  Muted,
  Page,
  Row,
  Title,
} from '../../features/events/ui';
import { space } from '../../ui/theme';

function Clubs() {
  const load = useCallback(
    (signal: AbortSignal) => api<ClubListResponse>('/clubs', { signal }),
    [],
  );
  const { data, error, loading } = useFetch(load);
  return (
    <LoadGate loading={loading} error={error} hasData={!!data}>
      {data && data.items.length === 0 ? (
        <Muted>Bạn chưa tham gia club nào. Tạo club mới hoặc mở link mời từ bạn bè.</Muted>
      ) : (
        <View style={{ gap: space.md }}>
          {data?.items.map((club) => (
            <CardLink key={club.id} to={`/clubs/${club.slug}`}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body bold>{club.name}</Body>
                <Muted>
                  {club.memberCount} thành viên · {ROLE_LABEL[club.myRole]}
                </Muted>
              </Row>
            </CardLink>
          ))}
        </View>
      )}
    </LoadGate>
  );
}

export default function ClubsPage() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Club' }} />
      <RequireLogin reason="Đăng nhập để xem club của bạn.">
        <Row style={{ justifyContent: 'space-between' }}>
          <Title>Club của tôi</Title>
          <LinkBtn small label="Tạo club" to="/clubs/new" />
        </Row>
        <Clubs />
      </RequireLogin>
    </Page>
  );
}
