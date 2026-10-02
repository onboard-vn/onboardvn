import { Link, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { errorMessage } from '../errors';
import { SiteFooter } from '../../ui/site-header';
import { colors, radius, space } from '../../ui/theme';

export const href = (path: string | Href) => path as Href;

export function Page({
  children,
  maxWidth = 720,
  footer = true,
}: {
  children: ReactNode;
  maxWidth?: number;
  footer?: boolean;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      style={styles.page}
    >
      <View style={[styles.column, { maxWidth }]}>{children}</View>
      {footer ? <SiteFooter /> : null}
    </ScrollView>
  );
}

export const Title = ({ children }: { children: ReactNode }) => (
  <Text accessibilityRole="header" style={styles.title}>
    {children}
  </Text>
);

export const SectionTitle = ({ children }: { children: ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

export const Muted = ({ children, small }: { children: ReactNode; small?: boolean }) => (
  <Text style={[styles.muted, small && { fontSize: 12 }]}>{children}</Text>
);

export const Body = ({ children, bold }: { children: ReactNode; bold?: boolean }) => (
  <Text style={[styles.body, bold && { fontWeight: '600' }]}>{children}</Text>
);

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  small,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  small?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        small && styles.btnSmall,
        variant === 'outline' && styles.btnOutline,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          small && { fontSize: 13 },
          variant === 'outline' && { color: colors.text },
          variant === 'ghost' && { color: colors.muted },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function LinkBtn({
  label,
  to,
  variant = 'primary',
  small,
}: {
  label: string;
  to: string | Href;
  variant?: Variant;
  small?: boolean;
}) {
  return (
    <Link href={href(to)} asChild>
      <Btn label={label} variant={variant} small={small} onPress={() => undefined} />
    </Link>
  );
}

export function CardLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link href={href(to)} asChild>
      <Pressable accessibilityRole="link" style={styles.cardLink}>
        {children}
      </Pressable>
    </Link>
  );
}

export function TextLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link href={href(to)} style={styles.textLink}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
      {hint ? <Muted small>{hint}</Muted> : null}
    </View>
  );
}

export function TextField({
  label,
  hint,
  multiline,
  ...props
}: TextInputProps & { label?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        {...props}
        style={[styles.input, multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </Field>
  );
}

export function Box({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.box, style]}>{children}</View>;
}

export function ListBox({ children }: { children: ReactNode }) {
  return <View style={styles.listBox}>{children}</View>;
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function confirmAsync(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert(message, undefined, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Đồng ý', onPress: () => resolve(true) },
    ]),
  );
}

export function useAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (fn: () => Promise<unknown>, fallback: string) => {
    setPending(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(errorMessage(e, fallback));
      return false;
    } finally {
      setPending(false);
    }
  }, []);
  return { pending, error, setError, run };
}

export const gameName = (g: { nameVi: string | null; nameEn: string }) => g.nameVi || g.nameEn;

export const inputStyle = {
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius,
  paddingHorizontal: space.md,
  paddingVertical: 10,
  fontSize: 16,
  color: colors.text,
} as const;

const styles = StyleSheet.create({
  page: { flex: 1 },
  pageContent: { padding: space.lg, paddingBottom: space.xl, alignItems: 'center' },
  column: { width: '100%', gap: space.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  error: { fontSize: 14, color: colors.danger },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  input: inputStyle,
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  btnSmall: { paddingHorizontal: space.md, paddingVertical: 6 },
  btnOutline: { backgroundColor: colors.card, borderColor: colors.border },
  btnGhost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  btnDanger: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cardLink: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 2,
  },
  textLink: { fontSize: 14, color: colors.primary, textDecorationLine: 'underline' },
  box: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: space.md,
    gap: space.sm,
  },
  listBox: {
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
});

export function LoadGate({
  loading,
  error,
  hasData,
  children,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  children: ReactNode;
}) {
  if (hasData) return <>{children}</>;
  if (loading) return <ActivityIndicator style={{ marginTop: space.xl }} />;
  return <Muted>{error ?? 'Không tải được dữ liệu'}</Muted>;
}
