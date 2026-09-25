import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { safeNextPath } from '@/lib/safe-next';
import { SignUpForm } from './sign-up-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Đăng ký · ${SITE_NAME}` };

export default async function SignUpPage({ searchParams }: PageProps<'/signup'>) {
  const { next } = await searchParams;
  return (
    <AuthPage>
      <SignUpForm next={safeNextPath(typeof next === 'string' ? next : undefined)} />
    </AuthPage>
  );
}
