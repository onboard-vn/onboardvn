import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { SignUpForm } from './sign-up-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Đăng ký · ${SITE_NAME}` };

export default function SignUpPage() {
  return (
    <AuthPage>
      <SignUpForm />
    </AuthPage>
  );
}
