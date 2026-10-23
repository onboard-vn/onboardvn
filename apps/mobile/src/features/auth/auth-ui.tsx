import { Link, Redirect, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSession } from '../../auth/session';
import { Card, Heading, Hint } from '../../ui/primitives';
import { themeStyles, colors, radius, space } from '../../ui/theme';
import { useAppPreferences } from '../../ui/preferences';
import { translateKnown } from '../../ui/i18n';

export function Page({ children, maxWidth = 720 }: { children: ReactNode; maxWidth?: number }) {
  useAppPreferences();
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
    >
      <View style={[styles.column, { maxWidth }]}>{children}</View>
    </ScrollView>
  );
}

export function AuthShell({
  title,
  description,
  next,
  children,
}: {
  title: string;
  description?: string;
  next?: string | null;
  children: ReactNode;
}) {
  useAppPreferences();
  const { user, loading } = useSession();
  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (user) return <Redirect href={(next || '/') as Href} />;
  return (
    <Page maxWidth={420}>
      <Card>
        <Heading>{title}</Heading>
        {description ? <Hint>{description}</Hint> : null}
        {children}
      </Card>
    </Page>
  );
}

export function Field({
  label,
  hint,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  useAppPreferences();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        {...input}
      />
      {hint ? <Hint>{hint}</Hint> : null}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  useAppPreferences();
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {translateKnown(message)}
    </Text>
  ) : null;
}

export function Note({ children }: { children: ReactNode }) {
  useAppPreferences();
  return <Text style={styles.note}>{children}</Text>;
}

export function TextLink({ href, children }: { href: Href; children: ReactNode }) {
  useAppPreferences();
  return (
    <Link href={href} style={styles.link}>
      {children}
    </Link>
  );
}

export const withNext = (path: string, next: string | null): Href =>
  (next ? `${path}?next=${encodeURIComponent(next)}` : path) as Href;

const styles = themeStyles(() =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: space.lg, alignItems: 'center', flexGrow: 1 },
    column: { width: '100%', gap: space.md },
    spinner: { marginTop: 48 },
    field: { gap: space.xs },
    label: { fontSize: 14, fontWeight: '600', color: colors.text },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.card,
    },
    error: { color: colors.danger, fontSize: 14 },
    note: { fontSize: 14, color: colors.muted, lineHeight: 20 },
    link: { color: colors.primary, textDecorationLine: 'underline', fontSize: 14 },
  }),
);
