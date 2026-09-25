import type { CafePublicDetailDto } from '@onboard/shared';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buildMapsUrl, buildZaloUrl } from '@/lib/cafe-links';
import { VENUE_TYPE_LABELS, openStatusLabel } from '@/lib/cafe-labels';

const OPEN_STATUS_STYLES: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-800',
  closing_soon: 'bg-amber-100 text-amber-800',
  closed: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground',
};

function actionLinkClass(disabled = false) {
  return `inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
    disabled
      ? 'cursor-not-allowed border-border/60 text-muted-foreground/60'
      : 'hover:bg-muted border-border'
  }`;
}

export function CafeHeader({ cafe }: { cafe: CafePublicDetailDto }) {
  const statusLabel = openStatusLabel(cafe.openStatus);
  const statusStyle = cafe.openStatus ? OPEN_STATUS_STYLES[cafe.openStatus.state] : undefined;
  const mapsUrl = buildMapsUrl(cafe);
  const initial = cafe.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="flex flex-col gap-4">
      <div className="relative flex h-40 items-end overflow-hidden rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 sm:h-56">
        {cafe.coverUrl ? (
          <Image
            src={cafe.coverUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 768px, 100vw"
            className="object-cover"
            priority
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="border-background bg-muted relative -mt-14 size-20 shrink-0 overflow-hidden rounded-full border-4 sm:size-24">
          {cafe.logoUrl ? (
            <Image src={cafe.logoUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl font-semibold">
              {initial}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {cafe.name}
            {cafe.verified ? <Badge variant="secondary">Đã xác minh</Badge> : null}
          </h1>
          <p className="text-muted-foreground text-sm">{VENUE_TYPE_LABELS[cafe.venueType]}</p>
          <p className="text-muted-foreground text-sm">
            {cafe.addressLine}, {cafe.wardName}, {cafe.provinceName}
            {cafe.legacyDistrict ? ` (${cafe.legacyDistrict})` : ''}
          </p>
          {statusLabel ? (
            <span
              className={`w-fit rounded px-1.5 py-0.5 text-xs font-medium ${statusStyle ?? ''}`}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={mapsUrl} target="_blank" rel="noreferrer" className={actionLinkClass()}>
          Chỉ đường
        </a>
        {cafe.links?.fanpage ? (
          <a
            href={cafe.links.fanpage}
            target="_blank"
            rel="noreferrer"
            className={actionLinkClass()}
          >
            Fanpage
          </a>
        ) : null}
        {cafe.links?.zalo ? (
          <a
            href={buildZaloUrl(cafe.links.zalo)}
            target="_blank"
            rel="noreferrer"
            className={actionLinkClass()}
          >
            Nhắn Zalo
          </a>
        ) : null}
        <Link href={`/events/new?cafe=${cafe.slug}`} className={actionLinkClass()}>
          Tạo kèo tại đây
        </Link>
      </div>
    </div>
  );
}
