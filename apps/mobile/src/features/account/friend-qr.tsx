import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { FormError } from '../auth/auth-ui';
import { inviteUrl, useFriendCode } from './use-friend-code';

export function FriendQr() {
  const { code, pending, error, rotate } = useFriendCode();
  return (
    <View style={styles.wrap}>
      <Text selectable style={styles.url}>
        {code ? inviteUrl(code) : 'Đang tải…'}
      </Text>
      <Button tone="ghost" label="Đổi mã mời" disabled={pending} onPress={() => void rotate()} />
      <FormError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md },
  url: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
