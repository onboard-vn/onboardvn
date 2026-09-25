'use client';

import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthAction } from '@/lib/use-auth-action';

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const { error, pending, run } = useAuthAction();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    const ok = await run(() =>
      authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
      }),
    );
    if (ok) setSent(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quên mật khẩu</CardTitle>
        <CardDescription>Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm">
            Nếu email tồn tại trong hệ thống, liên kết đặt lại mật khẩu đã được gửi. Liên kết có
            hiệu lực 1 giờ và chỉ dùng được một lần.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
            <Button type="submit" disabled={pending}>
              Gửi liên kết
            </Button>
            <FormError message={error} />
          </form>
        )}
      </CardContent>
    </Card>
  );
}
