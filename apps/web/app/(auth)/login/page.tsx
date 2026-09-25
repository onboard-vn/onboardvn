import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { LoginForm } from './login-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Đăng nhập · ${SITE_NAME}` };

const NOTICES: Record<string, string> = {
  reset: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { notice } = await searchParams;
  return (
    <AuthPage>
      <LoginForm notice={typeof notice === 'string' ? NOTICES[notice] : undefined} />
    </AuthPage>
  );
}
