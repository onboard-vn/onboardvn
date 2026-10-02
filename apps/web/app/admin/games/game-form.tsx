'use client';

import type { DescriptionSource, GameCreateInput } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  nameVi: string | null;
  kind: 'category' | 'mechanic';
}

export interface GameFormInitial {
  id: string;
  nameVi: string | null;
  nameEn: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playMinutes: number | null;
  weight: string | null;
  minAge: number | null;
  isVietnamese: boolean;
  bggId: number | null;
  descriptionVi: string | null;
  descriptionSource: DescriptionSource;
  descriptionRightsHolder: string | null;
  descriptionPermissionRef?: string | null;
  descriptionLicense: 'CC-BY-SA-4.0' | 'permission-only';
  videoUrls: string[];
  imageCredit: string | null;
  categories: Category[];
}

export function GameForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: GameFormInitial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [source, setSource] = useState<DescriptionSource>(
    initial?.descriptionSource ?? 'original',
  );
  const selectedCategoryIds = new Set(initial?.categories.map((c) => c.id) ?? []);
  const categoryGroups: Array<{ label: string; kind: Category['kind'] }> = [
    { label: 'Thể loại', kind: 'category' },
    { label: 'Cơ chế', kind: 'mechanic' },
  ];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    // On edit, an emptied field sends `null` to clear the stored value; on create it's simply omitted.
    const num = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      if (v !== '') return Number(v);
      return initial ? null : undefined;
    };
    const str = (key: string) => {
      const v = String(data.get(key) ?? '').trim();
      if (v !== '') return v;
      return initial ? null : undefined;
    };
    const videoUrls = String(data.get('videoUrls') ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const body = {
      nameEn: str('nameEn') ?? '',
      nameVi: str('nameVi'),
      minPlayers: num('minPlayers'),
      maxPlayers: num('maxPlayers'),
      playMinutes: num('playMinutes'),
      weight: num('weight'),
      minAge: num('minAge'),
      isVietnamese: data.get('isVietnamese') === 'on',
      bggId: num('bggId'),
      descriptionVi: str('descriptionVi'),
      descriptionSource: source,
      descriptionRightsHolder: str('descriptionRightsHolder'),
      descriptionPermissionRef: str('descriptionPermissionRef'),
      descriptionLicense: (source === 'original' ? 'CC-BY-SA-4.0' : str('descriptionLicense')) as
        'CC-BY-SA-4.0' | 'permission-only' | undefined,
      videoUrls,
      acceptLicense: data.get('acceptLicense') === 'on',
      imageCredit: str('imageCredit'),
      categoryIds: data.getAll('categoryIds').map(String),
    };

    const res = initial
      ? await api.api.games[':id'].$patch({ param: { id: initial.id }, json: body })
      : // num()/str() only return null on edit (see above), so this is a safe create-time narrowing.
        await api.api.games.$post({ json: body as unknown as GameCreateInput });

    setPending(false);
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setError(json?.error?.message ?? 'Có lỗi xảy ra, thử lại sau');
      return;
    }
    const game = await res.json();
    router.push(`/games/${game.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="nameEn">Tên tiếng Anh *</Label>
          <Input id="nameEn" name="nameEn" required defaultValue={initial?.nameEn ?? ''} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="nameVi">Tên tiếng Việt</Label>
          <Input id="nameVi" name="nameVi" defaultValue={initial?.nameVi ?? ''} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="minPlayers">Số người (min)</Label>
          <Input
            id="minPlayers"
            name="minPlayers"
            type="number"
            min={1}
            defaultValue={initial?.minPlayers ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maxPlayers">Số người (max)</Label>
          <Input
            id="maxPlayers"
            name="maxPlayers"
            type="number"
            min={1}
            defaultValue={initial?.maxPlayers ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="playMinutes">Thời gian (phút)</Label>
          <Input
            id="playMinutes"
            name="playMinutes"
            type="number"
            min={1}
            defaultValue={initial?.playMinutes ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="minAge">Tuổi tối thiểu</Label>
          <Input
            id="minAge"
            name="minAge"
            type="number"
            min={0}
            defaultValue={initial?.minAge ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="weight">Độ khó (1-5)</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            step="0.1"
            min={1}
            max={5}
            defaultValue={initial?.weight ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="bggId">BGG ID</Label>
          <Input
            id="bggId"
            name="bggId"
            type="number"
            min={1}
            defaultValue={initial?.bggId ?? ''}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isVietnamese"
          defaultChecked={initial?.isVietnamese ?? false}
          className="size-4"
        />
        Thuần Việt / Việt hóa
      </label>

      {categoryGroups.map(({ label, kind }) => {
        const group = categories.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <fieldset key={kind} className="flex flex-col gap-2">
            <legend className="text-sm font-medium">{label}</legend>
            <div className="flex flex-wrap gap-3">
              {group.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={c.id}
                    defaultChecked={selectedCategoryIds.has(c.id)}
                    className="size-4"
                  />
                  {c.nameVi ?? c.name}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}

      <div className="flex flex-col gap-1">
        <Label htmlFor="descriptionVi">Mô tả (tiếng Việt)</Label>
        <Textarea
          id="descriptionVi"
          name="descriptionVi"
          rows={4}
          defaultValue={initial?.descriptionVi ?? ''}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor="descriptionSource">Nguồn mô tả</Label>
          <select
            id="descriptionSource"
            name="descriptionSource"
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
          >
            <option value="original">Cộng đồng tự viết</option>
            <option value="translated_with_permission">Bản dịch được NPH cho phép</option>
            <option value="translated_from_bgg">Dịch từ BGG (không thuộc CC BY-SA)</option>
          </select>
        </div>

        {source === 'translated_with_permission' ? (
          <>
            <div className="flex flex-col gap-1">
              <Label htmlFor="descriptionRightsHolder">Đơn vị cấp phép *</Label>
              <Input
                id="descriptionRightsHolder"
                name="descriptionRightsHolder"
                required
                defaultValue={initial?.descriptionRightsHolder ?? ''}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="descriptionPermissionRef">Tham chiếu giấy phép *</Label>
              <Input
                id="descriptionPermissionRef"
                name="descriptionPermissionRef"
                required
                defaultValue={initial?.descriptionPermissionRef ?? ''}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="descriptionLicense">Giấy phép</Label>
              <select
                id="descriptionLicense"
                name="descriptionLicense"
                defaultValue={initial?.descriptionLicense ?? 'permission-only'}
                className="border-input h-9 rounded-md border bg-transparent px-3 text-sm dark:bg-input/30"
              >
                <option value="permission-only">Chỉ theo phép của NPH</option>
                <option value="CC-BY-SA-4.0">CC BY-SA 4.0</option>
              </select>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-xs">
              Giấy phép: CC BY-SA 4.0 (khoá vì nguồn là cộng đồng tự viết)
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="acceptLicense"
                required
                defaultChecked={false}
                className="mt-0.5 size-4"
              />
              Tôi tự viết nội dung này (không dịch/chép từ BGG, hộp game, sách luật) và đồng ý cấp
              phép CC BY-SA 4.0
            </label>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="videoUrls">Video (mỗi link một dòng, YouTube/Facebook)</Label>
        <Textarea
          id="videoUrls"
          name="videoUrls"
          rows={3}
          defaultValue={initial?.videoUrls.join('\n') ?? ''}
          placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.facebook.com/...'}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="imageCredit">Nguồn ảnh bìa</Label>
        <Input id="imageCredit" name="imageCredit" defaultValue={initial?.imageCredit ?? ''} />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <Button type="submit" disabled={pending}>
        {initial ? 'Lưu thay đổi' : 'Tạo game'}
      </Button>
    </form>
  );
}
