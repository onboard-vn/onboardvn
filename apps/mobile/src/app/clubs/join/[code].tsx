import { Stack, useLocalSearchParams } from 'expo-router';
import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { RequireLogin } from '../../../auth/require-login';
import { ClubJoinForm } from '../../../features/clubs/club-join-form';
import { Muted, Page, Title } from '../../../features/events/ui';

export default function JoinClubPage() {
  useAppPreferences();
  const { code } = useLocalSearchParams<{ code: string }>();
  return (
    <Page maxWidth={480}>
      <Stack.Screen options={{ title: t('Tham gia club') }} />
      <RequireLogin reason={t('Đăng nhập để tham gia club.')}>
        <Title>{t('Tham gia club')}</Title>
        {code ? <ClubJoinForm code={code} /> : <Muted>{t('Thiếu mã mời.')}</Muted>}
      </RequireLogin>
    </Page>
  );
}
