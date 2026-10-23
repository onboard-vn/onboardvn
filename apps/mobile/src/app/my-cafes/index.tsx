import { t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { CafeMembershipListResponse } from '@onboard/shared';
import { Link, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { RequireLogin } from '../../auth/require-login';
import { PageShell } from '../../features/static/page-shell';
import { H1 } from '../../features/static/text';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { themeStyles, colors, space } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

const CONSENT_LABEL: Record<string, string> = {
  granted: 'Đang hiển thị công khai',
  public_info_only: 'Chỉ hiện thông tin cơ bản',
  declined: 'Đã ẩn khỏi công khai',
  pending: 'Chờ xác nhận',
};

function List() {
  useAppPreferences();
  const { data, error, loading, reload } = useLoad(
    () => api<CafeMembershipListResponse>('/me/cafes'),
    [],
  );
  if (loading && !data) return <ActivityIndicator />;
  if (error && !data) {
    return (
      <View style={styles.stack}>
        <Hint>{translateKnown(error ?? '')}</Hint>
        <Button label={t('Thử lại')} tone="ghost" onPress={reload} />
      </View>
    );
  }
  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <Hint>
        {t('Bạn chưa quản lý quán nào. Dùng link mời từ quản trị viên để trở thành chủ quán.')}
      </Hint>
    );
  }
  return (
    <View style={styles.stack}>
      {items.map((item) => (
        <Card key={item.cafeId}>
          <Heading>{item.cafeName}</Heading>
          <Text style={styles.meta}>
            {item.role === 'owner' ? t('Chủ quán') : t('Nhân viên')} ·{' '}
            {t(CONSENT_LABEL[item.consentStatus] ?? item.consentStatus)}
          </Text>
          <Link
            href={{ pathname: '/my-cafes/[id]', params: { id: item.cafeId } }}
            style={styles.link}
          >
            {t('Quản lý')}
          </Link>
        </Card>
      ))}
    </View>
  );
}

export default function MyCafes() {
  useAppPreferences();
  return (
    <PageShell maxWidth={672}>
      <Stack.Screen options={{ title: t('Địa điểm chơi của tôi') }} />
      <H1>{t('Địa điểm chơi của tôi')}</H1>
      <RequireLogin reason={t('Đăng nhập để xem địa điểm chơi bạn quản lý.')}>
        <List />
      </RequireLogin>
    </PageShell>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    stack: { gap: space.md },
    meta: { color: colors.muted, fontSize: 13 },
    link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
  }),
);
