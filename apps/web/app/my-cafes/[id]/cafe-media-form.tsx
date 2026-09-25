'use client';

import type { CafePhotoDto } from '@onboard/shared';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CAFE_PHOTO_MAX_COUNT = 30;

async function errorMessage(res: Response): Promise<string | undefined> {
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return json?.error?.message;
}

interface CafeMediaFormProps {
  cafeId: string;
  logoUrl: string | null | undefined;
  coverUrl: string | null | undefined;
  photos: CafePhotoDto[];
}

export function CafeMediaForm({ cafeId, logoUrl, coverUrl, photos }: CafeMediaFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function upload(path: 'logo' | 'cover' | 'photos', file: File, caption?: string) {
    setPending(true);
    setError(null);
    const form = new FormData();
    form.set('file', file);
    if (caption) form.set('caption', caption);
    const res = await fetch(`/api/cafes/${cafeId}/${path}`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    setPending(false);
    if (!res.ok) {
      setError((await errorMessage(res)) ?? 'Không tải được ảnh lên');
      return;
    }
    router.refresh();
  }

  async function removeMedia(path: 'logo' | 'cover') {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/${path}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setPending(false);
    if (!res.ok) {
      setError((await errorMessage(res)) ?? 'Không xóa được ảnh');
      return;
    }
    router.refresh();
  }

  async function deletePhoto(photoId: string) {
    setPending(true);
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/photos/${photoId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setPending(false);
    if (!res.ok) {
      setError((await errorMessage(res)) ?? 'Không xóa được ảnh');
      return;
    }
    router.refresh();
  }

  async function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const ids = photos.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];

    setPending(true);
    setError(null);
    const res = await fetch(`/api/cafes/${cafeId}/photos/reorder`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ photoIds: ids }),
    });
    setPending(false);
    if (!res.ok) {
      setError((await errorMessage(res)) ?? 'Không sắp xếp được ảnh');
      return;
    }
    router.refresh();
  }

  function onFileInput(path: 'logo' | 'cover') {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) void upload(path, file);
    };
  }

  function onPhotoInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void upload('photos', file);
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border p-4">
      <h2 className="text-sm font-medium">Ảnh quán</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Logo</Label>
          {logoUrl ? (
            <div className="relative size-20 overflow-hidden rounded-full border">
              <Image src={logoUrl} alt="Logo quán" fill sizes="80px" className="object-cover" />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Chưa có logo.</p>
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileInput('logo')}
            disabled={pending}
          />
          {logoUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => removeMedia('logo')}
            >
              Xóa logo
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ảnh bìa</Label>
          {coverUrl ? (
            <div className="relative h-28 w-full overflow-hidden rounded-lg border">
              <Image
                src={coverUrl}
                alt="Ảnh bìa quán"
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Chưa có ảnh bìa.</p>
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileInput('cover')}
            disabled={pending}
          />
          {coverUrl ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => removeMedia('cover')}
            >
              Xóa ảnh bìa
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t pt-4">
        <div className="flex items-center justify-between">
          <Label>
            Album ({photos.length}/{CAFE_PHOTO_MAX_COUNT})
          </Label>
          {photos.length < CAFE_PHOTO_MAX_COUNT ? (
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onPhotoInput}
              disabled={pending}
              className="max-w-56"
            />
          ) : null}
        </div>

        {photos.length === 0 ? (
          <p className="text-muted-foreground text-xs">Chưa có ảnh nào trong album.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((photo, index) => (
              <li key={photo.id} className="flex flex-col gap-1">
                <div className="relative aspect-square overflow-hidden rounded-lg border">
                  <Image
                    src={photo.url}
                    alt={photo.caption ?? ''}
                    fill
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
                <div className="flex justify-between gap-1 text-xs">
                  <button
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => movePhoto(index, -1)}
                    className="disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={pending || index === photos.length - 1}
                    onClick={() => movePhoto(index, 1)}
                    className="disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => deletePhoto(photo.id)}
                    className="text-destructive"
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
