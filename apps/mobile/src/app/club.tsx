import { useAppPreferences } from '../ui/preferences';
import { Redirect } from 'expo-router';

export default function ClubRedirect() {
  useAppPreferences();
  return <Redirect href="/clubs" />;
}
