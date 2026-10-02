import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../ui/primitives';
import { colors, radius, space } from '../../ui/theme';
import { FormError } from '../auth/auth-ui';
import { inviteUrl, useFriendCode } from './use-friend-code';

const SIZE = 220;

export function FriendQr() {
  const { code, pending, error, setError, rotate } = useFriendCode();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let live = true;
    QRCode.toDataURL(inviteUrl(code), { margin: 1, width: SIZE * 2 }).then(
      (url) => live && setDataUrl(url),
      () => live && setError('Không tạo được mã QR'),
    );
    return () => {
      live = false;
    };
  }, [code, setError]);

  return (
    <View style={styles.wrap}>
      <View style={styles.box}>
        {dataUrl ? (
          <Image
            source={{ uri: dataUrl }}
            style={styles.qr}
            accessibilityLabel="Mã QR mời kết bạn"
          />
        ) : (
          <Text style={styles.url}>Đang tải…</Text>
        )}
      </View>
      {code ? (
        <Text selectable style={styles.url}>
          {inviteUrl(code)}
        </Text>
      ) : null}
      <Button tone="ghost" label="Đổi mã mời" disabled={pending} onPress={() => void rotate()} />
      <FormError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md },
  box: {
    width: SIZE + 24,
    height: SIZE + 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qr: { width: SIZE, height: SIZE },
  url: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
