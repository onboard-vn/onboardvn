import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../ui/primitives';
import { themeStyles, colors, space } from '../../ui/theme';
import { FormError } from '../auth/auth-ui';
import { inviteUrl, useFriendCode } from './use-friend-code';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';

export function FriendQr() {
  useAppPreferences();
  const { code, pending, error, rotate } = useFriendCode();
  return (
    <View style={styles.wrap}>
      <Text selectable style={styles.url}>
        {code ? inviteUrl(code) : t('Đang tải…')}
      </Text>
      <Button
        tone="ghost"
        label={t('Đổi mã mời')}
        disabled={pending}
        onPress={() => void rotate()}
      />
      <FormError message={error} />
    </View>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    wrap: { alignItems: 'center', gap: space.md },
    url: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  }),
);
