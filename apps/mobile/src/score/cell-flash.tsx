import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { colors } from '../ui/theme';
import type { SheetApi } from './use-sheet';

export function Flash({
  sheet,
  id,
  cat,
  round,
  children,
}: {
  sheet: SheetApi;
  id: string;
  cat?: string;
  round?: number;
  children: ReactNode;
}) {
  const on = sheet.isFlashed(id, cat, round);
  return (
    <View style={[{ borderRadius: 10 }, on && { backgroundColor: colors.warnSoft }]}>{children}</View>
  );
}

export function PresenceLabel({ sheet, id, name }: { sheet: SheetApi; id: string; name: string }) {
  if (!sheet.presence[id]) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
      <Text style={{ fontSize: 12, color: colors.success }}>{name} đang nhập</Text>
    </View>
  );
}
