import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { clubsApi } from '../../api/clubs';
import { RequireLogin } from '../../auth/require-login';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';

function Claim({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setState('busy');
    setError(null);
    try {
      const res = await clubsApi.redeemClaim(token);
      setName(res.identity.displayName);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không nhận được');
      setState('idle');
    }
  };

  return (
    <Card>
      <Heading>Nhận lịch sử chơi</Heading>
      {state === 'done' ? (
        <>
          <Hint>Đã gộp &ldquo;{name}&rdquo; vào tài khoản của bạn.</Hint>
          <Link href="/club" style={styles.link}>
            Về Kèo của CLB
          </Link>
        </>
      ) : (
        <>
          <Hint>Link này gộp các ván đã chơi với tư cách khách vào tài khoản của bạn.</Hint>
          <Button
            label={state === 'busy' ? 'Đang nhận…' : 'Nhận về tài khoản'}
            disabled={state === 'busy'}
            onPress={() => void redeem()}
          />
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Card>
  );
}

export default function ClaimScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <RequireLogin reason="Đăng nhập để nhận lịch sử chơi của khách về tài khoản.">
          {token ? <Claim token={token} /> : <Hint>Link không hợp lệ.</Hint>}
        </RequireLogin>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 480, gap: 12 },
  link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
  error: { color: colors.danger, marginTop: 8 },
});
