'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthAction } from '@/lib/use-auth-action';

export function SignUpForm({ next }: { next?: string | null }) {
  const router = useRouter();
  const { error, pending, run, setError } = useAuthAction();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = String(data.get('username') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');
    if (password !== data.get('confirm')) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    const ok = await run(() =>
      authClient.signUp.email({
        email,
        password,
        username,
        name: username,
        callbackURL: `${window.location.origin}${next || '/'}`,
      }),
    );
    if (ok) {
      const params = new URLSearchParams({ email });
      if (next) params.set('next', next);
      router.push(`/check-email?${params.toString()}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tạo tài khoản</CardTitle>
        <CardDescription>Cần xác minh email trước khi đăng nhập.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            name="username"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.]+"
            title="Chữ, số, dấu _ và dấu chấm"
            autoComplete="username"
          />
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          <Label htmlFor="password">Mật khẩu</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={pending}>
            Đăng ký
          </Button>
          <FormError message={error} />
          <p className="text-sm">
            Đã có tài khoản?{' '}
            <Link href="/login" className="underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
