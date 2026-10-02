import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '../../auth/session';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { space } from '../../ui/theme';
import { updateUser } from '../auth/auth-api';
import { Field, FormError, Note } from '../auth/auth-ui';
import { useAuthAction } from '../auth/use-auth-action';

export interface ProfileValues {
  name: string;
  username: string;
  bggUsername: string;
}

const USERNAME_RE = /^[A-Za-z0-9_.]+$/;
const BGG_RE = /^[A-Za-z0-9_ -]{3,50}$/;

export function ProfileForm({
  initial,
  onSaved,
}: {
  initial: ProfileValues;
  onSaved?: () => void;
}) {
  const { refresh } = useSession();
  const { error, pending, run, setError } = useAuthAction();
  const [name, setName] = useState(initial.name);
  const [username, setUsername] = useState(initial.username);
  const [bgg, setBgg] = useState(initial.bggUsername);
  const [saved, setSaved] = useState(false);

  const onSubmit = async () => {
    setSaved(false);
    const nextName = name.trim();
    const nextUsername = username.trim();
    const nextBgg = bgg.trim();
    if (!nextName || nextName.length > 100) {
      setError('Tên hiển thị cần 1-100 ký tự');
      return;
    }
    if (nextUsername && (nextUsername.length < 3 || !USERNAME_RE.test(nextUsername))) {
      setError('Tên đăng nhập 3-30 ký tự: chữ, số, dấu _ và dấu chấm');
      return;
    }
    if (nextBgg && !BGG_RE.test(nextBgg)) {
      setError('Username BGG 3-50 ký tự: chữ, số, _, -, khoảng trắng');
      return;
    }
    const ok = await run(() =>
      updateUser({
        name: nextName,
        ...(nextUsername &&
          nextUsername !== initial.username && {
            username: nextUsername,
            displayUsername: nextUsername,
          }),
        bggUsername: nextBgg || null,
      }),
    );
    if (ok) {
      setSaved(true);
      onSaved?.();
      await refresh();
    }
  };

  return (
    <Card>
      <Heading>Hồ sơ</Heading>
      <Hint>Hiển thị công khai trên trang hồ sơ. Email không bao giờ hiển thị.</Hint>
      <View style={styles.form}>
        <Field label="Tên hiển thị" value={name} onChangeText={setName} maxLength={100} />
        <Field
          label="Tên đăng nhập"
          value={username}
          onChangeText={setUsername}
          maxLength={30}
          hint="Đổi tên đăng nhập sẽ đổi luôn địa chỉ trang hồ sơ /u/…"
        />
        <Field
          label="Username BoardGameGeek"
          value={bgg}
          onChangeText={setBgg}
          maxLength={50}
          hint="Dùng để nhập tủ game từ BGG sau này. Để trống để bỏ liên kết."
        />
        <Button label="Lưu hồ sơ" disabled={pending} onPress={() => void onSubmit()} />
        <FormError message={error} />
        {saved ? <Note>Đã lưu.</Note> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ form: { gap: space.sm } });
