import type { Metadata } from 'next';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { GameForm } from '../game-form';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Thêm game · ${SITE_NAME}` };

export default async function NewGamePage() {
  await requireStaff();

  const res = await (await serverApi()).api.categories.$get({ query: {} });
  const categories = res.ok ? (await res.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Thêm game</h1>
      <GameForm categories={categories} />
    </main>
  );
}
