import { Redirect, useLocalSearchParams } from 'expo-router';

export default function CafesRedirect() {
  const { tinh, ...params } = useLocalSearchParams<Record<string, string>>();
  if (tinh && !params.province) params.province = tinh;
  return <Redirect href={{ pathname: '/map', params }} />;
}
