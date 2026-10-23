import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '../../ui/theme';
import { useAppPreferences } from '../../ui/preferences';

export function PageShell({
  children,
  maxWidth = 720,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  useAppPreferences();
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.column, { maxWidth }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  column: { width: '100%', gap: space.lg },
});
