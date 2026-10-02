import { Stack } from 'expo-router';
import { RequireLogin } from '../../auth/require-login';
import { ClubCreateForm } from '../../features/clubs/club-create-form';
import { Page, Title } from '../../features/events/ui';

export default function NewClubPage() {
  return (
    <Page maxWidth={560}>
      <Stack.Screen options={{ title: 'Tạo club' }} />
      <RequireLogin reason="Đăng nhập để tạo club.">
        <Title>Tạo club</Title>
        <ClubCreateForm />
      </RequireLogin>
    </Page>
  );
}
