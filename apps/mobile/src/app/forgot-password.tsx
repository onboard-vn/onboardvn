import { t } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { themeStyles, space } from '../ui/theme';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { requestPasswordReset, appOrigin } from '../features/auth/auth-api';
import { AuthShell, Field, FormError, Note } from '../features/auth/auth-ui';
import { useAuthAction } from '../features/auth/use-auth-action';
import { Button } from '../ui/primitives';

export default function ForgotPassword() {
  useAppPreferences();
  const { error, pending, run } = useAuthAction();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    const value = email.trim();
    if (!value) return;
    if (await run(() => requestPasswordReset(value, `${appOrigin()}/reset-password`)))
      setSent(true);
  };

  return (
    <AuthShell
      title={t('Quên mật khẩu')}
      description={t('Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.')}
    >
      <Stack.Screen options={{ title: t('Quên mật khẩu') }} />
      {sent ? (
        <Note>
          {t(
            'Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi. Liên kết có hiệu lực 1 giờ và chỉ dùng được một lần.',
          )}
        </Note>
      ) : (
        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={() => void onSubmit()}
          />
          <Button label={t('Gửi liên kết')} disabled={pending} onPress={() => void onSubmit()} />
          <FormError message={error} />
        </View>
      )}
    </AuthShell>
  );
}

const styles = themeStyles(() => StyleSheet.create({ form: { gap: space.sm } }));
