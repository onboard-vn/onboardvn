'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthAction } from '@/lib/use-auth-action';

export interface ProfileValues {
  name: string;
  username: string;
  bggUsername: string;
}

export function ProfileForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { error, pending, run } = useAuthAction();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const data = new FormData(e.currentTarget);
    const value = (key: keyof ProfileValues) => String(data.get(key) ?? '').trim();
    const username = value('username');
    const bggUsername = value('bggUsername');
    const ok = await run(() =>
      authClient.updateUser({
        name: value('name'),
        ...(username && username !== initial.username && { username, displayUsername: username }),
        bggUsername: bggUsername || null,
      }),
    );
    if (ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hồ sơ</CardTitle>
        <CardDescription>
          Hiển thị công khai trên trang hồ sơ. Email không bao giờ hiển thị.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <Label htmlFor="name">Tên hiển thị</Label>
          <Input id="name" name="name" required maxLength={100} defaultValue={initial.name} />
          <Label htmlFor="username">Tên đăng nhập</Label>
          <Input
            id="username"
            name="username"
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_.]+"
            title="Chữ, số, dấu _ và dấu chấm"
            defaultValue={initial.username}
          />
          <p className="text-xs text-muted-foreground">
            Đổi tên đăng nhập sẽ đổi luôn địa chỉ trang hồ sơ /u/…
          </p>
          <Label htmlFor="bggUsername">Username BoardGameGeek</Label>
          <Input
            id="bggUsername"
            name="bggUsername"
            maxLength={50}
            pattern="[A-Za-z0-9_ \-]{3,50}"
            title="3-50 ký tự: chữ, số, _, -, khoảng trắng"
            defaultValue={initial.bggUsername}
          />
          <p className="text-xs text-muted-foreground">
            Dùng để nhập tủ game từ BGG sau này. Để trống để bỏ liên kết.
          </p>
          <Button type="submit" disabled={pending}>
            Lưu hồ sơ
          </Button>
          <FormError message={error} />
          {saved ? <p className="text-sm text-muted-foreground">Đã lưu.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
