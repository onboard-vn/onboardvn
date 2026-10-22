import { useAppPreferences } from '../../ui/preferences';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

export default function ClubDetailRedirect() {
  useAppPreferences();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const href = slug ? ({ pathname: '/clubs/[slug]', params: { slug } } as Href) : '/clubs';

  return <Redirect href={href} />;
}
