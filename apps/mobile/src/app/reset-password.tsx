import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { resetPassword } from '../features/auth/auth-api';
import { AuthShell, Field, FormError, Note, TextLink } from '../features/auth/auth-ui';
import { useAuthAction } from '../features/auth/use-auth-action';
import { Button } from '../ui/primitives';
import { space } from '../ui/theme';

export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const token = typeof params.token === 'string' && !params.error ? params.token : null;
  const { error, pending, run, setError } = useAuthAction();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const onSubmit = async () => {
    if (!token) return;
    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    if (await run(() => resetPassword(password, token))) {
      router.replace('/login?notice=reset' as never);
    }
  };

  return (
    <AuthShell title="Đặt lại mật khẩu" description="Mọi phiên đăng nhập cũ sẽ bị đăng xuất.">
      <Stack.Screen options={{ title: 'Đặt lại mật khẩu' }} />
      {token ? (
        <View style={styles.form}>
          <Field
            label="Mật khẩu mới"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Field
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            onSubmitEditing={() => void onSubmit()}
          />
          <Button label="Đặt mật khẩu mới" disabled={pending} onPress={() => void onSubmit()} />
          <FormError message={error} />
        </View>
      ) : (
        <Note>
          Liên kết không hợp lệ hoặc đã hết hạn.{' '}
          <TextLink href="/forgot-password">Gửi lại liên kết</TextLink>
        </Note>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({ form: { gap: space.sm } });
