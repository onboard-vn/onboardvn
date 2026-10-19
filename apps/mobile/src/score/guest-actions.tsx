import type { IdentityDto } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { clubsApi } from '../api/clubs';
import { Button } from '../ui/primitives';
import { colors } from '../ui/theme';
export function GuestActions({ guest, tableId }: { guest: IdentityDto; tableId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<string>) =>
    fn().then(setNote, (e: unknown) =>
      setNote(e instanceof Error ? e.message : 'Không thực hiện được'),
    );
  return (
    <View style={styles.guest}>
      <Text style={styles.name}>{guest.displayName} (khách)</Text>
      <View style={styles.actions}>
        <Button
          tone="ghost"
          label="Đây là tôi"
          onPress={() =>
            run(async () => {
              await clubsApi.requestClaim(guest.id, tableId);
              return 'Đã gửi yêu cầu, chờ người mời hoặc admin CLB duyệt.';
            })
          }
        />
        <Button
          tone="ghost"
          label="Tạo link nhận"
          onPress={() =>
            run(async () => `Gửi link này cho khách: ${(await clubsApi.claimLink(guest.id)).url}`)
          }
        />
      </View>
      {note ? (
        <Text selectable style={styles.meta}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guest: { gap: 4, paddingVertical: 4 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { color: colors.muted },
});
