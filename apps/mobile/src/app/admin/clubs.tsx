import type { ClubAdminListResponse } from '@onboard/shared';
import { api } from '../../api/client';
import { ActionButton, AdminPage, ListCard, LoadState, Row } from '../../features/admin/ui';
import { useLoad } from '../../ui/use-load';

const load = () => api<ClubAdminListResponse>('/clubs-admin');

export default function AdminClubsPage() {
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage title={`Quản lý club${data ? ` (${data.items.length})` : ''}`}>
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {data ? (
        <ListCard>
          {data.items.map((club) => (
            <Row
              key={club.id}
              title={club.name}
              subtitle={`${club.slug} · ${club.memberCount} thành viên · ${club.visibility}`}
              right={
                <ActionButton
                  danger
                  label="Xóa"
                  failure="Không xóa được, thử lại sau"
                  confirmText={`Xóa club "${club.name}"? Kèo của club sẽ chuyển sang riêng tư.`}
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
