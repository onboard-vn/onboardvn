import type { PublicProfile, ShelfListResult } from '@onboard/shared';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { ApiError, api } from '../../api/client';
import { useSession } from '../../auth/session';
import { Page, withNext } from '../../features/auth/auth-ui';
import { mediaUrl } from '../../features/media';
import { FriendButton } from '../../features/profile/friend-button';
import { Card, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

interface Loaded {
  profile: PublicProfile | null;
  shelf: ShelfListResult | null;
}

async function loadProfile(username: string): Promise<Loaded> {
  const path = `/users/${encodeURIComponent(username)}`;
  let profile: PublicProfile;
  try {
    profile = await api<PublicProfile>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { profile: null, shelf: null };
    throw e;
  }
  if (profile.hidden) return { profile, shelf: null };
  const shelf = await api<ShelfListResult>(`${path}/shelf`).catch(() => null);
  return { profile, shelf };
}

export default function ProfileScreen() {
  const { username = '' } = useLocalSearchParams<{ username: string }>();
  const { user: viewer, loading: sessionLoading } = useSession();
  const res = useLoad(() => loadProfile(username), [username, viewer?.id, sessionLoading]);

  if (res.loading || sessionLoading) {
    return (
      <Page maxWidth={640}>
        <ActivityIndicator style={styles.spinner} />
      </Page>
    );
  }
  if (res.error && !res.data) {
    return (
      <Page maxWidth={640}>
        <Hint>{res.error}</Hint>
      </Page>
    );
  }
  const { profile, shelf } = res.data ?? { profile: null, shelf: null };
  if (!profile) {
    return (
      <Page maxWidth={640}>
        <Stack.Screen options={{ title: 'Không tìm thấy' }} />
        <Card>
          <Text style={styles.title}>Không tìm thấy người dùng</Text>
          <Link href="/" style={styles.link}>
            Về trang chủ
          </Link>
        </Card>
      </Page>
    );
  }

  const isSelf = viewer?.id === profile.id;
  const handle = profile.displayUsername ?? profile.username;
  const label = profile.hidden ? handle : profile.name;
  const image = profile.hidden ? null : mediaUrl(profile.image);
  const items = shelf && !shelf.hidden ? shelf.items : [];

  return (
    <Page maxWidth={640}>
      <Stack.Screen options={{ title: `${label} (@${profile.username})` }} />
      <View style={styles.head}>
        <View style={styles.who}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatar} accessibilityLabel="" />
          ) : null}
          <View style={styles.flex}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.handle}>@{handle}</Text>
          </View>
        </View>
        {isSelf ? null : viewer ? (
          <FriendButton username={profile.username} />
        ) : (
          <Link href={withNext('/login', `/u/${profile.username}`)} style={styles.link}>
            Đăng nhập để kết bạn
          </Link>
        )}
      </View>
      {profile.hidden ? (
        <Hint>Hồ sơ riêng tư.</Hint>
      ) : profile.bggUrl ? (
        <Text style={styles.text}>
          BoardGameGeek:{' '}
          <Text
            style={styles.link}
            accessibilityRole="link"
            // @ts-expect-error react-native-web link props
            href={profile.bggUrl}
            hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
          >
            {profile.bggUsername}
          </Text>
        </Text>
      ) : null}
      {items.length > 0 ? (
        <View style={styles.shelf}>
          <Text style={styles.section}>Tủ game</Text>
          <View style={styles.chips}>
            {items.map((item) => (
              <Link key={item.game.id} href={`/games/${item.game.slug}`} style={styles.gameChip}>
                {item.game.nameVi || item.game.nameEn}
              </Link>
            ))}
          </View>
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: 48 },
  flex: { flex: 1 },
  head: { gap: space.md },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.border },
  title: { fontSize: 24, fontWeight: '600', color: colors.text },
  handle: { fontSize: 15, color: colors.muted },
  text: { fontSize: 14, color: colors.text },
  link: { color: colors.primary, textDecorationLine: 'underline', fontSize: 14 },
  shelf: { gap: space.sm },
  section: { fontSize: 14, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gameChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    fontSize: 14,
    color: colors.text,
    overflow: 'hidden',
  },
});
