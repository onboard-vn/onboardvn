import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { Muted, Page, href } from '../../../features/events/ui';

export default function JoinEventPage() {
  const { code, slug } = useLocalSearchParams<{ code: string; slug?: string }>();
  const slugValue = Array.isArray(slug) ? slug[0] : slug;
  if (!slugValue || !code) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Tham gia Kèo' }} />
        <Muted>Link mời không hợp lệ.</Muted>
      </Page>
    );
  }
  return (
    <Redirect
      href={href(`/events/${encodeURIComponent(slugValue)}?code=${encodeURIComponent(code)}`)}
    />
  );
}
