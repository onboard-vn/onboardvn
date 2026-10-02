import { Redirect, Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSession } from '../../auth/session';
import { colors, radius, space } from '../../ui/theme';
import { Button, Card, Heading, Hint } from '../../ui/primitives';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';
import { hasAccess, type AdminAccess } from './access';
import { confirmAction } from './confirm';

export function AdminPage({
  title,
  access = 'staff',
  width = 896,
  action,
  children,
}: {
  title: string;
  access?: AdminAccess;
  width?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { user, loading } = useSession();
  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (!user || !hasAccess(user.role, access)) return <Redirect href="/login" />;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scroll}
      style={styles.fill}
    >
      <Stack.Screen options={{ title }} />
      <View style={[styles.column, { maxWidth: width }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {action}
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

export function LoadState({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}) {
  if (loading) return <ActivityIndicator style={styles.spinner} />;
  if (!error) return null;
  return (
    <View style={{ gap: space.sm }}>
      <ErrorText message={error} />
      {onRetry ? <Button label="Thử lại" tone="ghost" onPress={onRetry} /> : null}
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}

export function SuccessText({ message }: { message: string | null }) {
  return message ? <Text style={styles.success}>{message}</Text> : null;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <Heading>{title}</Heading>
      {children}
    </Card>
  );
}

export function ListCard({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export function Row({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.rowRight}>{right}</View> : null}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
  editable = true,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={label ?? placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        autoCapitalize="none"
        autoCorrect={false}
        style={[inputStyle, multiline && styles.multiline]}
      />
    </View>
  );
}

export function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.check}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export function PickerField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Chọn',
  disabled,
}: {
  label?: string;
  value: T | '';
  options: Option<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const current = options.find((o) => o.value === value);
  const needle = filter.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen((o) => !o)}
        style={[inputStyle, styles.picker, disabled && styles.disabled]}
      >
        <Text style={[styles.pickerText, !current && { color: colors.muted }]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Text style={styles.pickerText}>{open ? '▴' : '▾'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {options.length > 8 ? (
            <TextInput
              value={filter}
              onChangeText={setFilter}
              placeholder="Gõ để lọc..."
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[inputStyle, { margin: space.sm }]}
            />
          ) : null}
          <ScrollView
            style={styles.menuScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {shown.map((o) => (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                  setFilter('');
                }}
                style={[
                  styles.menuItem,
                  o.value === value && { backgroundColor: colors.primarySoft },
                ]}
              >
                <Text style={styles.pickerText}>{o.label}</Text>
              </Pressable>
            ))}
            {shown.length === 0 ? <Hint>Không có kết quả khớp.</Hint> : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function DangerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.danger, disabled && styles.disabled]}
    >
      <Text style={styles.dangerText}>{label}</Text>
    </Pressable>
  );
}

export function SmallButton({
  label,
  onPress,
  disabled,
  tone = 'outline',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'outline' | 'solid';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.small, tone === 'solid' && styles.smallSolid, disabled && styles.disabled]}
    >
      <Text style={[styles.smallText, tone === 'solid' && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function ActionButton({
  label,
  run,
  confirmText,
  danger,
  small = true,
  failure = 'Có lỗi xảy ra, thử lại sau',
}: {
  label: string;
  run: () => Promise<void>;
  confirmText?: string;
  danger?: boolean;
  small?: boolean;
  failure?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    if (confirmText && !(await confirmAction(confirmText))) return;
    setPending(true);
    setError(null);
    try {
      await run();
    } catch (e) {
      setError(errorMessage(e, failure));
    } finally {
      setPending(false);
    }
  };

  const button = danger ? (
    <DangerButton label={label} onPress={() => void onPress()} disabled={pending} />
  ) : small ? (
    <SmallButton label={label} onPress={() => void onPress()} disabled={pending} />
  ) : (
    <Button label={label} onPress={() => void onPress()} disabled={pending} />
  );
  return (
    <View style={{ alignItems: 'flex-end', gap: space.xs }}>
      {button}
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { alignItems: 'center', padding: space.lg, paddingBottom: 48 },
  column: { width: '100%', gap: space.lg },
  spinner: { marginTop: 48 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, flexShrink: 1 },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
  list: {
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowMain: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSub: { fontSize: 12, color: colors.muted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexShrink: 0 },
  field: { gap: space.xs, flex: 1, minWidth: 140 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
  checkLabel: { flex: 1, fontSize: 15, color: colors.text },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontSize: 14, fontWeight: '700' },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pickerText: { fontSize: 15, color: colors.text, flexShrink: 1 },
  disabled: { opacity: 0.4 },
  menu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  menuScroll: { maxHeight: 240 },
  menuItem: { paddingHorizontal: space.lg, paddingVertical: 10 },
  danger: {
    backgroundColor: colors.danger,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dangerText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  small: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallSolid: { backgroundColor: colors.primary, borderColor: colors.primary },
  smallText: { color: colors.text, fontWeight: '600', fontSize: 14 },
});
