import type { CafeOwnerInvitePreviewDto } from '@onboard/shared';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api, ApiError } from '../../../api/client';
import { useSession } from '../../../auth/session';
import { FormError } from '../../../features/my-cafes/form-bits';
import { PageShell } from '../../../features/static/page-shell';
import { useFetch } from '../../../features/use-fetch';
import { Button, Hint } from '../../../ui/primitives';
import { colors, space } from '../../../ui/theme';
import { H2 } from '../../../features/static/text';

const STATUS_MESSAGE: Record<string, string> = {
  used: 'Link mời này đã được dùng.',
  expired: 'Link mời này đã hết hạn.',
  revoked: 'Link mời này đã bị thu hồi.',
};

function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setPending(true);
    setError(null);
    try {
      const { cafeId } = await api<{ cafeId: string }>(
        `/owner-invites/${encodeURIComponent(token)}/accept`,
        { method: 'POST' },
      );
      router.push({ pathname: '/my-cafes/[id]/consent', params: { id: cafeId } });
    } catch (e) {
      setPending(false);
      setError(
        e instanceof ApiError && e.status === 410
          ? 'Link mời đã hết hạn hoặc không còn hiệu lực'
          : 'Không xác nhận được, thử lại sau',
      );
    }
  };

  return (
    <View style={styles.center}>
      <Button label="Xác nhận là chủ quán" disabled={pending} onPress={() => void accept()} />
      <FormError message={error} />
    </View>
  );
}

export default function OwnerInvite() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { user, loading: sessionLoading } = useSession();
  const load = useCallback(
    (signal: AbortSignal) =>
      api<CafeOwnerInvitePreviewDto>(`/owner-invites/${encodeURIComponent(token ?? '')}`, {
        signal,
      }),
    [token],
  );
  const { data: preview, loading, error, status, reload } = useFetch(load);
  const next = `/my-cafes/invite/${token}`;

  return (
    <PageShell maxWidth={448} footer={false}>
      <Stack.Screen options={{ title: 'Lời mời chủ quán' }} />
      {loading || sessionLoading ? (
        <ActivityIndicator />
      ) : !preview ? (
        status === 404 ? (
          <Hint>Không tìm thấy lời mời này.</Hint>
        ) : (
          <View style={styles.center}>
            <Hint>{error}</Hint>
            <Button label="Thử lại" tone="ghost" onPress={reload} />
          </View>
        )
      ) : (
        <View style={styles.center}>
          <H2>Lời mời làm chủ địa điểm chơi &quot;{preview.cafeName}&quot;</H2>
          {preview.status !== 'valid' ? (
            <Hint>{STATUS_MESSAGE[preview.status]}</Hint>
          ) : !user ? (
            <View style={styles.center}>
              <Hint>Đăng nhập hoặc đăng ký tài khoản để nhận quyền quản lý quán.</Hint>
              <View style={styles.links}>
                <Link href={{ pathname: '/login', params: { next } }} style={styles.link}>
                  Đăng nhập
                </Link>
                <Link href={{ pathname: '/signup', params: { next } }} style={styles.link}>
                  Đăng ký
                </Link>
              </View>
            </View>
          ) : (
            <AcceptInvite token={token ?? ''} />
          )}
        </View>
      )}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: space.md },
  links: { flexDirection: 'row', gap: space.lg },
  link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});
