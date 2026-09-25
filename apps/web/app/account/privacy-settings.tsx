'use client';

import type { PrivacyLevel } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api';

const LEVEL_LABEL: Record<PrivacyLevel, string> = {
  public: 'Công khai',
  friends: 'Chỉ bạn bè',
  private: 'Chỉ mình tôi',
};

export interface PrivacyValues {
  profileVisibility: PrivacyLevel;
  playsVisibility: PrivacyLevel;
  friendsVisibility: PrivacyLevel;
  emailOnFriendRequest: boolean;
}

function LevelSelect({
  value,
  onChange,
}: {
  value: PrivacyLevel;
  onChange: (value: PrivacyLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PrivacyLevel)}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(['public', 'friends', 'private'] as const).map((level) => (
          <SelectItem key={level} value={level}>
            {LEVEL_LABEL[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PrivacySettings({ initial }: { initial: PrivacyValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      const res = await api.api.me.privacy.$patch({ json: values });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError('Không lưu được cài đặt, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Riêng tư</CardTitle>
        <CardDescription>
          Kiểm soát ai xem được hồ sơ, ván chơi và danh sách bạn bè.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Label>Hồ sơ &amp; tủ game</Label>
            <LevelSelect
              value={values.profileVisibility}
              onChange={(v) => setValues((s) => ({ ...s, profileVisibility: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label>Ván chơi &amp; thống kê</Label>
            <LevelSelect
              value={values.playsVisibility}
              onChange={(v) => setValues((s) => ({ ...s, playsVisibility: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <Label>Danh sách bạn bè</Label>
            <LevelSelect
              value={values.friendsVisibility}
              onChange={(v) => setValues((s) => ({ ...s, friendsVisibility: v }))}
            />
          </div>
          <div className="flex items-center justify-between gap-4 border-t pt-4">
            <Label htmlFor="emailOnFriendRequest">Email khi có lời mời kết bạn mới</Label>
            <input
              id="emailOnFriendRequest"
              type="checkbox"
              className="size-4"
              checked={values.emailOnFriendRequest}
              onChange={(e) => setValues((s) => ({ ...s, emailOnFriendRequest: e.target.checked }))}
            />
          </div>
          <Button type="submit" disabled={pending}>
            Lưu cài đặt
          </Button>
          <FormError message={error} />
          {saved ? <p className="text-sm text-muted-foreground">Đã lưu.</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
