import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { changePassword, listProviders, startSocial } from '../auth/auth-api';
import { Field, FormError, Note } from '../auth/auth-ui';
import { useAuthAction } from '../auth/use-auth-action';

export function AccountSecurity() {
  const [providers, setProviders] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { error, pending, run, setError } = useAuthAction();

  useEffect(() => {
    let live = true;
    listProviders().then(
      (p) => live && setProviders(p),
      () => live && setLoadError('Không tải được thông tin bảo mật, thử tải lại trang'),
    );
    return () => {
      live = false;
    };
  }, []);

  const onChange = async () => {
    setChanged(false);
    if (!current) {
      setError('Nhập mật khẩu hiện tại');
      return;
    }
    if (next.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    if (await run(() => changePassword(current, next))) {
      setCurrent('');
      setNext('');
      setConfirm('');
      setChanged(true);
    }
  };

  if (!providers) return <FormError message={loadError} />;
  const hasPassword = providers.includes('credential');
  const hasGoogle = providers.includes('google');

  return (
    <Card>
      <Heading>Bảo mật</Heading>
      <Hint>Mật khẩu và tài khoản liên kết.</Hint>
      {hasPassword ? (
        <View style={styles.form}>
          <Field
            label="Mật khẩu hiện tại"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
          />
          <Field
            label="Mật khẩu mới"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="new-password"
          />
          <Field
            label="Nhập lại mật khẩu mới"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
            onSubmitEditing={() => void onChange()}
          />
          <Button label="Đổi mật khẩu" disabled={pending} onPress={() => void onChange()} />
          {changed ? <Note>Đã đổi mật khẩu, các thiết bị khác đã bị đăng xuất.</Note> : null}
        </View>
      ) : (
        <Note>
          Tài khoản chưa có mật khẩu (đăng nhập bằng Google hoặc mã email). Dùng &quot;Quên mật
          khẩu&quot; ở trang đăng nhập để tạo mật khẩu.
        </Note>
      )}

      <View style={styles.google}>
        <Text style={styles.googleText}>Google: {hasGoogle ? 'đã liên kết' : 'chưa liên kết'}</Text>
        {hasGoogle || Platform.OS !== 'web' ? null : (
          <Button
            tone="ghost"
            label="Liên kết Google"
            disabled={pending}
            onPress={() =>
              void run(() => startSocial('link-social', `${window.location.origin}/account`))
            }
          />
        )}
      </View>
      <FormError message={error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.sm },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space.md,
  },
  googleText: { fontSize: 14, color: colors.text },
});
