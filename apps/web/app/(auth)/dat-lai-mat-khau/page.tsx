import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: 'Đặt lại mật khẩu · Onboard VN' };

export default async function ResetPasswordPage({ searchParams }: PageProps<'/dat-lai-mat-khau'>) {
  const { token, error } = await searchParams;
  return (
    <AuthPage>
      <ResetPasswordForm token={typeof token === 'string' && !error ? token : null} />
    </AuthPage>
  );
}
