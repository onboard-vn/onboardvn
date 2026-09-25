import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = { title: 'Quên mật khẩu · Onboard VN' };

export default function ForgotPasswordPage() {
  return (
    <AuthPage>
      <ForgotPasswordForm />
    </AuthPage>
  );
}
