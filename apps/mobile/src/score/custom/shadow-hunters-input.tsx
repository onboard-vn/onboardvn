import { StyleSheet, Text, View } from 'react-native';
import { Card, Chip, Collapsible, Heading, Hint } from '../../ui/primitives';
import { colors } from '../../ui/theme';
import { Flash, PresenceLabel } from '../cell-flash';
import type { SheetApi } from '../use-sheet';

export function ShadowHuntersInput({ sheet }: { sheet: SheetApi }) {
  const { state, template } = sheet;
  return (
    <>
      <Card>
        <Heading>Ghi kết quả cuối ván</Heading>
        <Hint>
          Chỉ nhập khi ván đã kết thúc, để giữ kín danh tính trong lúc chơi. Bộ gốc 10 nhân vật.
          Chọn từng người đạt điều kiện thắng trên thẻ, kể cả Hunter/Shadow đã chết. Có thể có nhiều
          người cùng thắng; ứng dụng không tự suy luận người thắng theo phe.
        </Hint>
      </Card>
      {state.players.map((player) => {
        const canEdit = sheet.canEditIdentity(player.id);
        const values = state.values[player.id];
        const character = template.roles?.find((r) => r.key === String(values?.character));
        const won = values?.won;
        return (
          <Card key={player.id}>
            <Heading>{player.name}</Heading>
            <PresenceLabel sheet={sheet} id={player.id} name={player.name} />
            <Flash sheet={sheet} id={player.id} cat="character">
              <Collapsible title={character?.labelVi ?? 'Chọn nhân vật / phe'}>
                <View style={styles.wrap}>
                {template.roles?.map((role) => (
                    <Chip
                      key={role.key}
                      label={role.labelVi ?? role.label}
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
                  label="Thắng"
                  selected={won === true}
                  tint={colors.success}
                  disabled={!canEdit}
                  onPress={() => sheet.setValue(player.id, 'won', true)}
                />
                <Chip
                  label="Thua"
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
                  ? 'Đạt điều kiện thắng'
                  : 'Không đạt điều kiện thắng'
                : 'Chưa chọn kết quả'}
            </Text>
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: { color: colors.muted, fontSize: 13 },
});
