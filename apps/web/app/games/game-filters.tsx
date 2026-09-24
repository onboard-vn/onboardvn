'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Category {
  id: string;
  name: string;
  nameVi: string | null;
}

export interface GameFiltersValues {
  q?: string;
  players?: string;
  maxTime?: string;
  maxWeight?: string;
  categoryId?: string;
}

const FIELDS = ['q', 'players', 'maxTime', 'maxWeight', 'categoryId'] as const;

export function GameFilters({
  categories,
  initialValues,
}: {
  categories: Category[];
  initialValues: GameFiltersValues;
}) {
  const router = useRouter();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const key of FIELDS) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(params.size ? `/games?${params.toString()}` : '/games');
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-2 gap-3 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-6"
    >
      <div className="col-span-2 flex flex-col gap-1 sm:col-span-1 lg:col-span-2">
        <Label htmlFor="q">Tìm kiếm</Label>
        <Input id="q" name="q" placeholder="Tên game..." defaultValue={initialValues.q ?? ''} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="players">Số người</Label>
        <Input
          id="players"
          name="players"
          type="number"
          min={1}
          defaultValue={initialValues.players ?? ''}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="maxTime">Tối đa (phút)</Label>
        <Input
          id="maxTime"
          name="maxTime"
          type="number"
          min={1}
          defaultValue={initialValues.maxTime ?? ''}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="maxWeight">Độ khó tối đa</Label>
        <Input
          id="maxWeight"
          name="maxWeight"
          type="number"
          step="0.1"
          min={1}
          max={5}
          defaultValue={initialValues.maxWeight ?? ''}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="categoryId">Thể loại</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={initialValues.categoryId ?? ''}
          className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
        >
          <option value="">Tất cả</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameVi ?? c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <Button type="submit" className="w-full">
          Lọc
        </Button>
      </div>
    </form>
  );
}
