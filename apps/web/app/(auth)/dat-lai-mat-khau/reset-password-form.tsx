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

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const { error, pending, run, setError } = useAuthAction();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get('password') ?? '');
    if (newPassword !== data.get('confirm')) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    const ok = await run(() => authClient.resetPassword({ newPassword, token }));
    if (ok) router.push('/login?notice=reset');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đặt lại mật khẩu</CardTitle>
        <CardDescription>Mọi phiên đăng nhập cũ sẽ bị đăng xuất.</CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <Label htmlFor="password">Mật khẩu mới</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Label htmlFor="confirm">Nhập lại mật khẩu mới</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Button type="submit" disabled={pending}>
              Đặt mật khẩu mới
            </Button>
            <FormError message={error} />
          </form>
        ) : (
          <p className="text-sm">
            Liên kết không hợp lệ hoặc đã hết hạn.{' '}
            <Link href="/quen-mat-khau" className="underline">
              Gửi lại liên kết
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
