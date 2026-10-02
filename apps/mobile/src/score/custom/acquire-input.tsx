import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Flash, PresenceLabel } from '../cell-flash';
import { NumberField } from '../../ui/number-field';
import { Card, Chip, Collapsible, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';
import type { SheetApi } from '../use-sheet';
import {
  ACQUIRE_CHAINS,
  chainBonuses,
  endBonus,
  stockSales,
  type ChainKey,
  type Prices,
  type Shares,
} from './acquire-bonus';

interface AcquireExtras {
  prices: Prices;
  shares: Shares;
}

const EMPTY: AcquireExtras = { prices: {}, shares: {} };
const money = (n: number) => `$${n.toLocaleString('vi-VN')}`;
const QUICK = [100, 500, 1000];

export function AcquireInput({ sheet }: { sheet: SheetApi }) {
  const { players } = sheet.state;
  const touched = sheet.state.extras.acquire as AcquireExtras | undefined;
  const { prices, shares } = touched ?? EMPTY;
  const ids = players.map((p) => p.id);
  const bonuses = chainBonuses(prices, shares, ids);

  useEffect(() => {
    if (!touched) return;
    const live = players.map((p) => p.id);
    const b = chainBonuses(touched.prices, touched.shares, live);
    sheet.patchValues(
      Object.fromEntries(
        live.map((id) => [
          id,
          {
            stockSales: stockSales(touched.prices, touched.shares, id),
            endBonuses: endBonus(b, id),
          },
        ]),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-derive only when inputs or roster change
  }, [touched, players.length]);

  const setPrice = (key: ChainKey, n: number) =>
    sheet.setExtra<AcquireExtras>('acquire', { prices: { ...prices, [key]: n }, shares });
  const setShares = (id: string, key: ChainKey, n: number) =>
    sheet.setExtra<AcquireExtras>('acquire', {
      prices,
      shares: { ...shares, [id]: { ...shares[id], [key]: n } },
    });

  const num = (id: string, key: string) => {
    const v = sheet.state.values[id]?.[key];
    return typeof v === 'number' ? v : 0;
  };

  return (
    <>
      <Card>
        <Heading>Tiền mặt cuối ván</Heading>
        {players.map((p) => {
          const row = sheet.summary.rows.find((r) => r.id === p.id);
          const extra = num(p.id, 'stockSales') + num(p.id, 'endBonuses');
          return (
            <View key={p.id} style={styles.player}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <PresenceLabel sheet={sheet} id={p.id} name={p.name} />
                </View>
                <Text style={styles.total}>{money(row?.total ?? 0)}</Text>
              </View>
              <Flash sheet={sheet} id={p.id} cat="cash">
                <NumberField
                  value={num(p.id, 'cash')}
                  min={0}
                  step={100}
                  width={110}
                  prefix="$"
                  onChange={(n) => sheet.setValue(p.id, 'cash', n)}
                />
              </Flash>
              <View style={styles.wrap}>
                {QUICK.map((q) => (
                  <Chip
                    key={q}
                    label={`+${q}`}
                    onPress={() => sheet.setValue(p.id, 'cash', num(p.id, 'cash') + q)}
                  />
                ))}
                <Chip label="Xóa" onPress={() => sheet.setValue(p.id, 'cash', 0)} />
              </View>
              {extra > 0 ? <Hint>Đã cộng từ trợ giúp cổ đông: {money(extra)}</Hint> : null}
            </View>
          );
        })}
      </Card>

      <Collapsible title="Trợ giúp tính thưởng cổ đông">
        <Hint>
          Tùy chọn. Nhập giá cổ phiếu và số cổ phiếu mỗi người nắm; app tự tính tiền bán cổ phiếu và
          thưởng cổ đông lớn/nhỏ (hòa chia đều, làm tròn lên $100) rồi cộng vào tổng.
        </Hint>
        <Text style={styles.label}>Giá cổ phiếu hiện tại</Text>
        {ACQUIRE_CHAINS.map((c) => (
          <View key={c.key} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={styles.chain}>{c.name}</Text>
            <NumberField
              value={prices[c.key] ?? 0}
              min={0}
              step={100}
              width={84}
              prefix="$"
              onChange={(n) => setPrice(c.key, n)}
            />
          </View>
        ))}
        {players.map((p) => {
          const bonus = endBonus(bonuses, p.id);
          const detail = bonuses
            .filter((b) => b.payouts[p.id])
            .map(
              (b) =>
                `${ACQUIRE_CHAINS.find((c) => c.key === b.chain)?.name}: ${money(b.payouts[p.id] ?? 0)}`,
            )
            .join(' · ');
          return (
            <View key={p.id} style={styles.player}>
              <Text style={styles.name}>{p.name} · cổ phiếu nắm giữ</Text>
              <View style={styles.grid}>
                {ACQUIRE_CHAINS.map((c) => (
                  <View
                    key={c.key}
                    style={[styles.cell, (prices[c.key] ?? 0) <= 0 && { opacity: 0.45 }]}
                  >
                    <View style={styles.cellHead}>
                      <View style={[styles.dot, { backgroundColor: c.color }]} />
                      <Text style={styles.cellName}>{c.name}</Text>
                    </View>
                    <NumberField
                      value={shares[p.id]?.[c.key] ?? 0}
                      min={0}
                      max={25}
                      width={44}
                      onChange={(n) => setShares(p.id, c.key, n)}
                    />
                  </View>
                ))}
              </View>
              <Text style={styles.sumLine}>
                Bán cổ phiếu: {money(stockSales(prices, shares, p.id))} · Thưởng: {money(bonus)}
              </Text>
              {detail ? <Hint>{detail}</Hint> : null}
            </View>
          );
        })}
      </Collapsible>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chain: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  player: { gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  total: { fontSize: 20, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { gap: 4, padding: 8, borderRadius: 10, backgroundColor: colors.bg },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellName: { fontSize: 12, fontWeight: '600', color: colors.text },
  sumLine: { fontSize: 14, color: colors.text, fontWeight: '600' },
});
