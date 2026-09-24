import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { serverApi } from '@/lib/api-server';
import { requireStaff } from '@/lib/require-staff';
import { DeleteGameButton } from './delete-game-button';

export const metadata: Metadata = { title: 'Quản lý game · Onboard VN' };

export default async function AdminGamesPage() {
  await requireStaff();

  const res = await (await serverApi()).api.games.$get({ query: { pageSize: '50' } });
  if (!res.ok) throw new Error('Không tải được danh sách game');
  const { items, total } = await res.json();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Quản lý game ({total})</h1>
        <Button render={<Link href="/admin/games/new" />}>Thêm game</Button>
      </div>

      <ul className="flex flex-col divide-y rounded-lg border">
        {items.map((game) => (
          <li key={game.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{game.nameVi || game.nameEn}</p>
              <p className="text-muted-foreground text-xs">{game.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/admin/games/${game.slug}/edit`} />}
              >
                Sửa
              </Button>
              <DeleteGameButton id={game.id} name={game.nameVi || game.nameEn} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
