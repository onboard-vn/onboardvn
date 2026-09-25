import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLdScript } from '@/components/json-ld-script';
import { CafeHeader } from '@/components/cafe/cafe-header';
import { CafeTabsNav } from '@/components/cafe/cafe-tabs-nav';
import { FanpageEmbed } from '@/components/cafe/fanpage-embed';
import { InventoryFilter } from '@/components/cafe/inventory-filter';
import { OpeningHoursTable } from '@/components/cafe/opening-hours-table';
import { PhotoGallery } from '@/components/cafe/photo-gallery';
import { serverApi } from '@/lib/api-server';
import { SITE_URL } from '@/lib/env';
import { formatVnDateTime } from '@/lib/events-time';
import { isFacebookFanpageUrl } from '@/lib/cafe-fanpage';
import { parseCafeTab } from '@/lib/cafe-tabs';
import { cafeJsonLd } from '@/lib/seo/json-ld';
import { AMENITY_KEYS, AMENITY_LABELS, FEE_MODEL_LABELS } from '@/lib/cafe-labels';
import { SITE_NAME } from '@/lib/site';

export async function generateMetadata(props: PageProps<'/cafes/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await (await serverApi()).api.cafes[':slug'].$get({ param: { slug } });
  if (!res.ok) return { title: `${slug} · ${SITE_NAME}` };
  const cafe = await res.json();

  const title = `${cafe.name} · ${SITE_NAME}`;
  const description = `Quán board game ${cafe.name} tại ${cafe.wardName}, ${cafe.provinceName} — kho ${cafe.gameCount} game.`;
  const images = cafe.coverUrl ? [{ url: cafe.coverUrl }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/cafes/${slug}` },
    openGraph: { title, description, url: `/cafes/${slug}`, images },
  };
}

export default async function CafeDetailPage(props: PageProps<'/cafes/[slug]'>) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const tab = parseCafeTab(searchParams);

  const res = await (await serverApi()).api.cafes[':slug'].$get({ param: { slug } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được quán');
  const cafe = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <JsonLdScript data={cafeJsonLd(cafe, `${SITE_URL}/cafes/${slug}`)} />
      <CafeHeader cafe={cafe} />
      <CafeTabsNav slug={slug} active={tab} />

      {tab === 'about' ? (
        <section aria-label="Giới thiệu" className="flex flex-col gap-6">
          <h2 className="sr-only">Giới thiệu</h2>
          {cafe.amenities ? (
            <div className="text-sm">
              <h2 className="font-medium">Tiện ích</h2>
              <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {AMENITY_KEYS.filter((key) => cafe.amenities?.[key] != null).map((key) => (
                  <li key={key} className="text-muted-foreground">
                    {AMENITY_LABELS[key]}: {cafe.amenities?.[key] ? 'Có' : 'Không'}
                  </li>
                ))}
                {cafe.amenities.privateRoomCapacity != null ? (
                  <li className="text-muted-foreground">
                    Sức chứa phòng riêng: {cafe.amenities.privateRoomCapacity}
                  </li>
                ) : null}
                {cafe.amenities.maxGroupSize != null ? (
                  <li className="text-muted-foreground">
                    Sức chứa nhóm tối đa: {cafe.amenities.maxGroupSize}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {cafe.feeModel ? (
            <p className="text-sm">
              <span className="font-medium">Chi phí: </span>
              <span className="text-muted-foreground">
                {FEE_MODEL_LABELS[cafe.feeModel]}
                {cafe.feeNote ? ` — ${cafe.feeNote}` : ''}
              </span>
            </p>
          ) : null}

          {cafe.openingHours ? (
            <OpeningHoursTable hours={cafe.openingHours} openStatus={cafe.openStatus} />
          ) : null}

          {cafe.links && Object.keys(cafe.links).length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">Liên hệ &amp; mạng xã hội</h2>
              <div className="flex flex-wrap gap-4 text-sm font-medium underline">
                {cafe.links.fanpage ? (
                  <a href={cafe.links.fanpage} target="_blank" rel="noreferrer">
                    Fanpage
                  </a>
                ) : null}
                {cafe.links.instagram ? (
                  <a href={cafe.links.instagram} target="_blank" rel="noreferrer">
                    Instagram
                  </a>
                ) : null}
                {cafe.links.tiktok ? (
                  <a href={cafe.links.tiktok} target="_blank" rel="noreferrer">
                    TikTok
                  </a>
                ) : null}
                {cafe.links.website ? (
                  <a href={cafe.links.website} target="_blank" rel="noreferrer">
                    Website
                  </a>
                ) : null}
                {cafe.links.maps ? (
                  <a href={cafe.links.maps} target="_blank" rel="noreferrer">
                    Chỉ đường
                  </a>
                ) : null}
              </div>
              {isFacebookFanpageUrl(cafe.links.fanpage) ? (
                <FanpageEmbed fanpageUrl={cafe.links.fanpage} />
              ) : null}
            </div>
          ) : null}

          {!cafe.verified ? (
            <p className="text-muted-foreground text-xs">
              Thông tin quán tổng hợp từ nguồn công khai, chưa được chủ quán xác nhận.{' '}
              <Link href="/data-sources" className="underline">
                Nguồn dữ liệu &amp; yêu cầu sửa/gỡ
              </Link>
              .
            </p>
          ) : null}
        </section>
      ) : null}

      {tab === 'games' ? (
        <section aria-label="Tủ game">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Kho game ({cafe.inventory.length})</h2>
            <Link href={`/cafes/${slug}/contribute`} className="text-sm underline">
              Đóng góp game
            </Link>
          </div>
          {cafe.inventory.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có game nào trong kho.</p>
          ) : (
            <InventoryFilter inventory={cafe.inventory} />
          )}
        </section>
      ) : null}

      {tab === 'events' ? (
        <section aria-label="Sự kiện" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Sự kiện</h2>
            <Link href={`/events/new?cafe=${slug}`} className="text-sm underline">
              Tạo kèo tại đây
            </Link>
          </div>
          <CafeEventsList cafeId={cafe.id} />
        </section>
      ) : null}

      {tab === 'photos' ? (
        <section aria-label="Ảnh">
          <h2 className="mb-3 text-sm font-medium">Ảnh</h2>
          <PhotoGallery photos={cafe.photos} />
        </section>
      ) : null}
    </main>
  );
}

async function CafeEventsList({ cafeId }: { cafeId: string }) {
  const res = await (await serverApi()).api.events.$get({ query: { cafeId } });
  const items = res.ok ? (await res.json()).items : [];

  if (items.length === 0) return <p className="text-muted-foreground text-sm">Chưa có kèo.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {items.map((meetup) => (
        <li key={meetup.id}>
          <Link href={`/events/${meetup.slug}`} className="block rounded-lg border p-3 text-sm">
            <p className="font-medium">{meetup.title}</p>
            <p className="text-muted-foreground text-xs">{formatVnDateTime(meetup.startsAt)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
