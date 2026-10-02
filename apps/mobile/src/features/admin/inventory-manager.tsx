import type { CafeMaintainerInventoryItemDto, GameSummaryDto } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { Badge, Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { inputStyle } from '../search-input';
import { CheckRow, ErrorText, Field, Section, SmallButton } from './ui';

type SearchResult = Pick<GameSummaryDto, 'id' | 'nameVi' | 'nameEn'>;

function CopiesInput({ copies, onCommit }: { copies: number; onCommit: (n: number) => void }) {
  const [text, setText] = useState(String(copies));
  const commit = () => {
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1) return setText(String(copies));
    if (n !== copies) onCommit(n);
  };
  return (
    <TextInput
      accessibilityLabel="Số bản"
      value={text}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="number-pad"
      style={[inputStyle, styles.copies]}
    />
  );
}

export function InventoryManager({
  cafeId,
  inventory,
  onChanged,
}: {
  cafeId: string;
  inventory: CafeMaintainerInventoryItemDto[];
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [communityOnly, setCommunityOnly] = useState(false);
  const inventoryIds = new Set(inventory.map((i) => i.gameId));
  const visible = communityOnly ? inventory.filter((i) => i.community) : inventory;

  async function mutate(run: () => Promise<unknown>, failure: string) {
    setPending(true);
    setError(null);
    try {
      await run();
      onChanged();
    } catch (e) {
      setError(errorMessage(e, failure));
    } finally {
      setPending(false);
    }
  }

  async function onSearch() {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return;
    }
    try {
      const res = await api<{ items: SearchResult[] }>('/games', {
        query: { q: term, pageSize: 10 },
      });
      setResults(res.items);
    } catch {
      setResults([]);
    }
  }

  const gamePath = (gameId: string) => `/cafes/${cafeId}/games/${gameId}`;

  return (
    <Section title={`Kho game (${inventory.length})`}>
      <CheckRow
        label="Chỉ đóng góp cộng đồng"
        checked={communityOnly}
        onChange={setCommunityOnly}
      />

      {visible.map((item) => (
        <View key={`${item.gameId}:${item.copies}`} style={styles.item}>
          <View style={styles.name}>
            <Text style={styles.nameText}>{item.nameVi || item.nameEn}</Text>
            {item.community ? <Badge label="Cộng đồng đóng góp" /> : null}
          </View>
          <View style={styles.actions}>
            <CopiesInput
              copies={item.copies}
              onCommit={(copies) =>
                void mutate(
                  () => api(gamePath(item.gameId), { method: 'PATCH', body: { copies } }),
                  'Không cập nhật được số bản',
                )
              }
            />
            {item.community ? (
              <SmallButton
                label="Xác nhận"
                disabled={pending}
                onPress={() =>
                  void mutate(
                    () => api(`${gamePath(item.gameId)}/confirm`, { method: 'POST' }),
                    'Không xác nhận được game',
                  )
                }
              />
            ) : null}
            <SmallButton
              label="Gỡ"
              disabled={pending}
              onPress={() =>
                void mutate(
                  () => api(gamePath(item.gameId), { method: 'DELETE' }),
                  'Không gỡ được game',
                )
              }
            />
          </View>
        </View>
      ))}
      {visible.length === 0 ? (
        <Text style={styles.muted}>
          {communityOnly ? 'Chưa có đóng góp cộng đồng nào.' : 'Chưa có game nào trong kho.'}
        </Text>
      ) : null}

      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Field value={q} onChangeText={setQ} placeholder="Tìm game để thêm vào kho..." />
        </View>
        <Button label="Tìm" onPress={() => void onSearch()} />
      </View>

      {results.map((g) => (
        <View key={g.id} style={styles.item}>
          <Text style={[styles.nameText, styles.name]}>{g.nameVi || g.nameEn}</Text>
          <SmallButton
            tone="solid"
            label={inventoryIds.has(g.id) ? 'Đã có' : 'Thêm'}
            disabled={pending || inventoryIds.has(g.id)}
            onPress={() =>
              void mutate(
                () => api(`/cafes/${cafeId}/games`, { method: 'POST', body: { gameId: g.id } }),
                'Có lỗi xảy ra, thử lại sau',
              )
            }
          />
        </View>
      ))}

      <ErrorText message={error} />
    </Section>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  name: { flex: 1, minWidth: 140, gap: 4 },
  nameText: { fontSize: 15, color: colors.text },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  copies: { width: 64, paddingVertical: 6, textAlign: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  muted: { fontSize: 14, color: colors.muted },
});
