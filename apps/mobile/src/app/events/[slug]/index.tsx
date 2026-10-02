import type { MeetupDetailDto } from '@onboard/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../../api/client';
import { useSession } from '../../../auth/session';
import { CreateTableForm } from '../../../features/events/create-table-form';
import { CreatorActions } from '../../../features/events/creator-actions';
import { RsvpButtons } from '../../../features/events/rsvp-buttons';
import { SessionTableCard } from '../../../features/events/table-card';
import { formatVnDateTime } from '../../../features/events/time';
import {
  Body,
  LoadGate,
  Muted,
  Page,
  SectionTitle,
  TextLink,
  Title,
} from '../../../features/events/ui';
import { useFetch } from '../../../features/use-fetch';
import { colors, space } from '../../../ui/theme';

export default function EventDetailPage() {
  const params = useLocalSearchParams<{ slug: string; code?: string | string[] }>();
  const slug = params.slug;
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const { user, loading: sessionLoading } = useSession();
  const userId = user?.id;

  const load = useCallback(
    (signal: AbortSignal) => {
      void userId;
      return api<MeetupDetailDto>(`/events/${encodeURIComponent(slug)}`, {
        query: { code },
        signal,
      });
    },
    [slug, code, userId],
  );
  const { data: meetup, error, status, loading, reload } = useFetch(load);

  const isCreator = !!user && !!meetup && user.id === meetup.createdBy.id;
  const viewerTableId =
    (user && meetup?.tables.find((t) => t.seatedUsers.some((u) => u.id === user.id))?.id) ?? null;
  const viewerGoing = meetup?.viewerStatus === 'going';
  const loginNext = encodeURIComponent(`/events/${slug}${code ? `?code=${code}` : ''}`);

  return (
    <Page>
      <Stack.Screen options={{ title: meetup?.title ?? 'Kèo' }} />
      <LoadGate
        loading={loading}
        error={status === 404 ? 'Không tìm thấy Kèo' : error}
        hasData={!!meetup}
      >
        {meetup ? (
          <>
            <View style={{ gap: space.sm }}>
              {meetup.status === 'cancelled' ? (
                <Text style={styles.cancelled}>Kèo này đã bị hủy</Text>
              ) : null}
              <Title>{meetup.title}</Title>
              {meetup.club ? (
                <Body>
                  Club: <TextLink to={`/clubs/${meetup.club.slug}`}>{meetup.club.name}</TextLink>
                </Body>
              ) : null}
              <Muted>{formatVnDateTime(meetup.startsAt)}</Muted>
              {meetup.cafe ? (
                <TextLink to={`/cafes/${meetup.cafe.slug}`}>{meetup.locationLabel}</TextLink>
              ) : (
                <Body>{meetup.locationLabel}</Body>
              )}
              {meetup.description ? <Body>{meetup.description}</Body> : null}
              <Muted small>
                {meetup.goingCount}
                {meetup.capacity ? `/${meetup.capacity}` : ''} người đi
                {meetup.viewerStatus === 'waitlist' ? ' · bạn đang trong danh sách chờ' : ''}
              </Muted>
            </View>

            {user && meetup.status === 'scheduled' ? (
              <RsvpButtons
                meetupId={meetup.id}
                code={code}
                viewerStatus={meetup.viewerStatus}
                waitlistPosition={meetup.waitlistPosition}
                onChanged={reload}
              />
            ) : !user && !sessionLoading ? (
              <TextLink to={`/login?next=${loginNext}`}>Đăng nhập để tham gia</TextLink>
            ) : null}

            {isCreator ? (
              <CreatorActions
                meetupId={meetup.id}
                slug={meetup.slug}
                title={meetup.title}
                onChanged={reload}
              />
            ) : null}

            <View style={{ gap: space.md }}>
              <View style={styles.tablesHead}>
                <SectionTitle>Bàn ({meetup.tables.length})</SectionTitle>
                {viewerGoing && meetup.status === 'scheduled' ? (
                  <CreateTableForm meetupId={meetup.id} onCreated={reload} />
                ) : null}
              </View>
              {meetup.tables.length === 0 ? (
                <Muted>Chưa có bàn nào.</Muted>
              ) : (
                meetup.tables.map((table) => (
                  <SessionTableCard
                    key={table.id}
                    meetupId={meetup.id}
                    table={table}
                    meetupStatus={meetup.status}
                    viewerId={user?.id ?? null}
                    viewerGoing={viewerGoing}
                    viewerTableId={viewerTableId}
                    canManage={isCreator}
                    clubMeetup={!!meetup.club}
                    onChanged={reload}
                  />
                ))
              )}
            </View>
          </>
        ) : null}
      </LoadGate>
    </Page>
  );
}

const styles = StyleSheet.create({
  cancelled: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    padding: space.md,
    borderRadius: 8,
  },
  tablesHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
