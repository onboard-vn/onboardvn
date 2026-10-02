import type { ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../../ui/theme';

export const openUrl = (url: string) => void Linking.openURL(url);

export function H1({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.h1}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.h2}>
      {children}
    </Text>
  );
}

export function P({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[styles.p, muted && { color: colors.muted }]}>{children}</Text>;
}

export function Code({ children }: { children: ReactNode }) {
  return <Text style={styles.code}>{children}</Text>;
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Text accessibilityRole="link" style={styles.link} onPress={() => openUrl(href)}>
      {children}
    </Text>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <View style={styles.section}>{children}</View>;
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 18, fontWeight: '600', color: colors.text },
  p: { fontSize: 15, lineHeight: 22, color: colors.text },
  code: { fontFamily: 'monospace', fontSize: 13, backgroundColor: colors.surfaceMuted },
  link: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '500' },
  section: { gap: space.sm },
});
