import { Stack, router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSession } from '../auth/session';
import { startSocial } from '../features/auth/auth-api';
import { AuthShell, Field, FormError, Note, TextLink, withNext } from '../features/auth/auth-ui';
import { safeNextPath } from '../features/auth/safe-next';
import { useAuthAction } from '../features/auth/use-auth-action';
import { Button, Segmented } from '../ui/primitives';
import { space } from '../ui/theme';

type Mode = 'password' | 'otp';

const NOTICES: Record<string, string> = {
  reset: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
};

export default function Login() {
  const params = useLocalSearchParams<{ next?: string; notice?: string }>();
  const next = safeNextPath(params.next);
  const notice = typeof params.notice === 'string' ? NOTICES[params.notice] : undefined;
  const { signInPassword, sendOtp, signInOtp } = useSession();
  const { error, pending, run, setError } = useAuthAction();

  const [mode, setMode] = useState<Mode>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const done = () => router.replace((next || '/') as Href);

  const onPassword = async () => {
    const id = identifier.trim();
    if (!id || !password) return;
    const login = id.includes('@') ? id : id.toLowerCase();
    if (await run(() => signInPassword(login, password))) done();
  };

  const onSendOtp = async () => {
    const value = email.trim();
    if (!value) return;
    if (await run(() => sendOtp(value))) setOtpEmail(value);
  };

  const onOtp = async () => {
    if (!otpEmail || !otp.trim()) return;
    if (await run(() => signInOtp(otpEmail, otp.trim()))) done();
  };

  return (
    <AuthShell
      title="Đăng nhập"
      description="Dùng tài khoản, Google hoặc mã một lần gửi qua email."
      next={next}
    >
      <Stack.Screen options={{ title: 'Đăng nhập' }} />
      {notice ? <Note>{notice}</Note> : null}

      {Platform.OS === 'web' ? (
        <Button
          tone="ghost"
          label="Tiếp tục với Google"
          disabled={pending}
          onPress={() =>
            void run(() => startSocial('sign-in/social', `${window.location.origin}${next || '/'}`))
          }
        />
      ) : null}

      <Segmented
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError(null);
        }}
        options={[
          { value: 'password', label: 'Mật khẩu' },
          { value: 'otp', label: 'Mã qua email' },
        ]}
      />

      {mode === 'password' ? (
        <View style={styles.form}>
          <Field
            label="Tên đăng nhập hoặc email"
            value={identifier}
            onChangeText={setIdentifier}
            autoComplete="username"
            textContentType="username"
          />
          <Field
            label="Mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={() => void onPassword()}
          />
          <Button label="Đăng nhập" disabled={pending} onPress={() => void onPassword()} />
          <View style={styles.links}>
            <TextLink href="/forgot-password">Quên mật khẩu?</TextLink>
            <TextLink href={withNext('/signup', next)}>Tạo tài khoản</TextLink>
          </View>
        </View>
      ) : otpEmail === null ? (
        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            onSubmitEditing={() => void onSendOtp()}
          />
          <Button label="Gửi mã đăng nhập" disabled={pending} onPress={() => void onSendOtp()} />
        </View>
      ) : (
        <View style={styles.form}>
          <Field
            label={`Mã gửi tới ${otpEmail}`}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            onSubmitEditing={() => void onOtp()}
          />
          <Button label="Đăng nhập" disabled={pending} onPress={() => void onOtp()} />
          <Button
            tone="ghost"
            label="Đổi email"
            onPress={() => {
              setOtpEmail(null);
              setOtp('');
              setError(null);
            }}
          />
        </View>
      )}

      <FormError message={error} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
});
