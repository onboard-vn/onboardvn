import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SiteFooter } from '../../ui/site-header';
import { space } from '../../ui/theme';

export function PageShell({
  children,
  maxWidth = 720,
  footer = true,
}: {
  children: ReactNode;
  maxWidth?: number;
  footer?: boolean;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.column, { maxWidth }]}>{children}</View>
      {footer ? (
        <View style={styles.footer}>
          <SiteFooter />
        </View>
      ) : null}
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
  footer: { width: '100%', maxWidth: 1024 },
});
