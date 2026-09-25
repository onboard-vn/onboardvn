'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthAction } from '@/lib/use-auth-action';

type Mode = 'password' | 'otp';
type OtpStep = { kind: 'email' } | { kind: 'code'; email: string };

const field = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? '').trim();

export function LoginForm({ notice, next }: { notice?: string; next?: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [otpStep, setOtpStep] = useState<OtpStep>({ kind: 'email' });
  const { error, pending, run, setError } = useAuthAction();

  function done() {
    router.push(next || '/');
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function onPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const identifier = field(e.currentTarget, 'identifier');
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    const ok = await run(() =>
      identifier.includes('@')
        ? authClient.signIn.email({ email: identifier, password })
        : authClient.signIn.username({ username: identifier.toLowerCase(), password }),
    );
    if (ok) done();
  }

  async function onOtpEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = field(e.currentTarget, 'email');
    const ok = await run(() => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }));
    if (ok) setOtpStep({ kind: 'code', email });
  }

  async function onOtpCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otpStep.kind !== 'code') return;
    const otp = field(e.currentTarget, 'otp');
    const ok = await run(() => authClient.signIn.emailOtp({ email: otpStep.email, otp }));
    if (ok) done();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Dùng tài khoản, Google hoặc mã một lần gửi qua email.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}

        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => authClient.signIn.social({ provider: 'google', callbackURL: next || '/' }))
          }
        >
          Tiếp tục với Google
        </Button>

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
          {(
            [
              ['password', 'Mật khẩu'],
              ['otp', 'Mã qua email'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`rounded px-2 py-1 ${mode === value ? 'bg-background font-medium shadow-sm' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'password' ? (
          <form onSubmit={onPassword} className="flex flex-col gap-2">
            <Label htmlFor="identifier">Tên đăng nhập hoặc email</Label>
            <Input id="identifier" name="identifier" required autoComplete="username" />
            <Label htmlFor="password">Mật khẩu</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
            <Button type="submit" disabled={pending}>
              Đăng nhập
            </Button>
            <div className="flex justify-between text-sm">
              <Link href="/forgot-password" className="underline">
                Quên mật khẩu?
              </Link>
              <Link href="/signup" className="underline">
                Tạo tài khoản
              </Link>
            </div>
          </form>
        ) : otpStep.kind === 'email' ? (
          <form onSubmit={onOtpEmail} className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
            <Button type="submit" disabled={pending}>
              Gửi mã đăng nhập
            </Button>
          </form>
        ) : (
          <form onSubmit={onOtpCode} className="flex flex-col gap-2">
            <Label htmlFor="otp">Mã gửi tới {otpStep.email}</Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              required
            />
            <Button type="submit" disabled={pending}>
              Đăng nhập
            </Button>
            <Button type="button" variant="link" onClick={() => setOtpStep({ kind: 'email' })}>
              Đổi email
            </Button>
          </form>
        )}

        <FormError message={error} />
      </CardContent>
    </Card>
  );
}
