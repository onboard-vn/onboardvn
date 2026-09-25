import type { Metadata } from 'next';
import { AdminEventsCancelButton } from './cancel-button';
import { serverApi } from '@/lib/api-server';
import { formatVnDateTime } from '@/lib/events-time';
import { requireStaff } from '@/lib/require-staff';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Quản lý Kèo · ${SITE_NAME}` };

export default async function AdminEventsPage() {
  await requireStaff();

  const res = await (await serverApi()).api['events-admin'].$get();
  if (!res.ok) throw new Error('Không tải được danh sách Kèo');
  const { items, total } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Quản lý Kèo ({total})</h1>

      <ul className="flex flex-col divide-y rounded-lg border">
        {items.map((meetup) => (
          <li key={meetup.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">
                {meetup.title}
                {meetup.status === 'cancelled' ? (
                  <span className="text-destructive ml-2 text-xs font-normal">Đã hủy</span>
                ) : null}
              </p>
              <p className="text-muted-foreground text-xs">
                {formatVnDateTime(meetup.startsAt)} · {meetup.locationLabel} · {meetup.visibility}
              </p>
            </div>
            {meetup.status === 'scheduled' ? (
              <AdminEventsCancelButton id={meetup.id} title={meetup.title} />
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
