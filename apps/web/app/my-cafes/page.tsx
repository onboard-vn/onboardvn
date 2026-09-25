import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `Địa điểm chơi của tôi · ${SITE_NAME}`,
  robots: { index: false },
};

const CONSENT_LABEL: Record<string, string> = {
  granted: 'Đang hiển thị công khai',
  public_info_only: 'Chỉ hiện thông tin cơ bản',
  declined: 'Đã ẩn khỏi công khai',
  pending: 'Chờ xác nhận',
};

export default async function MyCafesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/my-cafes');

  const res = await (await serverApi()).api.me.cafes.$get();
  const items = res.ok ? (await res.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Địa điểm chơi của tôi</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Bạn chưa quản lý quán nào. Dùng link mời từ quản trị viên để trở thành chủ quán.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.cafeId}
              className="flex items-center justify-between gap-2 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">{item.cafeName}</p>
                <p className="text-muted-foreground text-xs">
                  {item.role === 'owner' ? 'Chủ quán' : 'Nhân viên'} ·{' '}
                  {CONSENT_LABEL[item.consentStatus] ?? item.consentStatus}
                </p>
              </div>
              <Link href={`/my-cafes/${item.cafeId}`} className="text-sm font-medium underline">
                Quản lý
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
