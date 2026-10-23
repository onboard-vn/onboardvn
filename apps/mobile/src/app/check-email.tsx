import { t } from '../ui/i18n';
import { useAppPreferences } from '../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { AuthShell, Note, TextLink, withNext } from '../features/auth/auth-ui';
import { safeNextPath } from '../features/auth/safe-next';

export default function CheckEmail() {
  useAppPreferences();
  const { email, next: rawNext } = useLocalSearchParams<{ email?: string; next?: string }>();
  const next = safeNextPath(rawNext);
  return (
    <AuthShell
      title={t('Kiểm tra hộp thư')}
      description={t('Đã gửi liên kết xác minh tới {email}.', {
        email: typeof email === 'string' ? email : t('email của bạn'),
      })}
      next={next}
    >
      <Stack.Screen options={{ title: t('Kiểm tra email') }} />
      <Note>
        {t('Mở email và bấm "Xác minh email" để kích hoạt tài khoản. Liên kết có hiệu lực 1 giờ.')}
      </Note>
      <Note>
        {t('Không thấy email? Kiểm tra mục spam, hoặc')}{' '}
        <TextLink href={withNext('/login', next)}>{t('đăng nhập')}</TextLink>{' '}
        {t('để được gửi lại.')}
      </Note>
    </AuthShell>
  );
}
