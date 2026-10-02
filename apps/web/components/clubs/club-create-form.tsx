'use client';

import type { ClubCreateResponse } from '@onboard/shared';
import { useState, type FormEvent } from 'react';
import { InviteShare } from '@/components/events/invite-share';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

export function ClubCreateForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<ClubCreateResponse | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api.api.clubs.$post({
        json: { name, description: description.trim() || undefined },
      });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Tạo club thất bại, kiểm tra lại thông tin'));
        return;
      }
      setCreated(await res.json());
    } catch {
      setError('Có lỗi xảy ra, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Đã tạo club &quot;{created.club.name}&quot;.</p>
        <InviteShare inviteUrl={created.inviteUrl} title={created.club.name} />
        <Button render={<a href={`/clubs/${created.club.slug}`} />}>Vào club</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="club-name">Tên club</Label>
        <Input
          id="club-name"
          required
          minLength={2}
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="club-description">Mô tả (tùy chọn)</Label>
        <Textarea
          id="club-description"
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Club ở chế độ riêng tư: người ngoài chỉ thấy tên và số thành viên, tham gia bằng link mời.
      </p>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        Tạo club
      </Button>
    </form>
  );
}
