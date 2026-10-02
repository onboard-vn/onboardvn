import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { signUpEmail, appOrigin } from '../features/auth/auth-api';
import { AuthShell, Field, FormError, Note, TextLink, withNext } from '../features/auth/auth-ui';
import { safeNextPath } from '../features/auth/safe-next';
import { useAuthAction } from '../features/auth/use-auth-action';
import { Button } from '../ui/primitives';
import { space } from '../ui/theme';

const USERNAME_RE = /^[A-Za-z0-9_.]+$/;

export default function SignUp() {
  const { next: rawNext } = useLocalSearchParams<{ next?: string }>();
  const next = safeNextPath(rawNext);
  const { error, pending, run, setError } = useAuthAction();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const onSubmit = async () => {
    const name = username.trim();
    const mail = email.trim();
    if (name.length < 3 || name.length > 30 || !USERNAME_RE.test(name)) {
      setError('Tên đăng nhập 3-30 ký tự: chữ, số, dấu _ và dấu chấm');
      return;
    }
    if (!mail.includes('@')) {
      setError('Email không hợp lệ');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }
    if (password !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    const ok = await run(() =>
      signUpEmail({
        email: mail,
        password,
        username: name,
        name,
        callbackURL: `${appOrigin()}${next || '/'}`,
      }),
    );
    if (ok) {
      const params = new URLSearchParams({ email: mail });
      if (next) params.set('next', next);
      router.replace(`/check-email?${params.toString()}` as never);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      description="Cần xác minh email trước khi đăng nhập."
      next={next}
    >
      <Stack.Screen options={{ title: 'Đăng ký' }} />
      <View style={styles.form}>
        <Field
          label="Tên đăng nhập"
          value={username}
          onChangeText={setUsername}
          maxLength={30}
          autoComplete="username"
          textContentType="username"
          hint="Chữ, số, dấu _ và dấu chấm"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <Field
          label="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <Field
          label="Nhập lại mật khẩu"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          onSubmitEditing={() => void onSubmit()}
        />
        <Button label="Đăng ký" disabled={pending} onPress={() => void onSubmit()} />
        <FormError message={error} />
        <Note>
          Đã có tài khoản? <TextLink href={withNext('/login', next)}>Đăng nhập</TextLink>
        </Note>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({ form: { gap: space.sm } });
