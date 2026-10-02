import { Stack, useLocalSearchParams } from 'expo-router';
import { AuthShell, Note, TextLink, withNext } from '../features/auth/auth-ui';
import { safeNextPath } from '../features/auth/safe-next';

export default function CheckEmail() {
  const { email, next: rawNext } = useLocalSearchParams<{ email?: string; next?: string }>();
  const next = safeNextPath(rawNext);
  return (
    <AuthShell
      title="Kiểm tra hộp thư"
      description={`Đã gửi liên kết xác minh tới ${typeof email === 'string' ? email : 'email của bạn'}.`}
      next={next}
    >
      <Stack.Screen options={{ title: 'Kiểm tra email' }} />
      <Note>
        Mở email và bấm &quot;Xác minh email&quot; để kích hoạt tài khoản. Liên kết có hiệu lực 1
        giờ.
      </Note>
      <Note>
        Không thấy email? Kiểm tra mục spam, hoặc{' '}
        <TextLink href={withNext('/login', next)}>đăng nhập</TextLink> để được gửi lại.
      </Note>
    </AuthShell>
  );
}
