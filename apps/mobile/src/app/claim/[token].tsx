import { t, translateKnown } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { clubsApi } from '../../api/clubs';
import { RequireLogin } from '../../auth/require-login';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { themeStyles, colors } from '../../ui/theme';

function Claim({ token }: { token: string }) {
  useAppPreferences();
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
      setError(e instanceof Error ? e.message : t('Không nhận được'));
      setState('idle');
    }
  };

  return (
    <Card>
      <Heading>{t('Nhận lịch sử chơi')}</Heading>
      {state === 'done' ? (
        <>
          <Hint>
            {t('Đã gộp “')}
            {name}
            {t('” vào tài khoản của bạn.')}
          </Hint>
          <Link href="/club" style={styles.link}>
            {t('Về Kèo của CLB')}
          </Link>
        </>
      ) : (
        <>
          <Hint>{t('Link này gộp các ván đã chơi với tư cách khách vào tài khoản của bạn.')}</Hint>
          <Button
            label={state === 'busy' ? t('Đang nhận…') : t('Nhận về tài khoản')}
            disabled={state === 'busy'}
            onPress={() => void redeem()}
          />
        </>
      )}
      {error ? <Text style={styles.error}>{translateKnown(error ?? '')}</Text> : null}
    </Card>
  );
}

export default function ClaimScreen() {
  useAppPreferences();
  const { token } = useLocalSearchParams<{ token: string }>();
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.column}>
        <RequireLogin reason={t('Đăng nhập để nhận lịch sử chơi của khách về tài khoản.')}>
          {token ? <Claim token={token} /> : <Hint>{t('Link không hợp lệ.')}</Hint>}
        </RequireLogin>
      </View>
    </ScrollView>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    content: { padding: 16, alignItems: 'center' },
    column: { width: '100%', maxWidth: 480, gap: 12 },
    link: { color: colors.primary, fontWeight: '600', marginTop: 8 },
    error: { color: colors.danger, marginTop: 8 },
  }),
);
