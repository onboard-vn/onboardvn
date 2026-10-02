import { Redirect, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { clubsApi } from '../../api/clubs';
import { href } from '../../features/events/ui';
import { useLoad } from '../../ui/use-load';

export default function MeetupRedirect() {
  const { id, clubId } = useLocalSearchParams<{ id: string; clubId?: string }>();
  const meetups = useLoad(clubId ? () => clubsApi.meetups(clubId) : null, [clubId]);

  if (!clubId) return <Redirect href="/events" />;
  if (meetups.loading || (!meetups.data && !meetups.error)) {
    return <ActivityIndicator style={{ marginTop: 48 }} />;
  }
  const slug = meetups.data?.find((m) => m.id === id)?.slug;
  return <Redirect href={slug ? href(`/events/${slug}`) : '/events'} />;
}
