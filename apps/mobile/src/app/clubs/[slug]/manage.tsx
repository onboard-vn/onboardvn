import type { ClubDetailDto, ClubExternalMembersResponse } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { api } from '../../../api/client';
import { RequireLogin } from '../../../auth/require-login';
import { useSession } from '../../../auth/session';
import { ClubManagePanel } from '../../../features/clubs/club-manage-panel';
import { LoadGate, Muted, Page, Title } from '../../../features/events/ui';
import { useFetch } from '../../../features/use-fetch';

function Manage({ slug, viewerId }: { slug: string; viewerId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const detail = await api<ClubDetailDto>(`/clubs/${encodeURIComponent(slug)}`, { signal });
      const external = detail.club.id
        ? await api<ClubExternalMembersResponse>(`/clubs/${detail.club.id}/external-members`, {
            signal,
          }).then(
            (r) => r.items,
            () => [],
          )
        : [];
      return { detail, external };
    },
    [slug],
  );
  const { data, error, status, loading, reload } = useFetch(load);
  const club = data?.detail.club;
  const myRole = data?.detail.myRole;
  const allowed = !!club?.id && (myRole === 'owner' || myRole === 'admin');

  return (
    <LoadGate
      loading={loading}
      error={status === 404 ? 'Không tìm thấy club' : error}
      hasData={!!data}
    >
      {data && club && allowed && myRole ? (
        <>
          <Stack.Screen options={{ title: 'Quản lý club' }} />
          <Title>Quản lý {club.name}</Title>
          <ClubManagePanel
            club={{
              id: club.id as string,
              slug: club.slug,
              name: club.name,
              description: club.description,
            }}
            myRole={myRole}
            viewerId={viewerId}
            members={data.detail.members ?? []}
            externalMembers={data.external}
            onChanged={reload}
          />
        </>
      ) : (
        <Muted>Không tìm thấy club</Muted>
      )}
    </LoadGate>
  );
}

export default function ManageClubPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  return (
    <Page>
      <Stack.Screen options={{ title: 'Quản lý club' }} />
      <RequireLogin reason="Đăng nhập để quản lý club.">
        {user ? <Manage slug={slug} viewerId={user.id} /> : null}
      </RequireLogin>
    </Page>
  );
}
