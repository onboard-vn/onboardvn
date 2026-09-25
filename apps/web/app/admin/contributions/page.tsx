import type { Metadata } from 'next';
import { serverApi } from '@/lib/api-server';
import { formatVnDateTime } from '@/lib/events-time';
import { requireAdmin } from '@/lib/require-staff';
import { SITE_NAME } from '@/lib/site';
import { ContributionActions } from './contribution-actions';

export const metadata: Metadata = { title: `Quản lý đóng góp cộng đồng · ${SITE_NAME}` };

function normalizeFilterParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function AdminContributionsPage(props: PageProps<'/admin/contributions'>) {
  await requireAdmin();
  const searchParams = await props.searchParams;
  const userId = normalizeFilterParam(searchParams.userId);
  const cafeId = normalizeFilterParam(searchParams.cafeId);

  const res = await (
    await serverApi()
  ).api.admin.contributions.$get({
    query: { userId, cafeId, pageSize: '100' },
  });
  const invalidFilter = res.status === 422;
  if (!res.ok && !invalidFilter) throw new Error('Không tải được danh sách đóng góp');
  const { items, total } = invalidFilter ? { items: [], total: 0 } : await res.json();

  const seenUsers = new Map<string, string>();
  for (const item of items) {
    if (item.userId) seenUsers.set(item.userId, item.userName ?? item.userId);
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Đóng góp cộng đồng ({total})</h1>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="userId" className="font-medium">
            User ID
          </label>
          <input
            id="userId"
            name="userId"
            defaultValue={userId}
            className="border-input h-9 rounded-md border bg-transparent px-3 dark:bg-input/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="cafeId" className="font-medium">
            Café ID
          </label>
          <input
            id="cafeId"
            name="cafeId"
            defaultValue={cafeId}
            className="border-input h-9 rounded-md border bg-transparent px-3 dark:bg-input/30"
          />
        </div>
        <button type="submit" className="h-9 rounded-md border px-3 font-medium">
          Lọc
        </button>
      </form>

      {invalidFilter ? <p className="text-destructive text-sm">Bộ lọc không hợp lệ</p> : null}

      {seenUsers.size > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
          <h2 className="text-sm font-medium">Thao tác theo người đóng góp</h2>
          <ul className="flex flex-col gap-2">
            {[...seenUsers.entries()].map(([id, name]) => (
              <li key={id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {name} <span className="text-muted-foreground text-xs">({id})</span>
                </span>
                <ContributionActions userId={id} userName={name} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="flex flex-col divide-y rounded-lg border text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{item.gameNameEn}</p>
              <p className="text-muted-foreground text-xs">
                {item.cafeName} · {item.userName ?? 'Không rõ người dùng'} ·{' '}
                {formatVnDateTime(item.createdAt)}
              </p>
            </div>
          </li>
        ))}
        {items.length === 0 ? (
          <li className="text-muted-foreground px-4 py-3">Chưa có đóng góp nào khớp bộ lọc.</li>
        ) : null}
      </ul>
    </main>
  );
}
