import type { Metadata } from 'next';
import { AuthPage } from '@/components/auth-page';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Đăng nhập · Onboard VN' };

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
