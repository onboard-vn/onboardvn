import { Stack, useLocalSearchParams } from 'expo-router';
import { RequireLogin } from '../../../auth/require-login';
import { ClubJoinForm } from '../../../features/clubs/club-join-form';
import { Muted, Page, Title } from '../../../features/events/ui';

export default function JoinClubPage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Page maxWidth={480}>
      <Stack.Screen options={{ title: 'Tham gia club' }} />
      <RequireLogin reason="Đăng nhập để tham gia club.">
        <Title>Tham gia club</Title>
        {code ? <ClubJoinForm code={code} /> : <Muted>Thiếu mã mời.</Muted>}
      </RequireLogin>
    </Page>
  );
}
