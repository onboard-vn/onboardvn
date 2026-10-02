import type { CafeOwnerInventoryItemDto } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { NumberField } from '../../ui/number-field';
import { Badge, Button, Card, Chip, Heading, Hint } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { GamePicker } from '../scan/game-picker';
import { FormError } from './form-bits';

export function InventoryManager({
  cafeId,
  inventory,
  onChanged,
}: {
  cafeId: string;
  inventory: CafeOwnerInventoryItemDto[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [communityOnly, setCommunityOnly] = useState(false);
  const inventoryIds = new Set(inventory.map((i) => i.gameId));
  const visible = communityOnly ? inventory.filter((i) => i.community) : inventory;
  const base = `/cafes/${encodeURIComponent(cafeId)}/games`;

  const run = async (fallback: string, action: () => Promise<unknown>) => {
    setPending(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(errorMessage(e, fallback));
    } finally {
      setPending(false);
    }
  };

  const onAdd = (gameId: string) =>
    run('Có lỗi xảy ra, thử lại sau', () => api(base, { method: 'POST', body: { gameId } }));

  const onCopies = (gameId: string, copies: number) =>
    run('Có lỗi xảy ra, thử lại sau', () =>
      api(`${base}/${gameId}`, { method: 'PATCH', body: { copies } }),
    );

  const onRemove = (gameId: string) =>
    run('Có lỗi xảy ra, thử lại sau', () => api(`${base}/${gameId}`, { method: 'DELETE' }));

  const onConfirm = (gameId: string) =>
    run('Không xác nhận được game', () => api(`${base}/${gameId}/confirm`, { method: 'POST' }));

  return (
    <Card>
      <View style={styles.head}>
        <Heading>Kho game ({inventory.length})</Heading>
        <Chip
          label="Chỉ đóng góp cộng đồng"
          selected={communityOnly}
          onPress={() => setCommunityOnly((v) => !v)}
        />
      </View>

      <View style={styles.list}>
        {visible.map((item) => (
          <View key={item.gameId} style={styles.item}>
            <View style={styles.name}>
              <Text style={styles.nameText}>{item.nameVi || item.nameEn}</Text>
              {item.community ? <Badge label="Cộng đồng đóng góp" /> : null}
            </View>
            <View style={styles.actions}>
              <NumberField
                value={item.copies}
                min={1}
                max={999}
                width={56}
                onChange={(copies) => void onCopies(item.gameId, copies)}
              />
              {item.community ? (
                <Button
                  label="Xác nhận"
                  tone="ghost"
                  disabled={pending}
                  onPress={() => void onConfirm(item.gameId)}
                />
              ) : null}
              <Button
                label="Gỡ"
                tone="ghost"
                disabled={pending}
                onPress={() => void onRemove(item.gameId)}
              />
            </View>
          </View>
        ))}
        {visible.length === 0 ? (
          <Hint>
            {communityOnly ? 'Chưa có đóng góp cộng đồng nào.' : 'Chưa có game nào trong kho.'}
          </Hint>
        ) : null}
      </View>

      <GamePicker
        actionLabel="Thêm"
        allowCreate={false}
        isPicked={(id) => inventoryIds.has(id)}
        pickedLabel="Đã có"
        disabled={pending}
        onPick={(g) => void onAdd(g.id)}
      />
      <FormError message={error} />
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  list: { gap: space.md },
  item: { gap: space.sm },
  name: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  nameText: { color: colors.text, fontWeight: '500' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
});
