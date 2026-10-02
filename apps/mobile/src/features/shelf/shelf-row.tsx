import type { ShelfAddInput, ShelfCondition, ShelfItemDto } from '@onboard/shared';
import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { inputStyle } from '../search-input';
import { CONDITION_OPTIONS, formatLastPlayed, gameName, isStale, type ShelfColumn } from './logic';

export type ShelfPatch = Partial<Omit<ShelfAddInput, 'gameId'>>;

export function StaleDot({ lastPlayedAt, now }: { lastPlayedAt: string | null; now: number }) {
  if (!isStale(lastPlayedAt, now)) return null;
  return (
    <View style={styles.stale}>
      <View style={styles.dot} />
      <Text style={styles.staleText}>Lâu chưa chơi</Text>
    </View>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function ShelfRow({
  item,
  columns,
  now,
  onPatch,
  onRemove,
}: {
  item: ShelfItemDto;
  columns: ShelfColumn[];
  now: number;
  onPatch: (patch: ShelfPatch) => Promise<void>;
  onRemove: () => void;
}) {
  const [edition, setEdition] = useState(item.edition ?? '');
  const [note, setNote] = useState(item.note ?? '');
  const [pending, setPending] = useState(false);
  const show = (c: ShelfColumn) => columns.includes(c);
  const dirty = edition.trim() !== (item.edition ?? '') || note.trim() !== (item.note ?? '');

  const run = async (patch: ShelfPatch) => {
    setPending(true);
    try {
      await onPatch(patch);
    } finally {
      setPending(false);
    }
  };

  const setCondition = (c: ShelfCondition) =>
    void run({ condition: item.condition === c ? null : c });

  return (
    <Card>
      <View style={styles.head}>
        <Link
          href={{ pathname: '/games/[slug]', params: { slug: item.game.slug } }}
          style={styles.name}
        >
          {gameName(item.game)}
        </Link>
        <Button label="Gỡ" tone="ghost" onPress={onRemove} />
      </View>
      <View style={styles.cells}>
        {show('lastPlayed') ? (
          <Cell label="Lần chơi cuối">
            <Text style={styles.value}>{formatLastPlayed(item.lastPlayedAt, now)}</Text>
            <StaleDot lastPlayedAt={item.lastPlayedAt} now={now} />
          </Cell>
        ) : null}
        {show('condition') ? (
          <Cell label="Tình trạng">
            <View style={styles.chips}>
              {CONDITION_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={item.condition === o.value}
                  onPress={() => setCondition(o.value)}
                />
              ))}
            </View>
          </Cell>
        ) : null}
        {show('sleeved') ? (
          <Cell label="Bọc sleeve">
            <View style={styles.chips}>
              <Chip
                label="Đã bọc sleeve"
                selected={item.sleeved}
                onPress={() => void run({ sleeved: !item.sleeved })}
              />
            </View>
          </Cell>
        ) : null}
        {show('boxProtected') ? (
          <Cell label="Bọc hộp">
            <View style={styles.chips}>
              <Chip
                label="Đã bọc hộp"
                selected={item.boxProtected}
                onPress={() => void run({ boxProtected: !item.boxProtected })}
              />
            </View>
          </Cell>
        ) : null}
        {show('edition') ? (
          <Cell label="Phiên bản">
            <TextInput
              style={styles.input}
              value={edition}
              onChangeText={setEdition}
              maxLength={60}
              placeholder="Deluxe, Kickstarter..."
              placeholderTextColor={colors.muted}
              accessibilityLabel="Phiên bản"
            />
          </Cell>
        ) : null}
        {show('note') ? (
          <Cell label="Ghi chú">
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Ghi chú"
            />
          </Cell>
        ) : null}
      </View>
      {dirty && (show('edition') || show('note')) ? (
        <Button
          label="Lưu"
          disabled={pending}
          onPress={() =>
            void run({
              ...(show('edition') ? { edition: edition.trim() || null } : {}),
              ...(show('note') ? { note: note.trim() } : {}),
            })
          }
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  cells: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { flexGrow: 1, flexBasis: 200, gap: space.xs },
  cellLabel: { fontSize: 12, color: colors.muted },
  value: { fontSize: 15, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  input: { ...inputStyle, paddingVertical: 8, fontSize: 15 },
  stale: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
  staleText: { fontSize: 12, color: colors.brand, fontWeight: '600' },
});
