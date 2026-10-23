import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Stack } from 'expo-router';
import { RequireLogin } from '../../auth/require-login';
import { ClubCreateForm } from '../../features/clubs/club-create-form';
import { Page, Title } from '../../features/events/ui';

export default function NewClubPage() {
  useAppPreferences();
  return (
    <Page maxWidth={560}>
      <Stack.Screen options={{ title: t('Tạo club') }} />
      <RequireLogin reason={t('Đăng nhập để tạo club.')}>
        <Title>{t('Tạo club')}</Title>
        <ClubCreateForm />
      </RequireLogin>
    </Page>
  );
}
