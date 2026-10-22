import { StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Collapsible, Heading, Hint } from '../../ui/primitives';
import { themeStyles, colors } from '../../ui/theme';
import { Flash, PresenceLabel } from '../cell-flash';
import type { SheetApi } from '../use-sheet';
import { scorePlayerName, scoreText, templateScoreText } from '../localization';
import { useAppPreferences } from '../../ui/preferences';
export function ShadowHuntersInput({ sheet }: { sheet: SheetApi }) {
  const { language } = useAppPreferences();
  const { state, template } = sheet;
  return (
    <>
      <Card>
        <Heading>{scoreText("Ghi kết quả cuối ván")}</Heading>
        <Hint>
          {scoreText("Chỉ nhập khi ván đã kết thúc, để giữ kín danh tính trong lúc chơi. Bộ gốc 10 nhân vật. Chọn từng người đạt điều kiện thắng trên thẻ, kể cả Hunter/Shadow đã chết. Có thể có nhiều người cùng thắng; ứng dụng không tự suy luận người thắng theo phe.")}</Hint>
      </Card>
      {state.players.map((player) => {
        const canEdit = sheet.canEditIdentity(player.id);
        const values = state.values[player.id];
        const character = template.roles?.find((r) => r.key === String(values?.character));
        const won = values?.won;
        return (
          <Card key={player.id}>
            <Heading>{scorePlayerName(player)}</Heading>
            <PresenceLabel sheet={sheet} id={player.id} name={player.name} fallbackSeat={player.fallbackSeat} />
            <Flash sheet={sheet} id={player.id} cat="character">
              <Collapsible title={character ? templateScoreText(character.labelVi ?? character.label, character.label, language) : scoreText("Chọn nhân vật / phe")}>
                <View style={styles.wrap}>
                {template.roles?.map((role) => (
                    <Chip
                      key={role.key}
                      label={templateScoreText(role.labelVi ?? role.label, role.label, language)}
                      selected={character?.key === role.key}
                      disabled={!canEdit}
                      onPress={() => sheet.setValue(player.id, 'character', Number(role.key))}
                    />
                  ))}
                </View>
              </Collapsible>
            </Flash>
            <Flash sheet={sheet} id={player.id} cat="won">
              <View style={styles.wrap}>
                <Chip
                  label={scoreText("Thắng")}
                  selected={won === true}
                  tint={colors.success}
                  disabled={!canEdit}
                  onPress={() => sheet.setValue(player.id, 'won', true)}
                />
                <Chip
                  label={scoreText("Thua")}
                  selected={won === false}
                  tint={colors.danger}
                  disabled={!canEdit}
                  onPress={() => sheet.setValue(player.id, 'won', false)}
                />
              </View>
            </Flash>
            <Text style={styles.status}>
              {typeof won === 'boolean'
                ? won
                  ? scoreText("Đạt điều kiện thắng")
                  : scoreText("Không đạt điều kiện thắng")
                : scoreText("Chưa chọn kết quả")}
            </Text>
          </Card>
        );
      })}
    </>
  );
}

const styles = themeStyles(() => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { color: colors.muted, fontSize: 13 },
}));
