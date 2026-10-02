import type { FriendSummary } from '@onboard/shared';
import { Link, Redirect, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { ApiError, api } from '../../api/client';
import { useSession } from '../../auth/session';
import { Page, FormError, withNext } from '../../features/auth/auth-ui';
import { mediaUrl } from '../../features/media';
import { Button, Card, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

async function fetchPreview(code: string): Promise<FriendSummary | null> {
  try {
    return await api<FriendSummary>(`/friends/invite/${encodeURIComponent(code)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

function ConfirmInvite({ code }: { code: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await api(`/friends/invite/${encodeURIComponent(code)}`, { method: 'POST', body: {} });
      setDone(true);
    } catch {
      setError('Không xác nhận được, thử lại sau');
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Đã kết bạn.</Text>
        <Link href="/friends" style={styles.link}>
          Xem danh sách bạn bè
        </Link>
      </View>
    );
  }
  return (
    <View style={styles.center}>
      <Button label="Xác nhận kết bạn" disabled={pending} onPress={() => void confirm()} />
      <FormError message={error} />
    </View>
  );
}

export default function InviteScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const { user, loading } = useSession();
  const preview = useLoad(() => fetchPreview(code), [code]);

  if (preview.loading || loading) {
    return (
      <Page maxWidth={480}>
        <ActivityIndicator style={styles.spinner} />
      </Page>
    );
  }
  if (preview.error && preview.data === undefined) {
    return (
      <Page maxWidth={480}>
        <Hint>{preview.error}</Hint>
      </Page>
    );
  }
  const person = preview.data;
  if (!person) {
    return (
      <Page maxWidth={480}>
        <Stack.Screen options={{ title: 'Kết bạn' }} />
        <Card>
          <Text style={styles.name}>Mã mời không hợp lệ</Text>
          <Hint>Mã mời này không tồn tại hoặc đã được đổi.</Hint>
        </Card>
      </Page>
    );
  }
  if (!user) return <Redirect href={withNext('/login', `/invite/${code}`) as Href} />;

  const image = mediaUrl(person.image);
  return (
    <Page maxWidth={480}>
      <Stack.Screen options={{ title: 'Kết bạn' }} />
      <View style={styles.center}>
        <View style={styles.who}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} accessibilityLabel="" />
          ) : null}
          <View>
            <Text style={styles.name}>{person.name}</Text>
            <Text style={styles.handle}>@{person.displayUsername ?? person.username}</Text>
          </View>
        </View>
        {user.id === person.id ? (
          <Hint>Đây là mã mời kết bạn của chính bạn.</Hint>
        ) : (
          <ConfirmInvite code={code} />
        )}
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 48 },
  center: { alignItems: 'center', gap: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border },
  name: { fontSize: 20, fontWeight: '600', color: colors.text },
  handle: { fontSize: 14, color: colors.muted },
  text: { fontSize: 14, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline', fontSize: 14 },
});
