import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api-server';
import { CafeFilters, type CafeFilterValues } from './cafe-filters';
import { VENUE_TYPE_LABELS, openStatusLabel } from '@/lib/cafe-labels';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Địa điểm chơi · ${SITE_NAME}` };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function boolParam(value: string | string[] | undefined): true | undefined {
  return firstValue(value) === 'true' ? true : undefined;
}

export default async function CafesPage(props: PageProps<'/cafes'>) {
  const sp = await props.searchParams;
  const tinh = firstValue(sp.province) ?? firstValue(sp.tinh);
  const phuong = firstValue(sp.phuong);
  const page = firstValue(sp.page);
  const venueType = firstValue(sp.venueType) as CafeFilterValues['venueType'];
  const filters: CafeFilterValues = {
    venueType,
    byog: boolParam(sp.byog),
    food: boolParam(sp.food),
    privateRoom: boolParam(sp.privateRoom),
    largeTables: boolParam(sp.largeTables),
    free: boolParam(sp.free),
    openNow: boolParam(sp.openNow),
  };

  const client = await serverApi();

  const provincesRes = await client.api.locations.provinces.$get();
  const provinces = provincesRes.ok ? (await provincesRes.json()).items : [];
  const selectedProvince = tinh ? provinces.find((p) => p.slug === tinh) : undefined;

  const initialWards = selectedProvince
    ? await client.api.locations.provinces[':code'].wards
        .$get({ param: { code: selectedProvince.code } })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((body) => body.items)
    : [];
  const selectedWard = phuong ? initialWards.find((w) => w.slug === phuong) : undefined;

  const cafesRes = await client.api.cafes.$get({
    query: {
      ...(tinh && { province: tinh }),
      ...(phuong && { ward: phuong }),
      ...(page && { page }),
      ...(filters.venueType && { venueType: filters.venueType }),
      ...(filters.byog && { byog: 'true' }),
      ...(filters.food && { food: 'true' }),
      ...(filters.privateRoom && { privateRoom: 'true' }),
      ...(filters.largeTables && { largeTables: 'true' }),
      ...(filters.free && { free: 'true' }),
      ...(filters.openNow && { openNow: 'true' }),
    },
  });
  if (!cafesRes.ok) throw new Error('Không tải được danh sách địa điểm chơi');
  const { items, page: currentPage, pageSize, total } = await cafesRes.json();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Địa điểm chơi có game</h1>

      <CafeFilters
        provinces={provinces}
        initialProvinceCode={selectedProvince?.code}
        initialWardCode={selectedWard?.code}
        initialWards={initialWards}
        initialFilters={filters}
      />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có địa điểm nào phù hợp.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cafe) => {
            const statusText = openStatusLabel(cafe.openStatus);
            return (
              <li key={cafe.id}>
                <Link
                  href={`/cafes/${cafe.slug}`}
                  className="hover:border-foreground/40 block h-full rounded-lg border p-4 transition"
                >
                  <h2 className="font-medium">{cafe.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    {VENUE_TYPE_LABELS[cafe.venueType]}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {cafe.wardName}, {cafe.provinceName}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">{cafe.addressLine}</p>
                  <p className="mt-2 text-xs">{cafe.gameCount} game</p>
                  {statusText ? <p className="mt-1 text-xs font-medium">{statusText}</p> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (tinh) params.set('province', tinh);
            if (phuong) params.set('phuong', phuong);
            if (filters.venueType) params.set('venueType', filters.venueType);
            for (const key of [
              'byog',
              'food',
              'privateRoom',
              'largeTables',
              'free',
              'openNow',
            ] as const) {
              if (filters[key]) params.set(key, 'true');
            }
            params.set('page', String(p));
            return (
              <Link
                key={p}
                href={`/cafes?${params.toString()}`}
                className={p === currentPage ? 'font-semibold underline' : 'text-muted-foreground'}
              >
                {p}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </main>
  );
}
