import type { FriendRequestDto, FriendSummary } from '@onboard/shared';
import { Stack } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { RequireLogin } from '../auth/require-login';
import { errorMessage } from '../features/errors';
import { mediaUrl } from '../features/media';
import { SearchInput } from '../features/search-input';
import { useFetch } from '../features/use-fetch';
import { Avatar, Button, Card, Heading, Hint, Segmented } from '../ui/primitives';
import { colors, space } from '../ui/theme';

type Tab = 'friends' | 'requests' | 'blocked';

const personName = (u: Pick<FriendSummary, 'displayUsername' | 'username' | 'name'>) =>
  u.displayUsername ?? u.username ?? u.name;

const loadFriends = (signal: AbortSignal) =>
  api<{ items: FriendSummary[] }>('/friends', { signal });
const loadBlocked = (signal: AbortSignal) => api<{ items: FriendSummary[] }>('/blocks', { signal });
const loadIncoming = (signal: AbortSignal) =>
  api<{ items: FriendRequestDto[] }>('/friends/requests', { query: { dir: 'in' }, signal });
const loadOutgoing = (signal: AbortSignal) =>
  api<{ items: FriendRequestDto[] }>('/friends/requests', { query: { dir: 'out' }, signal });

function PersonRow({ person, actions }: { person: FriendSummary; actions: ReactNode }) {
  const image = mediaUrl(person.image);
  return (
    <Card style={styles.person}>
      {image ? (
        <Image source={{ uri: image }} style={styles.avatar} accessibilityIgnoresInvertColors />
      ) : (
        <Avatar name={personName(person)} color={colors.primary} />
      )}
      <Text style={styles.name} numberOfLines={1}>
        {personName(person)}
      </Text>
      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

function useAction(onError: (message: string | null) => void) {
  return useCallback(
    async (run: () => Promise<unknown>, onDone: () => void) => {
      onError(null);
      try {
        await run();
        onDone();
      } catch (e) {
        onError(errorMessage(e, 'Thao tác thất bại, thử lại sau'));
      }
    },
    [onError],
  );
}

function ListState({
  loading,
  error,
  onRetry,
  empty,
  isEmpty,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: string;
  isEmpty: boolean;
}) {
  if (loading) return <ActivityIndicator />;
  if (error) {
    return (
      <View style={styles.stack}>
        <Text style={styles.error}>{error}</Text>
        <Button label="Thử lại" tone="ghost" onPress={onRetry} />
      </View>
    );
  }
  return isEmpty ? <Hint>{empty}</Hint> : null;
}

function AddFriend() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const name = username.trim();
    if (!name) return;
    setBusy(true);
    try {
      await api('/friends/requests', { body: { username: name } });
      setMessage({ text: 'Đã gửi lời mời kết bạn.', ok: true });
      setUsername('');
    } catch (e) {
      setMessage({ text: errorMessage(e, 'Không gửi được lời mời, thử lại sau'), ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Heading>Kết bạn theo username</Heading>
      <SearchInput
        value={username}
        onChangeText={setUsername}
        placeholder="Username của bạn bè"
        label="Username"
      />
      <Button label="Gửi lời mời" disabled={busy || !username.trim()} onPress={() => void send()} />
      {message ? <Text style={message.ok ? styles.ok : styles.error}>{message.text}</Text> : null}
    </Card>
  );
}

function FriendsTab() {
  const list = useFetch(loadFriends);
  const [error, setError] = useState<string | null>(null);
  const act = useAction(setError);
  const items = list.data?.items ?? [];
  return (
    <View style={styles.stack}>
      <AddFriend />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ListState
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty="Chưa có bạn bè."
        isEmpty={items.length === 0}
      />
      {items.map((f) => (
        <PersonRow
          key={f.id}
          person={f}
          actions={
            <Button
              label="Hủy kết bạn"
              tone="ghost"
              onPress={() =>
                void act(
                  () => api(`/friends/${encodeURIComponent(f.id)}`, { method: 'DELETE' }),
                  () => list.setData((p) => ({ items: p.items.filter((x) => x.id !== f.id) })),
                )
              }
            />
          }
        />
      ))}
    </View>
  );
}

function RequestsTab() {
  const incoming = useFetch(loadIncoming);
  const outgoing = useFetch(loadOutgoing);
  const [error, setError] = useState<string | null>(null);
  const act = useAction(setError);

  const dropIncoming = (fromUserId: string) =>
    incoming.setData((p) => ({ items: p.items.filter((r) => r.fromUserId !== fromUserId) }));
  const respond = (fromUserId: string, verb: 'accept' | 'decline') =>
    void act(
      () => api(`/friends/requests/${encodeURIComponent(fromUserId)}/${verb}`, { method: 'POST' }),
      () => dropIncoming(fromUserId),
    );

  return (
    <View style={styles.stack}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Heading>Đến bạn</Heading>
      <ListState
        loading={incoming.loading}
        error={incoming.error}
        onRetry={incoming.reload}
        empty="Không có lời mời nào."
        isEmpty={(incoming.data?.items.length ?? 0) === 0}
      />
      {(incoming.data?.items ?? []).map((r) => (
        <PersonRow
          key={r.fromUserId}
          person={r.user}
          actions={
            <>
              <Button label="Chấp nhận" onPress={() => respond(r.fromUserId, 'accept')} />
              <Button
                label="Từ chối"
                tone="ghost"
                onPress={() => respond(r.fromUserId, 'decline')}
              />
            </>
          }
        />
      ))}
      <Heading>Bạn đã gửi</Heading>
      <ListState
        loading={outgoing.loading}
        error={outgoing.error}
        onRetry={outgoing.reload}
        empty="Không có lời mời nào."
        isEmpty={(outgoing.data?.items.length ?? 0) === 0}
      />
      {(outgoing.data?.items ?? []).map((r) => (
        <PersonRow
          key={r.toUserId}
          person={r.user}
          actions={
            <Button
              label="Hủy"
              tone="ghost"
              onPress={() =>
                void act(
                  () =>
                    api(`/friends/requests/${encodeURIComponent(r.toUserId)}`, {
                      method: 'DELETE',
                    }),
                  () =>
                    outgoing.setData((p) => ({
                      items: p.items.filter((x) => x.toUserId !== r.toUserId),
                    })),
                )
              }
            />
          }
        />
      ))}
    </View>
  );
}

function BlockedTab() {
  const list = useFetch(loadBlocked);
  const [error, setError] = useState<string | null>(null);
  const act = useAction(setError);
  const items = list.data?.items ?? [];
  return (
    <View style={styles.stack}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ListState
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        empty="Chưa chặn ai."
        isEmpty={items.length === 0}
      />
      {items.map((p) => (
        <PersonRow
          key={p.id}
          person={p}
          actions={
            <Button
              label="Bỏ chặn"
              tone="ghost"
              onPress={() =>
                void act(
                  () => api(`/blocks/${encodeURIComponent(p.id)}`, { method: 'DELETE' }),
                  () =>
                    list.setData((prev) => ({ items: prev.items.filter((x) => x.id !== p.id) })),
                )
              }
            />
          }
        />
      ))}
    </View>
  );
}

function FriendsTabs() {
  const [tab, setTab] = useState<Tab>('friends');
  return (
    <View style={styles.stack}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'friends', label: 'Bạn bè' },
          { value: 'requests', label: 'Lời mời' },
          { value: 'blocked', label: 'Đã chặn' },
        ]}
      />
      {tab === 'friends' ? <FriendsTab /> : null}
      {tab === 'requests' ? <RequestsTab /> : null}
      {tab === 'blocked' ? <BlockedTab /> : null}
    </View>
  );
}

export default function FriendsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: 'Bạn bè' }} />
      <View style={styles.column}>
        <RequireLogin reason="Đăng nhập để xem bạn bè và lời mời kết bạn.">
          <FriendsTabs />
        </RequireLogin>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720 },
  stack: { gap: space.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, flexWrap: 'wrap' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.border },
  name: { flex: 1, minWidth: 100, fontSize: 15, fontWeight: '600', color: colors.text },
  actions: { flexDirection: 'row', gap: space.sm },
  error: { color: colors.danger },
  ok: { color: colors.success },
});
