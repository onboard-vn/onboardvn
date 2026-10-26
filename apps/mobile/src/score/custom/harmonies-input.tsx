import { useEffect, useId, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RawValue } from '@onboard/shared';
import { TEAM_ID } from '../../api/plays-types';
import { Card, Chip, Collapsible, Heading, Hint, Button } from '../../ui/primitives';
import { useAppPreferences } from '../../ui/preferences';
import { colors, themeStyles } from '../../ui/theme';
import { Flash, PresenceLabel } from '../cell-flash';
import { GenericCategories } from '../generic-categories';
import { scorePlayerName } from '../localization';
import type { SheetApi } from '../use-sheet';
import {
  deleteAnimalCardById,
  editAnimalCardById,
  editAnimalCards,
  heightCounter,
  readyAnimalCardPoints,
  supportsHarmoniesCounters,
  wholeCounter,
} from './applejack-harmonies-counters';
import { LandscapeCounter, LandscapeSubtotal } from './applejack-harmonies-controls';

const HEIGHTS = [
  { key: 'height1', height: 1, points: 1 },
  { key: 'height2', height: 2, points: 3 },
  { key: 'height3', height: 3, points: 7 },
] as const;

function HeightCounters({
  sheet,
  playerId,
  category,
}: {
  sheet: SheetApi;
  playerId: string;
  category: 'trees' | 'mountains';
}) {
  const { language } = useAppPreferences();
  const value = sheet.state.values[playerId]?.[category];
  return (
    <Flash sheet={sheet} id={playerId} cat={category}>
      <View style={styles.group}>
        {HEIGHTS.map(({ key, height, points }) => (
          <LandscapeCounter
            key={key}
            label={
              language === 'en'
                ? `${category === 'trees' ? 'Tree' : 'Mountain'} height ${height}`
                : `${category === 'trees' ? 'Cây' : 'Núi'} cao ${height}`
            }
            hint={`${heightCounter(value, key)} × ${points} VP`}
            value={heightCounter(value, key)}
            disabled={!sheet.canEditIdentity(playerId)}
            onChange={(count) => sheet.setInputValue(playerId, category, key, count)}
          />
        ))}
      </View>
    </Flash>
  );
}

function AnimalCardsInput({
  value,
  disabled,
  onChange,
}: {
  value: RawValue | undefined;
  disabled: boolean;
  onChange: (value: number[]) => void;
}) {
  const { language } = useAppPreferences();
  const text = (vi: string, en: string) => (language === 'en' ? en : vi);
  const [nextPoints, setNextPoints] = useState(0);
  const cards = readyAnimalCardPoints(value);
  const idPrefix = useId();
  const [rowIds, setRowIds] = useState(() => cards.map((_, index) => `${idPrefix}-card-${index}`));
  const nextId = useRef(cards.length);
  const displayIds = cards.map((_, index) => rowIds[index] ?? `${idPrefix}-pending-${index}`);
  const rowsRef = useRef({ ids: displayIds, points: cards });

  useEffect(() => {
    rowsRef.current = { ids: displayIds, points: cards };
  }, [cards, displayIds]);

  const editCard = (id: string, points: number) => {
    const next = editAnimalCardById(rowsRef.current, id, points);
    rowsRef.current = next;
    onChange(next.points);
  };
  const deleteCard = (id: string) => {
    const next = deleteAnimalCardById(rowsRef.current, id);
    rowsRef.current = next;
    setRowIds(next.ids);
    onChange(next.points);
  };
  const add = (points: number) => {
    const next = {
      ids: [...rowsRef.current.ids, `${idPrefix}-card-${nextId.current++}`],
      points: editAnimalCards(rowsRef.current.points, { type: 'add', points }),
    };
    rowsRef.current = next;
    setRowIds(next.ids);
    onChange(next.points);
  };
  return (
    <View style={styles.group}>
      {cards.length ? (
        cards.map((points, index) => {
          const id = displayIds[index];
          return (
            <View key={id} style={styles.cardRow}>
              <View style={styles.cardCounter}>
                <LandscapeCounter
                  label={`${text('Thẻ', 'Card')} ${index + 1}`}
                  hint="VP"
                  value={points}
                  disabled={disabled}
                  onChange={(next) => editCard(id, next)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={text(`Xóa thẻ ${index + 1}`, `Delete card ${index + 1}`)}
                disabled={disabled}
                onPress={() => deleteCard(id)}
                style={[styles.delete, disabled && styles.disabled]}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          );
        })
      ) : (
        <Hint>
          {text(
            'Chưa thêm thẻ. Thẻ chưa đặt khối vẫn ghi 0 điểm.',
            'No cards added. A card with no cubes placed still scores 0.',
          )}
        </Hint>
      )}
      <View style={styles.addCard}>
        <LandscapeCounter
          label={text('Điểm thẻ mới', 'New card points')}
          value={nextPoints}
          disabled={disabled}
          onChange={setNextPoints}
        />
        <Button
          label={text('+ Thêm thẻ', '+ Add card')}
          tone="ghost"
          disabled={disabled}
          onPress={() => {
            add(nextPoints);
            setNextPoints(0);
          }}
        />
      </View>
    </View>
  );
}

export function HarmoniesInput({ sheet }: { sheet: SheetApi }) {
  const { language } = useAppPreferences();
  const text = (vi: string, en: string) => (language === 'en' ? en : vi);
  if (!supportsHarmoniesCounters(sheet.template)) return <GenericCategories sheet={sheet} />;
  const sideB = sheet.state.teamValues.boardSide === 1;
  return (
    <>
      <Card>
        <Heading>◈ Harmonies</Heading>
        <Hint>
          {text(
            'Chọn một mặt bàn cho tất cả người chơi. Đếm cảnh quan hợp lệ; app tự quy đổi điểm.',
            'Choose one board side for every player. Count eligible landscapes; the app calculates the points.',
          )}
        </Hint>
        <Flash sheet={sheet} id={TEAM_ID} cat="boardSide">
          <View style={styles.choices}>
            <Chip
              label={text('A · Sông', 'A · River')}
              selected={!sideB}
              disabled={!sheet.canManage}
              onPress={() => sheet.setTeamValue('boardSide', 0)}
            />
            <Chip
              label={text('B · Đảo', 'B · Islands')}
              selected={sideB}
              disabled={!sheet.canManage}
              onPress={() => sheet.setTeamValue('boardSide', 1)}
            />
          </View>
        </Flash>
        {!sheet.canManage ? (
          <Hint>
            {text(
              'Chủ bàn chọn mặt A/B cho cả bàn.',
              'The host chooses side A/B for the whole table.',
            )}
          </Hint>
        ) : null}
      </Card>
      {sheet.state.players.map((player) => {
        const values = sheet.state.values[player.id] ?? {};
        const points =
          sheet.summary.result?.players.find(({ id }) => id === player.id)?.categories ?? {};
        const editable = sheet.canEditIdentity(player.id);
        const waterKey = sideB ? 'islandsSideB' : 'riverSideA';
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

              <LandscapeSubtotal label={text('♣ Cây', '♣ Trees')} points={points.trees ?? 0} />
              <Hint>
                {text(
                  'Chỉ cây có ngọn xanh. Cao 1/2/3 = xanh trên 0/1/2 nâu; cọc nâu không tính.',
                  'Only trees with a green top. Height 1/2/3 = green on 0/1/2 brown tokens; brown-only stacks do not count.',
                )}
              </Hint>
              <HeightCounters sheet={sheet} playerId={player.id} category="trees" />

              <LandscapeSubtotal
                label={text('▲ Núi đủ điều kiện', '▲ Eligible mountains')}
                points={points.mountains ?? 0}
              />
              <Hint>
                {text(
                  'Chỉ đếm núi xám kề ít nhất một núi khác. Núi đứng một mình được 0 điểm.',
                  'Count grey mountains adjacent to at least one other mountain. Isolated mountains score 0.',
                )}
              </Hint>
              <HeightCounters sheet={sheet} playerId={player.id} category="mountains" />

              <Flash sheet={sheet} id={player.id} cat="fields">
                <LandscapeCounter
                  label={text('▦ Nhóm ruộng', '▦ Field groups')}
                  hint={`${text('Nhóm vàng từ 2 ô, mỗi nhóm 5', 'Yellow groups of 2+ tokens, 5 each')} · ${points.fields ?? 0} VP`}
                  value={wholeCounter(values.fields)}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'fields', value)}
                />
              </Flash>
              <Flash sheet={sheet} id={player.id} cat="buildings">
                <LandscapeCounter
                  label={text('⌂ Nhà hợp lệ', '⌂ Eligible buildings')}
                  hint={`${text('Mỗi nhà 5', '5 each')} · ${points.buildings ?? 0} VP`}
                  value={wholeCounter(values.buildings)}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'buildings', value)}
                />
              </Flash>
              <Hint>
                {text(
                  'Nhà: đỏ trên nâu/xám/đỏ; màu token trên cùng ở 6 ô kề có ít nhất 3 màu khác nhau.',
                  'Buildings: red on brown/grey/red; top tokens in the 6 adjacent spaces must include at least 3 different colours.',
                )}
              </Hint>

              <View style={styles.water}>
                <LandscapeSubtotal
                  label={
                    sideB
                      ? text('≈ Nước · Mặt B', '≈ Water · Side B')
                      : text('≈ Nước · Mặt A', '≈ Water · Side A')
                  }
                  points={points[waterKey] ?? 0}
                />
                <Flash sheet={sheet} id={player.id} cat={waterKey}>
                  <LandscapeCounter
                    label={
                      sideB ? text('Số đảo', 'Islands') : text('Chiều dài sông', 'River length')
                    }
                    value={wholeCounter(values[waterKey], sideB ? 1 : 0)}
                    min={sideB ? 1 : 0}
                    disabled={!editable}
                    onChange={(value) => sheet.setValue(player.id, waterKey, value)}
                  />
                </Flash>
                <Hint>
                  {sideB
                    ? text(
                        'Luôn có ít nhất 1 đảo, kể cả chưa chia bằng nước. Mỗi đảo 5 điểm.',
                        'There is always at least 1 island, even without water dividing it. Each island scores 5.',
                      )
                    : text(
                        'Sông tốt nhất theo đường ngắn nhất, tính cả hai đầu. Dài 1/2/3/4/5/6: 0/2/5/8/11/15 điểm; sau đó +4 mỗi ô.',
                        'Best river by shortest path, including both ends. Length 1/2/3/4/5/6: 0/2/5/8/11/15 points; then +4 per token.',
                      )}
                </Hint>
              </View>

              <LandscapeSubtotal
                label={text('♧ Thẻ động vật', '♧ Animal cards')}
                points={points.animalCards ?? 0}
              />
              <Hint>
                {text(
                  'Đọc ô điểm trên cùng chưa bị khối che ở mỗi thẻ, kể cả thẻ đã hoàn thành. Chưa đặt khối nào: 0 điểm.',
                  'Read the topmost uncovered score on each card, including completed cards. No cubes placed: 0 points.',
                )}
              </Hint>
              <Flash sheet={sheet} id={player.id} cat="animalCards">
                <AnimalCardsInput
                  value={values.animalCards}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'animalCards', value)}
                />
              </Flash>

              <Collapsible
                title={`${text('✧ Nature’s Spirit · tùy chọn', '✧ Nature’s Spirit · optional')} · ${points.natureSpirit ?? 0} VP`}
                defaultOpen={wholeCounter(values.natureSpirit) > 0}
              >
                <Hint>
                  {text(
                    'Nếu có dùng và đã đặt khối theo luật: nhập điểm theo thẻ. Không dùng hoặc chưa đạt: để 0.',
                    'If used and its cube was placed according to the rules, enter the points from the card. Otherwise leave 0.',
                  )}
                </Hint>
                <Flash sheet={sheet} id={player.id} cat="natureSpirit">
                  <LandscapeCounter
                    label={text('Điểm thưởng', 'Bonus points')}
                    hint={`${points.natureSpirit ?? 0} VP`}
                    value={wholeCounter(values.natureSpirit)}
                    disabled={!editable}
                    onChange={(value) => sheet.setValue(player.id, 'natureSpirit', value)}
                  />
                </Flash>
              </Collapsible>
              <Flash sheet={sheet} id={player.id} cat="animalCubesPlaced">
                <LandscapeCounter
                  label={text('◇ Khối động vật đã đặt', '◇ Animal cubes placed')}
                  hint={text(
                    'Chỉ phân định hòa, không cộng điểm; bỏ khối Nature’s Spirit.',
                    'Tiebreak only, no points; exclude the Nature’s Spirit cube.',
                  )}
                  value={wholeCounter(values.animalCubesPlaced)}
                  disabled={!editable}
                  onChange={(value) => sheet.setValue(player.id, 'animalCubesPlaced', value)}
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
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    group: { gap: 8 },
    water: { padding: 10, borderRadius: 10, backgroundColor: colors.primarySoft, gap: 8 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardCounter: { flex: 1 },
    delete: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      backgroundColor: colors.surfaceMuted,
    },
    deleteText: { color: colors.danger, fontWeight: '700', fontSize: 22 },
    disabled: { opacity: 0.4 },
    addCard: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, gap: 8 },
  }),
);
