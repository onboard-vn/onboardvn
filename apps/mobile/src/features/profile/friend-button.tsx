import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { FriendRequestDto, FriendSummary } from '@onboard/shared';
import { api } from '../../api/client';
import { Button } from '../../ui/primitives';
import { space } from '../../ui/theme';
import { FormError } from '../auth/auth-ui';

type FriendState = 'loading' | 'none' | 'outgoing' | 'incoming' | 'friends';

interface Relation {
  state: FriendState;
  fromUserId: string | null;
}

async function loadRelation(username: string): Promise<Relation> {
  const [friends, incoming, outgoing] = await Promise.all([
    api<{ items: FriendSummary[] }>('/friends'),
    api<{ items: FriendRequestDto[] }>('/friends/requests', { query: { dir: 'in' } }),
    api<{ items: FriendRequestDto[] }>('/friends/requests', { query: { dir: 'out' } }),
  ]);
  if (friends.items.some((f) => f.username === username)) {
    return { state: 'friends', fromUserId: null };
  }
  const inMatch = incoming.items.find((r) => r.user.username === username);
  if (inMatch) return { state: 'incoming', fromUserId: inMatch.fromUserId };
  if (outgoing.items.some((r) => r.user.username === username)) {
    return { state: 'outgoing', fromUserId: null };
  }
  return { state: 'none', fromUserId: null };
}

export function FriendButton({ username }: { username: string }) {
  const [relation, setRelation] = useState<Relation>({ state: 'loading', fromUserId: null });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadRelation(username).then(
      (r) => live && setRelation(r),
      () => live && setRelation({ state: 'none', fromUserId: null }),
    );
    return () => {
      live = false;
    };
  }, [username]);

  const act = async (fn: () => Promise<Relation>, failure: string) => {
    setPending(true);
    setError(null);
    try {
      setRelation(await fn());
    } catch {
      setError(failure);
    } finally {
      setPending(false);
    }
  };

  const send = () =>
    act(async () => {
      const res = await api<{ status: string }>('/friends/requests', {
        method: 'POST',
        body: { username },
      });
      return { state: res.status === 'accepted' ? 'friends' : 'outgoing', fromUserId: null };
    }, 'Không gửi được lời mời, thử lại sau');

  const accept = () =>
    act(async () => {
      await api(`/friends/requests/${encodeURIComponent(relation.fromUserId ?? '')}/accept`, {
        method: 'POST',
        body: {},
      });
      return { state: 'friends', fromUserId: null };
    }, 'Không chấp nhận được, thử lại sau');

  const { state } = relation;
  if (state === 'loading') return null;
  if (state === 'friends') return <Button tone="ghost" label="Bạn bè" disabled onPress={noop} />;
  if (state === 'outgoing') {
    return <Button tone="ghost" label="Đã gửi lời mời" disabled onPress={noop} />;
  }
  return (
    <View style={styles.wrap}>
      <Button
        label={state === 'incoming' ? 'Chấp nhận lời mời' : 'Kết bạn'}
        disabled={pending || (state === 'incoming' && !relation.fromUserId)}
        onPress={() => void (state === 'incoming' ? accept() : send())}
      />
      <FormError message={error} />
    </View>
  );
}

const noop = () => undefined;

const styles = StyleSheet.create({ wrap: { gap: space.xs } });
