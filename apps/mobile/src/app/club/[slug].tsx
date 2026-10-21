import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

export default function ClubDetailRedirect() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const href = slug
    ? ({ pathname: '/clubs/[slug]', params: { slug } } as Href)
    : '/clubs';

  return <Redirect href={href} />;
}
