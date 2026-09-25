import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLdScript } from '@/components/json-ld-script';
import { serverApi } from '@/lib/api-server';
import { SITE_URL } from '@/lib/env';
import { cafeJsonLd } from '@/lib/seo/json-ld';
import { SITE_NAME } from '@/lib/site';

export async function generateMetadata(props: PageProps<'/cafes/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await (await serverApi()).api.cafes[':slug'].$get({ param: { slug } });
  if (!res.ok) return { title: `${slug} · ${SITE_NAME}` };
  const cafe = await res.json();

  const title = `${cafe.name} · ${SITE_NAME}`;
  const description = `Quán board game ${cafe.name} tại ${cafe.wardName}, ${cafe.provinceName} — kho ${cafe.gameCount} game.`;

  return {
    title,
    description,
    alternates: { canonical: `/cafes/${slug}` },
    openGraph: { title, description, url: `/cafes/${slug}` },
  };
}

export default async function CafeDetailPage(props: PageProps<'/cafes/[slug]'>) {
  const { slug } = await props.params;
  const res = await (await serverApi()).api.cafes[':slug'].$get({ param: { slug } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được quán');
  const cafe = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <JsonLdScript data={cafeJsonLd(cafe, `${SITE_URL}/cafes/${slug}`)} />
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          {cafe.name}
          {cafe.verified ? (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
              Đã xác minh
            </span>
          ) : null}
        </h1>
        <p className="text-muted-foreground text-sm">
          {cafe.addressLine}, {cafe.wardName}, {cafe.provinceName}
          {cafe.legacyDistrict ? ` (${cafe.legacyDistrict})` : ''}
        </p>
      </div>

      {cafe.openingHours && Object.keys(cafe.openingHours).length > 0 ? (
        <div className="text-sm">
          <h2 className="font-medium">Giờ mở cửa</h2>
          <ul className="text-muted-foreground mt-1">
            {Object.entries(cafe.openingHours).map(([key, value]) => (
              <li key={key}>{String(value)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {cafe.links?.fanpage || cafe.links?.maps ? (
        <div className="flex flex-wrap gap-4 text-sm font-medium underline">
          {cafe.links.fanpage ? (
            <a href={cafe.links.fanpage} target="_blank" rel="noreferrer">
              Fanpage
            </a>
          ) : null}
          {cafe.links.maps ? (
            <a href={cafe.links.maps} target="_blank" rel="noreferrer">
              Chỉ đường
            </a>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="text-sm font-medium">Kho game ({cafe.inventory.length})</h2>
        {cafe.inventory.length === 0 ? (
          <p className="text-muted-foreground mt-1 text-sm">Chưa có game nào trong kho.</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {cafe.inventory.map((item) => (
              <li key={item.gameId}>
                <Link
                  href={`/games/${item.slug}`}
                  className="hover:border-foreground/40 flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <span>{item.nameVi || item.nameEn}</span>
                  {item.copies > 1 ? (
                    <span className="text-muted-foreground text-xs">x{item.copies}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!cafe.verified ? (
        <p className="text-muted-foreground text-xs">
          Thông tin quán tổng hợp từ nguồn công khai, chưa được chủ quán xác nhận.{' '}
          <Link href="/data-sources" className="underline">
            Nguồn dữ liệu &amp; yêu cầu sửa/gỡ
          </Link>
          .
        </p>
      ) : null}
    </main>
  );
}
