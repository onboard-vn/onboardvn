'use client';

import type { CafePhotoDto } from '@onboard/shared';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

export function PhotoGallery({ photos }: { photos: CafePhotoDto[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const active = openIndex != null ? photos[openIndex] : null;

  function close() {
    setOpenIndex(null);
    lastTriggerRef.current?.focus();
  }

  useEffect(() => {
    if (!active) return;
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  if (photos.length === 0) {
    return <p className="text-muted-foreground text-sm">Chưa có ảnh nào.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={(e) => {
              lastTriggerRef.current = e.currentTarget;
              setOpenIndex(index);
            }}
            className="focus-visible:ring-ring relative aspect-square overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:outline-none"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? ''}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.caption ?? 'Ảnh quán'}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/80 p-4"
          onClick={close}
        >
          <div className="relative max-h-[80vh] w-full max-w-3xl">
            <Image
              src={active.url}
              alt={active.caption ?? ''}
              width={1200}
              height={900}
              className="mx-auto max-h-[80vh] w-auto object-contain"
            />
          </div>
          {active.caption ? <p className="text-sm text-white">{active.caption}</p> : null}
          <button
            ref={closeButtonRef}
            type="button"
            className="absolute top-4 right-4 rounded-md bg-white/10 px-3 py-1 text-sm text-white"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}
