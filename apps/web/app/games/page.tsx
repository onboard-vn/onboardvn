import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { serverApi } from '@/lib/api-server';
import { GameFilters, type GameFiltersValues } from './game-filters';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `Danh mục game · ${SITE_NAME}` };

const FILTER_KEYS = ['q', 'players', 'maxTime', 'maxWeight', 'categoryId'] as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildPageHref(sp: Record<string, string | string[] | undefined>, page: number): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = firstValue(sp[key]);
    if (value) params.set(key, value);
  }
  params.set('page', String(page));
  return `/games?${params.toString()}`;
}

export default async function GamesPage(props: PageProps<'/games'>) {
  const sp = await props.searchParams;
  const query: Record<string, string> = {};
  for (const key of [...FILTER_KEYS, 'page'] as const) {
    const value = firstValue(sp[key]);
    if (value) query[key] = value;
  }

  const client = await serverApi();
  const [gamesRes, categoriesRes] = await Promise.all([
    client.api.games.$get({ query }),
    client.api.categories.$get({ query: {} }),
  ]);

  if (!gamesRes.ok) throw new Error('Không tải được danh sách game');
  const { items, page, pageSize, total } = await gamesRes.json();
  const categories = categoriesRes.ok ? (await categoriesRes.json()).items : [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const initialValues: GameFiltersValues = {};
  for (const key of FILTER_KEYS) {
    const value = firstValue(sp[key]);
    if (value) initialValues[key] = value;
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Danh mục game</h1>

      <GameFilters categories={categories} initialValues={initialValues} />

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Không tìm thấy game phù hợp.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((game) => (
            <li key={game.id}>
              <Link
                href={`/games/${game.slug}`}
                className="hover:border-foreground/40 block h-full rounded-lg border p-4 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-medium">{game.nameVi || game.nameEn}</h2>
                  {game.isVietnamese ? <Badge variant="secondary">Việt hóa</Badge> : null}
                </div>
                {game.nameVi ? (
                  <p className="text-muted-foreground text-sm">{game.nameEn}</p>
                ) : null}
                <dl className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {game.minPlayers || game.maxPlayers ? (
                    <span>
                      {game.minPlayers ?? '?'}-{game.maxPlayers ?? '?'} người
                    </span>
                  ) : null}
                  {game.playMinutes ? <span>{game.playMinutes} phút</span> : null}
                  {game.weight ? <span>Độ khó {game.weight}</span> : null}
                </dl>
                {game.categories.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {game.categories.map((c) => (
                      <Badge key={c.id} variant="outline">
                        {c.nameVi ?? c.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildPageHref(sp, p)}
              className={p === page ? 'font-semibold underline' : 'text-muted-foreground'}
            >
              {p}
            </Link>
          ))}
        </nav>
      ) : null}
    </main>
  );
}
