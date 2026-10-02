import type { MeetupListResponse } from '@onboard/shared';
import { Text } from 'react-native';
import { api } from '../../api/client';
import { formatVnDateTime } from '../../features/admin/format';
import { ActionButton, AdminPage, ListCard, LoadState, Row } from '../../features/admin/ui';
import { colors } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

const load = () => api<MeetupListResponse>('/events-admin');

export default function AdminEventsPage() {
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage title={`Quản lý Kèo${data ? ` (${data.total})` : ''}`}>
      <LoadState loading={list.loading && !data} error={list.error} onRetry={list.reload} />
      {data ? (
        <ListCard>
          {data.items.map((meetup) => (
            <Row
              key={meetup.id}
              title={
                <>
                  {meetup.title}
                  {meetup.status === 'cancelled' ? (
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '400' }}>
                      {' '}
                      Đã hủy
                    </Text>
                  ) : null}
                </>
              }
              subtitle={`${formatVnDateTime(meetup.startsAt)} · ${meetup.locationLabel} · ${meetup.visibility}`}
              right={
                meetup.status === 'scheduled' ? (
                  <ActionButton
                    danger
                    label="Hủy"
                    failure="Không hủy được, thử lại sau"
                    confirmText={`Hủy Kèo "${meetup.title}"?`}
                    run={async () => {
                      await api(`/events-admin/${meetup.id}`, { method: 'DELETE' });
                      list.reload();
                    }}
                  />
                ) : undefined
              }
            />
          ))}
        </ListCard>
      ) : null}
    </AdminPage>
  );
}
