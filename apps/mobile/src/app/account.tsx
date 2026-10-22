import { t, translateKnown } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { RequireLogin } from '../auth/require-login';
import { useSession } from '../auth/session';
import { AccountSecurity } from '../features/account/account-security';
import { FriendQr } from '../features/account/friend-qr';
import { privacyValuesFrom, type AccountMe } from '../features/account/privacy-types';
import { PrivacySettings } from '../features/account/privacy-settings';
import { ProfileForm } from '../features/account/profile-form';
import { Page } from '../features/auth/auth-ui';
import { Card, Hint } from '../ui/primitives';
import { themeStyles, colors, space } from '../ui/theme';
import { useLoad } from '../ui/use-load';

function AccountContent() {
  useAppPreferences();
  const { user } = useSession();
  const me = useLoad(() => api<{ user: AccountMe }>('/me').then((r) => r.user), [user?.id]);

  if (me.error && !me.data) return <Hint>{translateKnown(me.error ?? '')}</Hint>;
  if (!me.data) return <Hint>{t('Đang tải…')}</Hint>;
  const u = me.data;
  return (
    <>
      <View style={styles.head}>
        <Text style={styles.title}>{t('Tài khoản')}</Text>
        <View style={styles.links}>
          <Link href="/events/mine" style={styles.link}>
            {t('Kèo của tôi')}
          </Link>
          {u.username ? (
            <Link href={`/u/${u.username}`} style={styles.link}>
              {t('Xem hồ sơ công khai')}
            </Link>
          ) : null}
        </View>
      </View>
      <ProfileForm
        onSaved={me.reload}
        initial={{
          name: u.name,
          username: u.displayUsername ?? u.username ?? '',
          bggUsername: u.bggUsername ?? '',
        }}
      />
      <Card>
        <Text style={styles.sectionTitle}>{t('Mã mời kết bạn (QR)')}</Text>
        <FriendQr />
      </Card>
      <PrivacySettings initial={privacyValuesFrom(u)} />
      <AccountSecurity />
    </>
  );
}

export default function Account() {
  useAppPreferences();
  return (
    <Page maxWidth={640}>
      <Stack.Screen options={{ title: t('Tài khoản') }} />
      <RequireLogin reason={t('Đăng nhập để quản lý tài khoản.')}>
        <AccountContent />
      </RequireLogin>
    </Page>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    head: { gap: space.sm },
    title: { fontSize: 24, fontWeight: '600', color: colors.text },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
    link: { color: colors.primary, textDecorationLine: 'underline', fontSize: 14 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  }),
);
