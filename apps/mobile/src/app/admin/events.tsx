import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import type { MeetupListResponse } from '@onboard/shared';
import { Text } from 'react-native';
import { api } from '../../api/client';
import { formatVnDateTime } from '../../features/admin/format';
import { ActionButton, AdminPage, ListCard, LoadState, Row } from '../../features/admin/ui';
import { colors } from '../../ui/theme';
import { useLoad } from '../../ui/use-load';

const VISIBILITY_LABELS = {
  public: 'Công khai',
  friends: 'Bạn bè',
  private: 'Riêng tư',
  club: 'Thành viên club',
} as const;

const load = () => api<MeetupListResponse>('/events-admin');

export default function AdminEventsPage() {
  useAppPreferences();
  const list = useLoad(load, []);
  const { data } = list;

  return (
    <AdminPage title={data ? t('Quản lý Kèo ({count})', { count: data.total }) : t('Quản lý Kèo')}>
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
                      {t('Đã hủy')}
                    </Text>
                  ) : null}
                </>
              }
              subtitle={`${formatVnDateTime(meetup.startsAt)} · ${meetup.locationLabel} · ${t(VISIBILITY_LABELS[meetup.visibility])}`}
              right={
                meetup.status === 'scheduled' ? (
                  <ActionButton
                    danger
                    label={t('Hủy')}
                    failure={t('Không hủy được, thử lại sau')}
                    confirmText={t('Hủy Kèo "{title}"?', { title: meetup.title })}
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
