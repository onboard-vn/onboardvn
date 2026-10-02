import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../ui/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Onboard · Bảng điểm' }} />
        <Stack.Screen name="score/[slug]" options={{ title: 'Bảng điểm' }} />
      </Stack>
    </>
  );
}
