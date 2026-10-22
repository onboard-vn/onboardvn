import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useSession } from '../../../auth/session';
import { withNext } from '../../../features/auth/auth-ui';
import { ClubJoinForm } from '../../../features/clubs/club-join-form';
import { LinkBtn, Muted, Page, Title } from '../../../features/events/ui';

export default function JoinClubPage() {
  useAppPreferences();
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const code = typeof rawCode === 'string' ? rawCode : '';
  const next = code ? `/clubs/join/${encodeURIComponent(code)}` : null;
  const { user, loading } = useSession();

  return (
    <Page maxWidth={420}>
      <Stack.Screen options={{ title: 'Tham gia club' }} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} />
      ) : user ? (
        <>
          <Title>{t('Tham gia CLB')}</Title>
          {code ? <ClubJoinForm code={code} /> : <Muted>{t('Thiếu mã mời.')}</Muted>}
        </>
      ) : (
        <>
          <Title>{t('Tham gia CLB')}</Title>
          {next ? (
            <>
              <Muted>{t('Đăng nhập hoặc tạo tài khoản để tiếp tục với link mời này.')}</Muted>
              <LinkBtn label={t('Tạo tài khoản')} to={withNext('/signup', next)} />
              <LinkBtn label={t('Đăng nhập')} to={withNext('/login', next)} variant="outline" />
            </>
          ) : (
            <Muted>{t('Thiếu mã mời.')}</Muted>
          )}
        </>
      )}
    </Page>
  );
}
