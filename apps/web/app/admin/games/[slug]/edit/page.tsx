import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { BarcodeManager } from '../../barcode-manager';
import { GameForm } from '../../game-form';
import { RevisionsList } from '../../revisions-list';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Sửa game · ${SITE_NAME}` };

export default async function EditGamePage(props: PageProps<'/admin/games/[slug]/edit'>) {
  await requireStaff();
  const { slug } = await props.params;

  const client = await serverApi();
  const [gameRes, categoriesRes, revisionsRes] = await Promise.all([
    client.api.games[':slug'].$get({ param: { slug } }),
    client.api.categories.$get({ query: {} }),
    client.api.games[':slug'].revisions.$get({ param: { slug } }),
  ]);

  if (gameRes.status === 404) notFound();
  if (!gameRes.ok) throw new Error('Không tải được game');

  const game = await gameRes.json();
  const categories = categoriesRes.ok ? (await categoriesRes.json()).items : [];
  const revisions = revisionsRes.ok ? (await revisionsRes.json()).items : [];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Sửa game</h1>
      <GameForm categories={categories} initial={game} />
      <BarcodeManager gameId={game.id} barcodes={game.barcodes} />
      <RevisionsList revisions={revisions} />
    </main>
  );
}
