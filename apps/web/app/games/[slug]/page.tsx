import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, serverApi } from '@/lib/api-server';
import { parseVideoEmbed } from '@/lib/video-embed';

const DESCRIPTION_LABEL = {
  original: 'Mô tả do cộng đồng viết · CC BY-SA 4.0',
} as const;

const CATEGORY_GROUP_LABEL = { category: 'Thể loại', mechanic: 'Cơ chế' } as const;

export async function generateMetadata(props: PageProps<'/games/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: `${slug} · Onboard VN` };
}

export default async function GameDetailPage(props: PageProps<'/games/[slug]'>) {
  const { slug } = await props.params;
  const client = await serverApi();
  const res = await client.api.games[':slug'].$get({ param: { slug } });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error('Không tải được game');
  const game = await res.json();

  const cafesRes = await client.api.games[':slug'].cafes.$get({ param: { slug } });
  const cafesForGame = cafesRes.ok ? await cafesRes.json() : [];

  const user = await getCurrentUser();
  const canEditDescription = Boolean(user && user.role !== 'user');
  const categoryGroups = (['category', 'mechanic'] as const).map((kind) => ({
    kind,
    items: game.categories.filter((c) => c.kind === kind),
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{game.nameVi || game.nameEn}</h1>
        {game.isVietnamese ? <Badge variant="secondary">Việt hóa</Badge> : null}
      </div>
      {game.nameVi ? <p className="text-muted-foreground">{game.nameEn}</p> : null}

      {game.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from local upload storage, not an optimizable remote host
        <img
          src={game.imageUrl}
          alt={game.nameVi ?? game.nameEn}
          className="max-h-96 w-full rounded-lg object-cover"
        />
      ) : null}
      {game.imageCredit ? (
        <p className="text-muted-foreground text-xs">Ảnh: {game.imageCredit}</p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Số người chơi</dt>
          <dd>
            {game.minPlayers ?? '?'}-{game.maxPlayers ?? '?'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Thời gian</dt>
          <dd>{game.playMinutes ? `${game.playMinutes} phút` : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Độ khó</dt>
          <dd>{game.weight ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tuổi tối thiểu</dt>
          <dd>{game.minAge ?? '—'}</dd>
        </div>
      </dl>

      {categoryGroups.map(({ kind, items }) =>
        items.length > 0 ? (
          <div key={kind}>
            <h2 className="text-muted-foreground text-xs font-medium">
              {CATEGORY_GROUP_LABEL[kind]}
            </h2>
            <div className="mt-1 flex flex-wrap gap-1">
              {items.map((c) => (
                <Badge key={c.id} variant="outline">
                  {c.nameVi ?? c.name}
                  {c.nameVi ? (
                    <span className="text-muted-foreground ml-1 text-[10px]">{c.name}</span>
                  ) : null}
                </Badge>
              ))}
            </div>
          </div>
        ) : null,
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">Giới thiệu</h2>
        {game.descriptionVi ? (
          <>
            <p className="text-sm leading-relaxed whitespace-pre-line">{game.descriptionVi}</p>
            <p className="text-muted-foreground text-xs">
              {game.descriptionSource === 'translated_with_permission'
                ? `Bản dịch được ${game.descriptionRightsHolder ?? 'NPH'} cho phép`
                : DESCRIPTION_LABEL.original}
            </p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Chưa có mô tả tiếng Việt — bạn có thể đóng góp.{' '}
            <Link
              href={canEditDescription ? `/admin/games/${game.slug}/edit` : '/login'}
              className="font-medium underline"
            >
              {canEditDescription ? 'Chỉnh sửa mô tả' : 'Đăng nhập để đóng góp'}
            </Link>
          </p>
        )}
        {game.bggUrl ? (
          <a
            href={game.bggUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium underline"
          >
            Xem mô tả gốc trên BGG (EN)
          </a>
        ) : null}

        {game.videoUrls.length > 0 ? (
          <div className="mt-2 flex flex-col gap-3">
            {game.videoUrls.map((url) => {
              const embed = parseVideoEmbed(url);
              if (!embed) return null;
              return embed.type === 'youtube' ? (
                <iframe
                  key={url}
                  src={embed.embedUrl}
                  loading="lazy"
                  allowFullScreen
                  className="aspect-video w-full rounded-lg"
                  title="Video giới thiệu game"
                />
              ) : (
                <a
                  key={url}
                  href={embed.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium underline"
                >
                  Xem video trên Facebook
                </a>
              );
            })}
          </div>
        ) : null}
      </section>

      {cafesForGame.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium">Nơi chơi</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {cafesForGame.map((cafe) => (
              <li key={cafe.id}>
                <Link
                  href={`/cafes/${cafe.slug}`}
                  className="hover:border-foreground/40 block rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">{cafe.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {cafe.addressLine}, {cafe.wardName}, {cafe.provinceName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {game.barcodes.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium">Mã vạch</h2>
          <ul className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
            {game.barcodes.map((b) => (
              <li key={b.code}>
                {b.code}
                {b.edition ? ` (${b.edition})` : ''}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
