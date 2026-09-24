import type { Metadata } from 'next';
import Link from 'next/link';
import { serverApi } from '@/lib/api-server';
import { CafeFilters } from './cafe-filters';

export const metadata: Metadata = { title: 'Quán · Onboard VN' };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CafesPage(props: PageProps<'/cafes'>) {
  const sp = await props.searchParams;
  const tinh = firstValue(sp.tinh);
  const phuong = firstValue(sp.phuong);
  const page = firstValue(sp.page);

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
    },
  });
  if (!cafesRes.ok) throw new Error('Không tải được danh sách quán');
  const { items, page: currentPage, pageSize, total } = await cafesRes.json();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Quán có game</h1>

      <CafeFilters
        provinces={provinces}
        initialProvinceCode={selectedProvince?.code}
        initialWardCode={selectedWard?.code}
        initialWards={initialWards}
      />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Chưa có quán nào phù hợp.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cafe) => (
            <li key={cafe.id}>
              <Link
                href={`/cafes/${cafe.slug}`}
                className="hover:border-foreground/40 block h-full rounded-lg border p-4 transition"
              >
                <h2 className="font-medium">{cafe.name}</h2>
                <p className="text-muted-foreground text-sm">
                  {cafe.wardName}, {cafe.provinceName}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{cafe.addressLine}</p>
                <p className="mt-2 text-xs">{cafe.gameCount} game</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
            const params = new URLSearchParams();
            if (tinh) params.set('tinh', tinh);
            if (phuong) params.set('phuong', phuong);
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
