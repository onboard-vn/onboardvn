import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { SignUpForm } from './sign-up-form';

export const metadata: Metadata = { title: 'Đăng ký · Onboard VN' };

export default function SignUpPage() {
  return (
    <AuthPage>
      <SignUpForm />
    </AuthPage>
  );
}
