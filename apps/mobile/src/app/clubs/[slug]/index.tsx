import type { ClubDetailDto, MeetupListResponse } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { api } from '../../../api/client';
import { useSession } from '../../../auth/session';
import { LeaveClubButton } from '../../../features/clubs/leave-club-button';
import { ROLE_LABEL } from '../../../features/clubs/club-manage-panel';
import { formatVnDateTime } from '../../../features/events/time';
import {
  Body,
  CardLink,
  LinkBtn,
  ListBox,
  LoadGate,
  Muted,
  Page,
  Row,
  SectionTitle,
  TextLink,
  Title,
} from '../../../features/events/ui';
import { useFetch } from '../../../features/use-fetch';
import { colors, space } from '../../../ui/theme';

interface ClubView {
  detail: ClubDetailDto;
  meetups: MeetupListResponse['items'];
}

export default function ClubDetailPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useSession();
  const userId = user?.id;
  const load = useCallback(
    async (signal: AbortSignal): Promise<ClubView> => {
      void userId;
      const detail = await api<ClubDetailDto>(`/clubs/${encodeURIComponent(slug)}`, { signal });
      const meetups =
        detail.club.id && detail.myRole
          ? await api<MeetupListResponse>('/events', {
              query: { clubId: detail.club.id, pageSize: 20 },
              signal,
            }).then(
              (r) => r.items,
              () => [],
            )
          : [];
      return { detail, meetups };
    },
    [slug, userId],
  );
  const { data, error, status, loading } = useFetch(load);

  const detail = data?.detail;
  const club = detail?.club;
  const myRole = detail?.myRole ?? null;
  const canManage = myRole === 'owner' || myRole === 'admin';
  const meetups = data?.meetups ?? [];

  return (
    <Page>
      <Stack.Screen options={{ title: club?.name ?? 'Club' }} />
      <LoadGate
        loading={loading}
        error={status === 404 ? 'Không tìm thấy club' : error}
        hasData={!!detail}
      >
        {detail && club ? (
          <>
            <View style={{ gap: 4 }}>
              <Title>{club.name}</Title>
              <Muted>
                {detail.memberCount} thành viên · Club riêng tư
                {myRole ? ` · ${ROLE_LABEL[myRole]}` : ''}
              </Muted>
              {club.description ? <Body>{club.description}</Body> : null}
            </View>

            {!myRole ? (
              <Muted>
                {user
                  ? 'Đây là club riêng tư. Hãy mở link mời từ quản trị viên để tham gia.'
                  : 'Đăng nhập và mở link mời để tham gia club này.'}
              </Muted>
            ) : (
              <>
                <Row>
                  <LinkBtn small label="Tạo Kèo cho club" to={`/events/new?club=${club.slug}`} />
                  {canManage ? (
                    <LinkBtn
                      small
                      variant="outline"
                      label="Quản lý"
                      to={`/clubs/${club.slug}/manage`}
                    />
                  ) : null}
                  {myRole !== 'owner' && club.id ? <LeaveClubButton clubId={club.id} /> : null}
                </Row>

                <View style={{ gap: space.md }}>
                  <SectionTitle>Kèo sắp tới ({meetups.length})</SectionTitle>
                  {meetups.length === 0 ? (
                    <Muted>Chưa có Kèo nào.</Muted>
                  ) : (
                    meetups.map((meetup) => (
                      <CardLink key={meetup.id} to={`/events/${meetup.slug}`}>
                        <Body bold>{meetup.title}</Body>
                        <Muted>
                          {formatVnDateTime(meetup.startsAt)} · {meetup.locationLabel}
                        </Muted>
                      </CardLink>
                    ))
                  )}
                </View>

                <View style={{ gap: space.md }}>
                  <SectionTitle>Thành viên ({detail.memberCount})</SectionTitle>
                  <ListBox>
                    {(detail.members ?? []).map((m) => (
                      <View
                        key={m.user.id}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.surfaceMuted,
                        }}
                      >
                        <Row style={{ justifyContent: 'space-between' }}>
                          {m.user.username ? (
                            <TextLink to={`/u/${m.user.username}`}>
                              {m.user.displayUsername ?? m.user.name}
                            </TextLink>
                          ) : (
                            <Body>{m.user.name}</Body>
                          )}
                          <Muted small>{ROLE_LABEL[m.role]}</Muted>
                        </Row>
                      </View>
                    ))}
                  </ListBox>
                </View>
              </>
            )}
          </>
        ) : null}
      </LoadGate>
    </Page>
  );
}
