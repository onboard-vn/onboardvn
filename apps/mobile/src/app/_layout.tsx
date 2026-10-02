import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SessionProvider } from '../auth/session';
import { SiteHeader } from '../ui/site-header';
import { installWebStyles } from '../ui/web-fonts';
import { colors } from '../ui/theme';

const web = Platform.OS === 'web';
installWebStyles();

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {web ? <SiteHeader /> : null}
        <Stack
          screenOptions={{
            headerShown: !web,
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Onboard' }} />
          <Stack.Screen name="login" options={{ title: 'Đăng nhập' }} />
          <Stack.Screen name="games/index" options={{ title: 'Game' }} />
          <Stack.Screen name="games/[slug]/index" options={{ title: 'Game' }} />
          <Stack.Screen name="games/[slug]/missions" options={{ title: 'Rút nhiệm vụ' }} />
          <Stack.Screen name="score/table/[tableId]" options={{ title: 'Bảng điểm' }} />
          <Stack.Screen name="score/[slug]" options={{ title: 'Bảng điểm (dev)' }} />
        </Stack>
      </View>
    </SessionProvider>
  );
}
