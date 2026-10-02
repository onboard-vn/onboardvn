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
        <Stack.Screen name="index" options={{ title: 'Onboard' }} />
        <Stack.Screen name="club" options={{ title: 'Kèo của CLB' }} />
        <Stack.Screen name="meetup/[id]" options={{ title: 'Kèo' }} />
        <Stack.Screen name="score/table/[tableId]" options={{ title: 'Bảng điểm' }} />
        <Stack.Screen name="score/[slug]" options={{ title: 'Bảng điểm (dev)' }} />
      </Stack>
    </>
  );
}
