import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import type { GameListResponse } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { api } from '../../../api/client';
import {
  ActionButton,
  AdminPage,
  ListCard,
  LoadState,
  Row,
  SmallButton,
} from '../../../features/admin/ui';
import { Button } from '../../../ui/primitives';
import { useLoad } from '../../../ui/use-load';

const load = () => api<GameListResponse>('/games', { query: { pageSize: 50 } });

export default function AdminGamesPage() {
  useAppPreferences();
  const router = useRouter();
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage
      title={data ? t('Quản lý game ({count})', { count: data.total }) : t('Quản lý game')}
      action={<Button label={t('Thêm game')} onPress={() => router.push('/admin/games/new')} />}
    >
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {data ? (
        <ListCard>
          {data.items.map((game) => {
            const name = game.nameVi || game.nameEn;
            return (
              <Row
                key={game.id}
                title={name}
                subtitle={game.slug}
                right={
                  <>
                    <SmallButton
                      label={t('Sửa')}
                      onPress={() =>
                        router.push({
                          pathname: '/admin/games/[slug]/edit',
                          params: { slug: game.slug },
                        })
                      }
                    />
                    <ActionButton
                      danger
                      label={t('Xóa')}
                      confirmText={t('Xóa game "{name}"?', { name })}
                      run={async () => {
                        await api(`/games/${game.id}`, { method: 'DELETE' });
                        list.reload();
                      }}
                    />
                  </>
                }
              />
            );
          })}
        </ListCard>
      ) : null}
    </AdminPage>
  );
}
