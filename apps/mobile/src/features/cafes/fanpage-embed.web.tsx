import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Hint } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { facebookPagePluginUrl } from './labels';

export function FanpageEmbed({ fanpageUrl }: { fanpageUrl: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <View style={styles.box}>
        <Hint>Nhấn để xem fanpage. Facebook có thể đặt cookie khi nội dung được tải.</Hint>
        <Button label="Xem fanpage" tone="ghost" onPress={() => setLoaded(true)} />
      </View>
    );
  }

  return (
    <iframe
      title="Fanpage Facebook"
      src={facebookPagePluginUrl(fanpageUrl)}
      width="500"
      height="600"
      loading="lazy"
      allow="encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      style={{ border: 'none', overflow: 'hidden', maxWidth: '100%', borderRadius: radius }}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    alignItems: 'flex-start',
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.card,
  },
});
