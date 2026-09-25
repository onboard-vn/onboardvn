import type { Metadata } from 'next';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { ScanSession } from '@/components/scan-session';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Quét mã vạch · ${SITE_NAME}` };

export default async function ScanPage() {
  await requireStaff();

  const res = await (await serverApi()).api.cafes.manage.$get({ query: { pageSize: '50' } });
  const cafes = res.ok ? (await res.json()).items.map((c) => ({ id: c.id, name: c.name })) : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Quét mã vạch</h1>
        <p className="text-muted-foreground text-sm">
          Quét liên tục nhiều hộp game, chọn quán rồi thêm vào kho bằng một lần bấm.
        </p>
      </div>
      <ScanSession cafes={cafes} />
    </main>
  );
}
