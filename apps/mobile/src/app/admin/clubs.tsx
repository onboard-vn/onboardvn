import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { ClubAdminListResponse } from '@onboard/shared';
import { api } from '../../api/client';
import { ActionButton, AdminPage, ListCard, LoadState, Row } from '../../features/admin/ui';
import { useLoad } from '../../ui/use-load';

const VISIBILITY_LABELS = { public: 'Công khai', private: 'Riêng tư' } as const;

const load = () => api<ClubAdminListResponse>('/clubs-admin');

export default function AdminClubsPage() {
  useAppPreferences();
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage
      title={data ? t('Quản lý club ({count})', { count: data.items.length }) : t('Quản lý club')}
    >
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {data ? (
        <ListCard>
          {data.items.map((club) => (
            <Row
              key={club.id}
              title={club.name}
              subtitle={`${club.slug} · ${t('{count} thành viên', { count: club.memberCount })} · ${t(VISIBILITY_LABELS[club.visibility])}`}
              right={
                <ActionButton
                  danger
                  label={t('Xóa')}
                  failure={t('Không xóa được, thử lại sau')}
                  confirmText={t('Xóa club "{name}"? Kèo của club sẽ chuyển sang riêng tư.', {
                    name: club.name,
                  })}
                  run={async () => {
                    await api(`/clubs-admin/${club.id}`, { method: 'DELETE' });
                    list.reload();
                  }}
                />
              }
            />
          ))}
        </ListCard>
      ) : null}
    </AdminPage>
  );
}
