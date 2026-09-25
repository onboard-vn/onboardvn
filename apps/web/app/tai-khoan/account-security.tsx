'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthAction } from '@/lib/use-auth-action';

export function AccountSecurity() {
  const [providers, setProviders] = useState<string[] | null>(null);
  const [changed, setChanged] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { error, pending, run, setError } = useAuthAction();

  useEffect(() => {
    authClient.listAccounts().then(({ data, error }) => {
      if (error || !data) setLoadError('Không tải được thông tin bảo mật, thử tải lại trang');
      else setProviders(data.map((a) => a.providerId));
    });
  }, []);

  async function onChangePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChanged(false);
    const form = e.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get('newPassword') ?? '');
    if (newPassword !== data.get('confirm')) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    const ok = await run(() =>
      authClient.changePassword({
        currentPassword: String(data.get('currentPassword') ?? ''),
        newPassword,
        revokeOtherSessions: true,
      }),
    );
    if (ok) {
      form.reset();
      setChanged(true);
    }
  }

  if (!providers) return <FormError message={loadError} />;
  const hasPassword = providers.includes('credential');
  const hasGoogle = providers.includes('google');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bảo mật</CardTitle>
        <CardDescription>Mật khẩu và tài khoản liên kết.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasPassword ? (
          <form onSubmit={onChangePassword} className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              name="newPassword"
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
              Đổi mật khẩu
            </Button>
            {changed ? (
              <p className="text-sm text-muted-foreground">
                Đã đổi mật khẩu, các thiết bị khác đã bị đăng xuất.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tài khoản chưa có mật khẩu (đăng nhập bằng Google hoặc mã email). Dùng &quot;Quên mật
            khẩu&quot; ở trang đăng nhập để tạo mật khẩu.
          </p>
        )}

        <div className="flex items-center justify-between border-t pt-4 text-sm">
          <span>Google: {hasGoogle ? 'đã liên kết' : 'chưa liên kết'}</span>
          {hasGoogle ? null : (
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(() => authClient.linkSocial({ provider: 'google', callbackURL: '/tai-khoan' }))
              }
            >
              Liên kết Google
            </Button>
          )}
        </div>
        <FormError message={error} />
      </CardContent>
    </Card>
  );
}
