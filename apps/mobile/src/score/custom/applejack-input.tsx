import { StyleSheet, Text, View } from 'react-native';
import { Card, Heading, Hint } from '../../ui/primitives';
import { useAppPreferences } from '../../ui/preferences';
import { colors, themeStyles } from '../../ui/theme';
import { Flash, PresenceLabel } from '../cell-flash';
import { GenericCategories } from '../generic-categories';
import { scorePlayerName } from '../localization';
import type { SheetApi } from '../use-sheet';
import {
  APPLEJACK_COLORS,
  supportsApplejackCounters,
  wholeCounter,
} from './applejack-harmonies-counters';
import { LandscapeCounter, LandscapeSubtotal } from './applejack-harmonies-controls';

export function ApplejackInput({ sheet }: { sheet: SheetApi }) {
  const { language } = useAppPreferences();
  const text = (vi: string, en: string) => (language === 'en' ? en : vi);
  if (!supportsApplejackCounters(sheet.template)) return <GenericCategories sheet={sheet} />;

  return (
    <>
      <Card>
        <Heading>🍎 Applejack</Heading>
        <Hint>
          {text(
            'Nhập mật ong, không nhập số táo: trừ 3 táo riêng mỗi vùng cùng màu, lấy tối thiểu 0 rồi cộng theo màu. App tự nhân đôi phần thu hoạch.',
            'Enter honey, not apples: subtract 3 apples separately in each connected area, take at least 0, then add areas of the same colour. The app doubles the harvest.',
          )}
        </Hint>
        <Hint>
          {text(
            'Ví dụ: hai vùng rời có 3 và 2 táo cho 0 mật ong; hai vùng có 4 và 4 táo cho 2 mật ong trước nhân đôi.',
            'Example: separate areas of 3 and 2 apples give 0 honey; separate areas of 4 and 4 give 2 honey before doubling.',
          )}
        </Hint>
      </Card>
      {sheet.state.players.map((player) => {
        const values = sheet.state.values[player.id] ?? {};
        const computed =
          sheet.summary.result?.players.find(({ id }) => id === player.id)?.categories ?? {};
        const harvest = APPLEJACK_COLORS.reduce((sum, { key }) => sum + (computed[key] ?? 0), 0);
        const editable = sheet.canEditIdentity(player.id);
        return (
          <Flash key={player.id} sheet={sheet} id={player.id}>
            <Card>
              <View style={styles.header}>
                <View style={styles.name}>
                  <Heading>{scorePlayerName(player)}</Heading>
                  <PresenceLabel
                    sheet={sheet}
                    id={player.id}
                    name={player.name}
                    fallbackSeat={player.fallbackSeat}
                  />
                </View>
                <Text style={styles.total}>
                  {sheet.summary.rows.find(({ id }) => id === player.id)?.total ?? 0} VP
                </Text>
              </View>
              <LandscapeSubtotal
                label={text('Thu hoạch cuối · tự nhân 2', 'Final harvest · automatically ×2')}
                points={harvest}
              />
              <Hint>
                {text(
                  'Mật ong sau trừ 3 mỗi vùng, trước nhân đôi',
                  'Honey after subtracting 3 per area, before doubling',
                )}
              </Hint>
              {APPLEJACK_COLORS.map(({ key, icon, vi, en }) => (
                <Flash key={key} sheet={sheet} id={player.id} cat={key}>
                  <LandscapeCounter
                    label={`${icon} ${text(vi, en)}`}
                    hint={`${wholeCounter(values[key])} × 2 = ${computed[key] ?? 0} VP`}
                    value={wholeCounter(values[key])}
                    disabled={!editable}
                    onChange={(value) => sheet.setValue(player.id, key, value)}
                  />
                </Flash>
              ))}
              <View style={styles.bonus}>
                <LandscapeSubtotal
                  label={text('Thưởng giống · tự tính', 'Variety bonus · automatic')}
                  points={computed.varietyBonus ?? 0}
                />
                <Hint>
                  {text(
                    `${computed.profitableVarieties ?? 0} giống cho mật ong · 4/5/6/7 giống: +4/11/21/35`,
                    `${computed.profitableVarieties ?? 0} profitable varieties · 4/5/6/7 varieties: +4/11/21/35`,
                  )}
                </Hint>
              </View>
              <Flash sheet={sheet} id={player.id} cat="blossoms">
                <LandscapeCounter
                  label={text('✿ Hoa', '✿ Blossoms')}
                  hint={`${text('Số hoa × 1', 'Blossoms × 1')} = ${computed.blossoms ?? 0} VP`}
                  value={wholeCounter(values.blossoms)}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'blossoms', value)}
                />
              </Flash>
              <Flash sheet={sheet} id={player.id} cat="honeySupply">
                <LandscapeCounter
                  label={text('🍯 Mật ong trong kho', '🍯 Honey in supply')}
                  hint={`${text('Cộng thẳng', 'Added directly')} · ${computed.honeySupply ?? 0} VP`}
                  value={wholeCounter(values.honeySupply)}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'honeySupply', value)}
                />
              </Flash>
            </Card>
          </Flash>
        );
      })}
    </>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { flex: 1 },
    total: { color: colors.primary, fontSize: 24, fontWeight: '800' },
    bonus: { gap: 4, padding: 10, borderRadius: 10, backgroundColor: colors.primarySoft },
  }),
);
