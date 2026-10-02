import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NumberField } from '../../ui/number-field';
import { Card, Chip, Heading, Hint } from '../../ui/primitives';
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

  const cash = (id: string) => {
    const v = sheet.state.values[id]?.cash;
    return typeof v === 'number' ? v : 0;
  };

  return (
    <>
      <Card>
        <Heading>Giá cổ phiếu hiện tại</Heading>
        <Hint>
          Nhập giá mỗi cổ phiếu theo bảng giá của bản bạn chơi (tên chuỗi + số ô). Chuỗi giá 0 coi
          như không còn trên bàn. App tự tính tiền bán cổ phiếu và thưởng cổ đông lớn/nhỏ (hòa chia
          đều, làm tròn lên $100).
        </Hint>
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
      </Card>

      {players.map((p) => {
        const row = sheet.summary.rows.find((r) => r.id === p.id);
        const sales = stockSales(prices, shares, p.id);
        const bonus = endBonus(bonuses, p.id);
        const detail = bonuses
          .filter((b) => b.payouts[p.id])
          .map(
            (b) =>
              `${ACQUIRE_CHAINS.find((c) => c.key === b.chain)?.name}: ${money(b.payouts[p.id] ?? 0)}`,
          )
          .join(' · ');
        return (
          <Card key={p.id}>
            <View style={styles.header}>
              <Heading>{p.name}</Heading>
              <Text style={styles.total}>{money(row?.total ?? 0)}</Text>
            </View>

            <Text style={styles.label}>Tiền mặt</Text>
            <NumberField
              value={cash(p.id)}
              min={0}
              step={100}
              width={110}
              prefix="$"
              onChange={(n) => sheet.setValue(p.id, 'cash', n)}
            />
            <View style={styles.wrap}>
              {QUICK.map((q) => (
                <Chip
                  key={q}
                  label={`+${q}`}
                  onPress={() => sheet.setValue(p.id, 'cash', cash(p.id) + q)}
                />
              ))}
              <Chip label="Xóa" onPress={() => sheet.setValue(p.id, 'cash', 0)} />
            </View>

            <Text style={styles.label}>Cổ phiếu nắm giữ</Text>
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

            <View style={styles.sum}>
              <Text style={styles.sumLine}>Bán cổ phiếu: {money(sales)}</Text>
              <Text style={styles.sumLine}>Thưởng cổ đông: {money(bonus)}</Text>
              {detail ? <Hint>{detail}</Hint> : null}
            </View>
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  chain: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 22, fontWeight: '800', color: colors.primary },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { gap: 4, padding: 8, borderRadius: 10, backgroundColor: colors.bg },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cellName: { fontSize: 12, fontWeight: '600', color: colors.text },
  sum: { gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  sumLine: { fontSize: 14, color: colors.text, fontWeight: '600' },
});
