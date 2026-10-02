import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { useSession } from './session';

const withQuery = (path: string, params: Record<string, string | string[] | undefined>) => {
  const used = new Set(path.split('/'));
  const qs = Object.entries(params)
    .filter(([k, v]) => typeof v === 'string' && !used.has(v) && k !== 'next')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
    .join('&');
  return qs ? `${path}?${qs}` : path;
};

export function RequireLogin({ children, reason }: { children: ReactNode; reason?: string }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (user) return <>{children}</>;
  return (
    <View style={styles.wrap}>
      <Card>
        <Heading>Cần đăng nhập</Heading>
        <Hint>{reason ?? 'Đăng nhập để xem nội dung này.'}</Hint>
        <Button
          label="Đăng nhập"
          onPress={() =>
            router.push({ pathname: '/login', params: { next: withQuery(pathname, params) } })
          }
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 48 },
  wrap: { padding: 16, alignSelf: 'center', width: '100%', maxWidth: 480 },
});
