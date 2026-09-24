import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/api-server';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Đăng nhập · Onboard VN' };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <LoginForm />
    </main>
  );
}
