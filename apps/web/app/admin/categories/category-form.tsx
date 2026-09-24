'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

export interface CategoryFormInitial {
  id: string;
  name: string;
  nameVi: string | null;
  kind: 'category' | 'mechanic';
  bggId: number | null;
}

export function CategoryForm({ initial }: { initial?: CategoryFormInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const str = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      return v === '' ? undefined : v;
    };
    const bggIdRaw = str('bggId');

    const body = {
      name: str('name') ?? '',
      nameVi: str('nameVi'),
      kind: (str('kind') ?? 'category') as 'category' | 'mechanic',
      bggId: bggIdRaw === undefined ? undefined : Number(bggIdRaw),
    };

    const res = initial
      ? await api.api.categories[':id'].$patch({ param: { id: initial.id }, json: body })
      : await api.api.categories.$post({ json: body });

    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    router.push('/admin/categories');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Tên tiếng Anh *</Label>
        <Input id="name" name="name" required defaultValue={initial?.name ?? ''} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="nameVi">Tên tiếng Việt</Label>
        <Input id="nameVi" name="nameVi" defaultValue={initial?.nameVi ?? ''} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="kind">Loại</Label>
        <select
          id="kind"
          name="kind"
          defaultValue={initial?.kind ?? 'category'}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
        >
          <option value="category">Thể loại</option>
          <option value="mechanic">Cơ chế</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="bggId">BGG ID</Label>
        <Input id="bggId" name="bggId" type="number" min={1} defaultValue={initial?.bggId ?? ''} />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {initial ? 'Lưu thay đổi' : 'Tạo thể loại'}
      </Button>
    </form>
  );
}
