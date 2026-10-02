import type { WishlistIdsResponse } from '@onboard/shared';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { api } from '../../api/client';
import { useSession } from '../../auth/session';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';

export function WishlistButton({ gameId, nextPath }: { gameId: string; nextPath: string }) {
  const { user } = useSession();
  const [added, setAdded] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const ctrl = new AbortController();
    api<WishlistIdsResponse>('/me/wishlist/ids', { signal: ctrl.signal }).then(
      (r) => !ctrl.signal.aborted && setAdded(r.gameIds.includes(gameId)),
      () => !ctrl.signal.aborted && setAdded(false),
    );
    return () => ctrl.abort();
  }, [userId, gameId]);

  if (!user) {
    return (
      <Link
        href={{ pathname: '/login', params: { next: nextPath } }}
        style={StyleSheet.flatten([styles.button, styles.text])}
      >
        Muốn chơi (đăng nhập)
      </Link>
    );
  }

  const toggle = async () => {
    setPending(true);
    setError(null);
    try {
      if (added) {
        await api(`/me/wishlist/${encodeURIComponent(gameId)}`, { method: 'DELETE' });
        setAdded(false);
      } else {
        await api('/me/wishlist', { body: { gameId } });
        setAdded(true);
      }
    } catch (e) {
      setError(errorMessage(e, 'Không cập nhật được, thử lại sau'));
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !!added, disabled: pending || added === null }}
        disabled={pending || added === null}
        onPress={() => void toggle()}
        style={StyleSheet.flatten([styles.button, added ? styles.on : null])}
      >
        <Text style={StyleSheet.flatten([styles.text, added ? styles.textOn : null])}>
          {added ? 'Đã thêm vào Muốn chơi' : '♡ Muốn chơi'}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  on: { backgroundColor: colors.primarySoft },
  text: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  textOn: { color: colors.primary },
  error: { color: colors.danger },
});
