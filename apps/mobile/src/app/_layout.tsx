import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { SessionProvider } from '../auth/session';
import { PreferencesProvider, useAppPreferences } from '../ui/preferences';
import { t, setActiveLanguage } from '../ui/i18n';
import { SiteMetadata } from '../ui/site-metadata';
import { SiteHeader, SiteHeaderMenu } from '../ui/site-header';
import { installWebStyles } from '../ui/web-fonts';
import { colors, setActiveTheme } from '../ui/theme';

const web = Platform.OS === 'web';

function AppShell() {
  const { ready, theme, language } = useAppPreferences();

  useEffect(() => {
    setActiveTheme(theme);
    setActiveLanguage(language);
    installWebStyles(theme, language);
  }, [theme, language]);

  return (
    <>
      <SiteMetadata />
      {!ready ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.bg,
          }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            {web ? <SiteHeader /> : null}
            <Stack
              screenOptions={{
                headerShown: !web,
                headerRight: web ? undefined : () => <SiteHeaderMenu />,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
                headerBackTitle: t('Back'),
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'Onboard' }} />
              <Stack.Screen name="login" options={{ title: t('Đăng nhập') }} />
              <Stack.Screen name="games/index" options={{ title: t('Game') }} />
              <Stack.Screen name="games/[slug]/index" options={{ title: t('Game') }} />
              <Stack.Screen name="games/[slug]/missions" options={{ title: t('Rút nhiệm vụ') }} />
              <Stack.Screen name="clubs/index" options={{ title: t('CLB') }} />
              <Stack.Screen name="clubs/[slug]/index" options={{ title: t('CLB') }} />
              <Stack.Screen name="clubs/join/[code]" options={{ title: t('Tham gia CLB') }} />
              <Stack.Screen name="score/table/[tableId]" options={{ title: t('Bảng điểm') }} />
              <Stack.Screen name="score/[slug]" options={{ title: t('Tính điểm') }} />
            </Stack>
          </View>
        </>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <SessionProvider>
        <AppShell />
      </SessionProvider>
    </PreferencesProvider>
  );
}
