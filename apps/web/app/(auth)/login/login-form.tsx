'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

type Step = { kind: 'email' } | { kind: 'otp'; email: string };

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ error: { message?: string } | null }>) {
    setPending(true);
    setError(null);
    const { error } = await action();
    setPending(false);
    if (error) setError(error.message ?? 'Có lỗi xảy ra, thử lại sau');
    return !error;
  }

  async function onEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    const ok = await run(() => authClient.emailOtp.sendVerificationOtp({ email, type: 'sign-in' }));
    if (ok) setStep({ kind: 'otp', email });
  }

  async function onOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step.kind !== 'otp') return;
    const otp = String(new FormData(e.currentTarget).get('otp') ?? '').trim();
    const ok = await run(() => authClient.signIn.emailOtp({ email: step.email, otp }));
    if (ok) {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>Dùng Google hoặc mã một lần gửi qua email.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => authClient.signIn.social({ provider: 'google', callbackURL: '/' }))
          }
        >
          Tiếp tục với Google
        </Button>

        {step.kind === 'email' ? (
          <form onSubmit={onEmail} className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
            <Button type="submit" disabled={pending}>
              Gửi mã đăng nhập
            </Button>
          </form>
        ) : (
          <form onSubmit={onOtp} className="flex flex-col gap-2">
            <Label htmlFor="otp">Mã gửi tới {step.email}</Label>
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
            <Button type="button" variant="link" onClick={() => setStep({ kind: 'email' })}>
              Đổi email
            </Button>
          </form>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
