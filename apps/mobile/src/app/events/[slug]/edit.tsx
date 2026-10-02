import type { MeetupDetailDto, ProvinceListResponse } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { api } from '../../../api/client';
import { RequireLogin } from '../../../auth/require-login';
import { useSession } from '../../../auth/session';
import { EventForm } from '../../../features/events/event-form';
import { LoadGate, Muted, Page, Title } from '../../../features/events/ui';
import { useFetch } from '../../../features/use-fetch';

function Edit({ slug, userId }: { slug: string; userId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [meetup, provinces] = await Promise.all([
        api<MeetupDetailDto>(`/events/${encodeURIComponent(slug)}`, { signal }),
        api<ProvinceListResponse>('/locations/provinces', { signal }).then(
          (r) => r.items,
          () => [],
        ),
      ]);
      return { meetup, provinces };
    },
    [slug],
  );
  const { data, error, status, loading } = useFetch(load);
  const meetup = data?.meetup;

  return (
    <LoadGate
      loading={loading}
      error={status === 404 ? 'Không tìm thấy Kèo' : error}
      hasData={!!data}
    >
      {data && meetup && meetup.createdBy.id === userId ? (
        <EventForm
          provinces={data.provinces}
          mode="edit"
          initial={{
            id: meetup.id,
            title: meetup.title,
            description: meetup.description,
            startsAt: meetup.startsAt,
            endsAt: meetup.endsAt,
            cafe: meetup.cafe,
            addressLine: meetup.addressLine,
            provinceCode: meetup.provinceCode,
            wardCode: meetup.wardCode,
            capacity: meetup.capacity,
            visibility: meetup.visibility,
          }}
        />
      ) : (
        <Muted>Không tìm thấy Kèo</Muted>
      )}
    </LoadGate>
  );
}

export default function EditEventPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  return (
    <Page maxWidth={576}>
      <Stack.Screen options={{ title: 'Sửa kèo' }} />
      <RequireLogin reason="Đăng nhập để sửa kèo.">
        <Title>Sửa kèo</Title>
        {user ? <Edit slug={slug} userId={user.id} /> : null}
      </RequireLogin>
    </Page>
  );
}
