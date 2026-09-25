import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { ForgotPasswordForm } from './forgot-password-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Quên mật khẩu · ${SITE_NAME}` };

export default function ForgotPasswordPage() {
  return (
    <AuthPage>
      <ForgotPasswordForm />
    </AuthPage>
  );
}
