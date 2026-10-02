import type { CategoryDto, GameDetailDto, GameRevisionDto } from '@onboard/shared';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../../../api/client';
import { BarcodeManager } from '../../../../features/admin/barcode-manager';
import { GameForm } from '../../../../features/admin/game-form';
import { RevisionsList } from '../../../../features/admin/revisions-list';
import { AdminPage, LoadState } from '../../../../features/admin/ui';
import { Hint } from '../../../../ui/primitives';
import { useLoad } from '../../../../ui/use-load';

interface Loaded {
  game: GameDetailDto;
  categories: CategoryDto[];
  revisions: GameRevisionDto[];
}

async function loadGame(slug: string): Promise<Loaded | null> {
  const [game, categories, revisions] = await Promise.all([
    api<GameDetailDto>(`/games/${encodeURIComponent(slug)}`).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }),
    api<{ items: CategoryDto[] }>('/categories')
      .then((r) => r.items)
      .catch(() => []),
    api<{ items: GameRevisionDto[] }>(`/games/${encodeURIComponent(slug)}/revisions`)
      .then((r) => r.items)
      .catch(() => []),
  ]);
  return game ? { game, categories, revisions } : null;
}

export default function EditGamePage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const state = useLoad(() => loadGame(slug), [slug]);
  const data = state.data;

  return (
    <AdminPage title="Sửa game" width={672}>
      <LoadState
        loading={state.loading && data === undefined}
        error={state.error}
        onRetry={state.reload}
      />
      {data === null ? <Hint>Không tìm thấy game.</Hint> : null}
      {data ? (
        <>
          <GameForm categories={data.categories} initial={data.game} />
          <BarcodeManager
            gameId={data.game.id}
            barcodes={data.game.barcodes}
            onChanged={state.reload}
          />
          <RevisionsList revisions={data.revisions} />
        </>
      ) : null}
    </AdminPage>
  );
}
