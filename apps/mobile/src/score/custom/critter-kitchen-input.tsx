import {
  CRITTER_KITCHEN_BASE_COURSE_IDS,
  CRITTER_KITCHEN_CATALOG,
  CRITTER_KITCHEN_COURSE_IDS,
  CRITTER_KITCHEN_MEAL_CATEGORY_KEY,
  CRITTER_KITCHEN_SCALAR_KEYS,
  computeCritterKitchen,
  critterKitchenAllspiceKey,
  critterKitchenDefaultSetup,
  critterKitchenLeftoverKey,
  critterKitchenLeftoverSpiceKey,
  critterKitchenMealSchema,
  critterKitchenPairedWineKey,
  critterKitchenRestaurateurKey,
  critterKitchenServedKey,
  critterKitchenSetupSchema,
  critterKitchenSpiceKey,
  type CritterKitchenCourseId,
  type CritterKitchenIngredientType,
  type CritterKitchenSetup,
  type CritterKitchenSpiceType,
  type PlayDto,
} from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Card, Chip, Collapsible, Heading, Hint } from '../../ui/primitives';
import { NumberField } from '../../ui/number-field';
import { themeStyles, colors } from '../../ui/theme';
import { leftoverIngredientTypes as availableLeftovers } from './critter-kitchen-leftovers';
import { defaultCritterPriorities } from './critter-kitchen-priority';
import type { SheetApi } from '../use-sheet';
import { scoreFeedbackText, scorePlayerName, scoreText } from '../localization';
import { useAppPreferences } from '../../ui/preferences';
const COURSE_LABEL: Record<CritterKitchenCourseId, string> = {
  bread: 'Bánh mì',
  carrot: 'Cà rốt',
  cheese: 'Phô mai',
  fish: 'Cá',
  meat: 'Thịt',
  mushroom: 'Nấm',
  wine: 'Rượu',
  gelato: 'Gelato',
};
const VALUE_OPTIONS = [2, 3, 4, 5, 6, 7] as const;
const SOURCE_INGREDIENTS = CRITTER_KITCHEN_COURSE_IDS;
const SPICES = SOURCE_INGREDIENTS.filter((item) => item !== 'gelato') as CritterKitchenSpiceType[];
const COURSES = CRITTER_KITCHEN_BASE_COURSE_IDS as readonly CritterKitchenCourseId[];
const UNSUPPORTED_CARD_MESSAGE = 'Chưa xác minh đủ nội dung lá này để tính tự động.';

const CRITIC_EXPLANATIONS: Record<string, string> = {
  mouse: 'Có thể phục vụ nhiều nguyên liệu ở món phô mai; thắng món phô mai được thêm sao.',
  cow: 'Có thể đặt tối đa bốn nguyên liệu vào một món; các món khác vẫn chỉ có một.',
  rabbit: 'Nguyên liệu cà rốt được tính gấp đôi.',
  kangaroo: 'Token in số 6 được tính như số 9.',
  badger: 'Nấm có thể dùng thay nguyên liệu ở các món; nấm được ghép với gia vị bất kỳ.',
  'fruit-bat':
    'Có thể ghép thêm một token rượu với mỗi món; giá trị phải bằng nguyên liệu cao nhất món đó.',
  raccoon: 'Có thể thêm token in số 2 vào món; mỗi món chỉ được thêm tối đa một token khác.',
  poodle: 'Mỗi nguyên liệu có giá trị từ 6 trở lên tự cộng sao thưởng.',
  'saint-bernard': 'Token rượu có thể dùng như Allspice để ghép với nguyên liệu khác.',
  'tree-shrew': 'Gia vị nhân ba giá trị nguyên liệu thay vì nhân đôi.',
  pig: 'Có thể phục vụ tối đa hai nguyên liệu cho mỗi món.',
};

const RUMOR_EXPLANATIONS: Record<string, string> = {
  fanatic: 'Nhân đôi chất lượng món có nguyên liệu này; sao cuối được tính tự động.',
  'extremely-pampered': '2 sao nếu có nguyên liệu giá trị từ 5 trở lên ở ít nhất bảy món.',
  hibernator: '2 sao nếu món cuối cùng có chất lượng cao nhất trong các món đã phục vụ.',
  'big-cheese': '3 sao nếu giá trị phô mai cao nhất đạt ít nhất số món đã phục vụ.',
  'odd-tastes': '3 sao nếu giá trị cao nhất ở mỗi món đều là số lẻ.',
  'simple-palate': '3 sao nếu có một giá trị nguyên liệu được lặp nhiều nhất (kể cả đồng hạng).',
  'subtle-flavors': '3 sao nếu giá trị bánh mì cao nhất xuất hiện nhiều nhất trong món của bạn.',
  mercurial: 'Số sao bằng chênh lệch giữa giá trị nguyên liệu cao nhất và thấp nhất.',
  nocturnal: '5 sao nếu giá trị cao nhất của các món không giảm từ trái sang phải.',
  'varied-servings':
    'Mỗi giá trị nguyên liệu khác nhau cho 1 sao; người phục vụ nhiều token nhất được thêm 1 sao.',
  unsophisticated:
    'Mỗi món có đúng một nguyên liệu không gia vị được 1 sao; nhiều nhất được thêm 1 sao.',
  'spice-lover': '2 sao nếu không có đối thủ nào dùng từ ba gia vị trở lên.',
  tender: '3 sao nếu tổng giá trị cao nhất ở món đầu và món cuối đạt ít nhất 10.',
  shortsighted: 'Số sao bằng giá trị cà rốt cao nhất trừ 2 (tối thiểu 0).',
  picky: 'Nếu phục vụ đủ bảy món, nhận số sao bằng giá trị nguyên liệu thấp nhất.',
  'to-go':
    'Mỗi hai token nguyên liệu hoặc gia vị còn thừa được 1 sao; người nhiều token thừa nhất được thêm 1 sao.',
  'wine-cellar': 'Mỗi token rượu không dùng trong món cuối được 1 sao.',
};

type MealRecord = Record<string, number>;
type CountProps = {
  label: string;
  value: number;
  disabled: boolean;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

function Count({ label, value, disabled, min = 0, max = 20, onChange }: CountProps) {
  return (
    <View style={styles.countRow}>
      <Text style={styles.countLabel}>{label}</Text>
      <NumberField
        value={value}
        min={min}
        max={max}
        width={62}
        disabled={disabled}
        onChange={onChange}
      />
    </View>
  );
}

function selectionFor(
  source: CritterKitchenSetup | undefined,
  serverSetup: CritterKitchenSetup | null,
): CritterKitchenSetup {
  return source ?? serverSetup ?? critterKitchenDefaultSetup;
}

function readMeal(value: unknown): MealRecord {
  const parsed = critterKitchenMealSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function hasInputHint(entry: unknown, hint: string): boolean {
  if (!entry || typeof entry !== 'object' || !('inputHints' in entry)) return false;
  const inputHints = entry.inputHints;
  return Array.isArray(inputHints) && inputHints.includes(hint);
}

export function CritterKitchenInput({
  sheet,
  setup,
  play,
  onSetupSaved,
  onSetupPendingChange,
}: {
  sheet: SheetApi;
  setup: PlayDto['setup'];
  play: PlayDto;
  onSetupSaved: (play: PlayDto) => void;
  onSetupPendingChange: (pending: boolean) => void;
}) {
  useAppPreferences();
  const parsedSetup = critterKitchenSetupSchema.safeParse(setup);
  const serverSetup = parsedSetup.success ? parsedSetup.data : null;
  const [setupDraft, setSetupDraft] = useState<CritterKitchenSetup>(critterKitchenDefaultSetup);
  const [setupDirty, setSetupDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const effectiveSetup = selectionFor(setupDirty ? setupDraft : undefined, serverSetup);
  const hasSavedSetup = serverSetup !== null;
  const selectedCritic = CRITTER_KITCHEN_CATALOG.critics.find(
    (item) => item.id === effectiveSetup.criticId,
  );
  const selectedCriticExplanation = selectedCritic
    ? (CRITIC_EXPLANATIONS[selectedCritic.ability] ??
      'Nhập nguyên liệu theo thẻ giám khảo; hệ thống sẽ kiểm tra giới hạn món trước khi chốt.')
    : null;
  const supportsPairedWine = selectedCritic?.inputHints?.includes('paired-wine') ?? false;
  const extraCourseCartIds = new Set(
    CRITTER_KITCHEN_CATALOG.carts
      .filter(
        (item) =>
          item.supported &&
          effectiveSetup.cartIds.includes(item.id) &&
          hasInputHint(item, 'gelato'),
      )
      .map((item) => item.id),
  );
  const gelatoEnabled = extraCourseCartIds.size > 0;
  const availableCourses = gelatoEnabled ? [...COURSES, 'gelato' as const] : [...COURSES];
  const rumorTokenEnabled = CRITTER_KITCHEN_CATALOG.carts.some(
    (item) =>
      item.supported &&
      effectiveSetup.cartIds.includes(item.id) &&
      hasInputHint(item, 'rumorTokenCount'),
  );
  const selectedRumorIds = [
    ...effectiveSetup.rumorIds,
    ...(effectiveSetup.additionalRumorIds ?? []),
  ];
  const selectedRumors = CRITTER_KITCHEN_CATALOG.rumors.filter(
    (item) => item.supported && selectedRumorIds.includes(item.id),
  );
  const leftoverHints = new Set(selectedRumors.flatMap((item) => item.inputHints ?? []));
  const leftoversEnabled = [...leftoverHints].some((hint) => hint.startsWith('leftover-'));
  const leftoverIngredientTypes = availableLeftovers(leftoverHints, gelatoEnabled);
  const leftoverSpicesEnabled = leftoverHints.has('leftover-spices');
  const players = play.players.map((row) => ({
    identityId: row.identity.id,
    seat: row.seat,
    meal: readMeal(sheet.state.values[row.identity.id]?.[CRITTER_KITCHEN_MEAL_CATEGORY_KEY]),
  }));
  const defaultPriorities = defaultCritterPriorities(
    play.players.map((row) => ({ identityId: row.identity.id, seat: row.seat })),
  );
  const jamieSelected = play.players.some(
    (row) =>
      readMeal(sheet.state.values[row.identity.id]?.[CRITTER_KITCHEN_MEAL_CATEGORY_KEY])[
        critterKitchenRestaurateurKey('jamie-owliver')
      ] === 1,
  );
  const result = hasSavedSetup ? computeCritterKitchen(effectiveSetup, players) : null;

  const editSetup = (update: (current: CritterKitchenSetup) => CritterKitchenSetup) => {
    onSetupPendingChange(true);
    setSetupDraft(update(effectiveSetup));
    setSetupDirty(true);
    setSetupError(null);
  };

  const saveSetup = async () => {
    const parsed = critterKitchenSetupSchema.safeParse(effectiveSetup);
    if (!parsed.success) {
      setSetupError('Chọn đúng ba tin đồn trước khi lưu thiết lập.');
      return;
    }
    setSaving(true);
    onSetupPendingChange(true);
    setSetupError(null);
    try {
      const saved = await api<PlayDto>(`/plays/${play.id}`, {
        method: 'PATCH',
        body: { setup: parsed.data },
      });
      onSetupSaved(saved);
      setSetupDirty(false);
      setSetupDraft(parsed.data);
      onSetupPendingChange(false);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Không lưu được thiết lập chung.');
    } finally {
      setSaving(false);
    }
  };

  const setupEditable = sheet.canManage && play.status === 'draft' && !saving;

  return (
    <View style={styles.column}>
      <Card>
        <Heading>{scoreText("Cách nhập món cuối")}</Heading>
        <Hint>
          {scoreText("Ở mỗi món, chọn loại token và giá trị in trên token (2–7), rồi thêm đúng số token đã phục vụ. Sau đó nhập gia vị ghép với từng token; Allspice là lựa chọn riêng. Súp và bisque nhập bằng số tô.")}</Hint>
      </Card>
      <Card>
        <Heading>{scoreText("Thiết lập chung cho Critter Kitchen")}</Heading>
        <Hint>{scoreText("Chủ bàn chọn giám khảo, ba tin đồn đã lật và các mô-đun À La Carte đang dùng.")}</Hint>
        <Card style={styles.nestedCard}>
          <Heading>{scoreText("Giám khảo")}</Heading>
          <View style={styles.wrap}>
            {CRITTER_KITCHEN_CATALOG.critics.map((item) => (
              <Chip
                key={item.id}
              label={item.supported ? item.label : scoreText('{label} · chưa hỗ trợ', { label: item.label })}
                selected={effectiveSetup.criticId === item.id}
                disabled={!setupEditable || !item.supported}
                onPress={() => editSetup((current) => ({ ...current, criticId: item.id }))}
              />
            ))}
            {CRITTER_KITCHEN_CATALOG.critics
              .filter((item) => !item.supported)
              .map((item) => (
                <Hint key={`unsupported-critic-${item.id}`}>
                  {item.label}: {scoreText(UNSUPPORTED_CARD_MESSAGE)}
                </Hint>
              ))}
          </View>
          {selectedCriticExplanation ? <Hint>{scoreText(selectedCriticExplanation)}</Hint> : null}
        </Card>
        <Card style={styles.nestedCard}>
          <Heading>{scoreText("Ba tin đồn đã lật ·")}{" "}{effectiveSetup.rumorIds.length}/3</Heading>
          <View style={styles.wrap}>
            {CRITTER_KITCHEN_CATALOG.rumors.map((item) => {
              const selected = effectiveSetup.rumorIds.includes(item.id);
              return (
                <Chip
                  key={item.id}
                  label={item.supported ? item.label : scoreText('{label} · chưa hỗ trợ', { label: item.label })}
                  selected={selected}
                  disabled={!setupEditable || (!item.supported && !selected)}
                  onPress={() =>
                    editSetup((current) => ({
                      ...current,
                      rumorIds: selected
                        ? (current.rumorIds.filter(
                            (id) => id !== item.id,
                          ) as CritterKitchenSetup['rumorIds'])
                        : current.rumorIds.length < 3
                          ? ([...current.rumorIds, item.id].slice(
                              0,
                              3,
                            ) as CritterKitchenSetup['rumorIds'])
                          : current.rumorIds,
                      additionalRumorIds: selected
                        ? current.additionalRumorIds
                        : (current.additionalRumorIds ?? []).filter((id) => id !== item.id),
                    }))
                  }
                />
              );
            })}
            {CRITTER_KITCHEN_CATALOG.rumors
              .filter((item) => !item.supported)
              .map((item) => (
                <Hint key={`unsupported-rumor-${item.id}`}>
                  {item.label}: {scoreText(UNSUPPORTED_CARD_MESSAGE)}
                </Hint>
              ))}
          </View>
          {(effectiveSetup.additionalRumorIds ?? []).length > 0 || jamieSelected ? (
            <>
              <Heading>{scoreText("Tin đồn bổ sung do Jamie Owliver mở ra")}</Heading>
              <View style={styles.wrap}>
                {CRITTER_KITCHEN_CATALOG.rumors.map((item) => {
                  const selected = (effectiveSetup.additionalRumorIds ?? []).includes(item.id);
                  return (
                    <Chip
                      key={`extra-${item.id}`}
                      label={item.supported ? item.label : scoreText('{label} · chưa hỗ trợ', { label: item.label })}
                      selected={selected}
                      disabled={
                        !setupEditable ||
                        effectiveSetup.rumorIds.includes(item.id) ||
                        (!item.supported && !selected)
                      }
                      onPress={() =>
                        editSetup((current) => {
                          const extras = current.additionalRumorIds ?? [];
                          return {
                            ...current,
                            additionalRumorIds: selected
                              ? extras.filter((id) => id !== item.id)
                              : item.supported &&
                                  !current.rumorIds.includes(item.id) &&
                                  extras.length < 7
                                ? [...extras, item.id]
                                : extras,
                          };
                        })
                      }
                    />
                  );
                })}
              </View>
              {CRITTER_KITCHEN_CATALOG.rumors
                .filter((item) => !item.supported)
                .map((item) => (
                  <Hint key={`unsupported-extra-rumor-${item.id}`}>
                    {item.label}: {scoreText(UNSUPPORTED_CARD_MESSAGE)}
                  </Hint>
                ))}
            </>
          ) : null}
          {[...effectiveSetup.rumorIds, ...(effectiveSetup.additionalRumorIds ?? [])].map((id) => {
            const rumor = CRITTER_KITCHEN_CATALOG.rumors.find((item) => item.id === id);
            if (!rumor?.supported) return null;
            const detail =
              rumor.effect === 'fanatic' && rumor.ingredientType
                ? scoreText('Nhân đôi chất lượng món {course}; sao cuối được tính tự động.', {
                    course: scoreText(COURSE_LABEL[rumor.ingredientType]),
                  })
                : RUMOR_EXPLANATIONS[rumor.effect];
            return detail ? (
              <Hint key={`rumor-explanation-${id}`}>
                {rumor.label}: {rumor.effect === 'fanatic' ? detail : scoreText(detail)}
              </Hint>
            ) : null;
          })}
        </Card>
        <Card style={styles.nestedCard}>
          <Heading>{scoreText("À La Carte đang dùng")}</Heading>
          <View style={styles.wrap}>
            {CRITTER_KITCHEN_CATALOG.carts.map((item) => {
              const selected = effectiveSetup.cartIds.includes(item.id);
              return (
                <Chip
                  key={item.id}
                  label={item.supported ? item.label : scoreText('{label} · chưa hỗ trợ', { label: item.label })}
                  selected={selected}
                  disabled={!setupEditable || (!item.supported && !selected)}
                  onPress={() =>
                    editSetup((current) => ({
                      ...current,
                      cartIds: selected
                        ? current.cartIds.filter((id) => id !== item.id)
                        : item.supported
                          ? [...current.cartIds, item.id]
                          : current.cartIds,
                    }))
                  }
                />
              );
            })}
          </View>
          {CRITTER_KITCHEN_CATALOG.carts
            .filter((item) => !item.supported)
            .map((item) => (
              <Hint key={`unsupported-cart-${item.id}`}>
                {item.label}: {scoreText(UNSUPPORTED_CARD_MESSAGE)}
              </Hint>
            ))}
          <View style={styles.wrap}>
            <Chip
              label={scoreText("Chế độ 6–7 người")}
              selected={effectiveSetup.sixSevenPlayerMode}
              disabled={!setupEditable}
              onPress={() =>
                editSetup((current) => ({
                  ...current,
                  sixSevenPlayerMode: !current.sixSevenPlayerMode,
                }))
              }
            />
          </View>
        </Card>
        {setupEditable ? (
          <Button
            label={
              saving
                ? scoreText("Đang lưu...")
                : setupDirty || !hasSavedSetup
                  ? scoreText("Lưu thiết lập chung")
                  : scoreText("Cập nhật thiết lập")
            }
            disabled={saving || effectiveSetup.rumorIds.length !== 3}
            onPress={() => void saveSetup()}
          />
        ) : null}
        {!hasSavedSetup && !setupEditable ? (
          <Hint>{scoreText("Chờ chủ bàn lưu thiết lập trước khi nhập món.")}</Hint>
        ) : null}
        {setupError ? <Text style={styles.error}>{scoreFeedbackText(setupError)}</Text> : null}
        {setupDirty ? <Hint>{scoreText("Thiết lập đang ở thiết bị này, chưa lưu lên bàn.")}</Hint> : null}
      </Card>

      <Card>
        <Heading>{scoreText("Món thử thách đã ghi từ ngày 1 và 2")}</Heading>
        <Hint>
          {scoreText("Nhập sao đã tích lũy trước bữa ăn giám khảo. Không cộng sao thưởng của giám khảo, tin đồn hoặc chủ nhà hàng ở đây; hệ thống tự tính các sao đó.")}</Hint>
        {play.players.map((row) => {
          const meal = readMeal(sheet.state.values[row.identity.id]?.meal);
          const canEdit =
            sheet.canEditIdentity(row.identity.id) && play.status === 'draft' && hasSavedSetup;
          const previousStars = meal[CRITTER_KITCHEN_SCALAR_KEYS.previousStars];
          return (
            <View key={row.identity.id} style={styles.playerBlock}>
              <Text style={styles.playerName}>{row.identity.displayName}</Text>
              <Count
                label={scoreText("Sao đã có trước món cuối")}
                value={previousStars ?? 0}
                disabled={!canEdit}
                max={1000}
                onChange={(value) =>
                  putCell(sheet, row.identity.id, CRITTER_KITCHEN_SCALAR_KEYS.previousStars, value)
                }
              />
              {previousStars === undefined && canEdit ? (
                <Hint>{scoreText("Nhập số sao hiện có; nếu chưa có sao, tăng lên 0 để xác nhận.")}</Hint>
              ) : null}
            </View>
          );
        })}
      </Card>

      {play.players.map((row) => {
        const meal = readMeal(sheet.state.values[row.identity.id]?.meal);
        const canEdit =
          sheet.canEditIdentity(row.identity.id) && play.status === 'draft' && hasSavedSetup;
        const missing = [
          CRITTER_KITCHEN_SCALAR_KEYS.previousStars,
          CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition,
          CRITTER_KITCHEN_SCALAR_KEYS.soupCount,
          CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount,
        ].filter((key) => meal[key] === undefined);
        return (
          <Card key={`meal-${row.identity.id}`}>
            <Heading>{row.identity.displayName} {scoreText("· món giám khảo")}</Heading>
            <Hint>
              {sheet.canManage
                ? scoreText("Chủ bàn có thể sửa mọi hàng.")
                : canEdit
                  ? scoreText("Bạn đang sửa hàng gắn với tài khoản của mình.")
                  : scoreText("Hàng này chỉ chủ bàn hoặc người sở hữu danh tính mới sửa được.")}
            </Hint>
            <View style={styles.wrap}>
              <Count
                label={scoreText("Vị trí ưu tiên (1 = đi trước)")}
                value={
                  meal[CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition] ??
                  defaultPriorities[row.identity.id] ??
                  1
                }
                disabled={!canEdit}
                min={1}
                max={play.players.length}
                onChange={(value) =>
                  putCell(
                    sheet,
                    row.identity.id,
                    CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition,
                    value,
                  )
                }
              />
              <Count
                label={scoreText("Súp · mỗi tô = 1")}
                value={meal[CRITTER_KITCHEN_SCALAR_KEYS.soupCount] ?? 0}
                disabled={!canEdit}
                onChange={(value) =>
                  putCell(sheet, row.identity.id, CRITTER_KITCHEN_SCALAR_KEYS.soupCount, value)
                }
              />
              <Count
                label={scoreText("Bisque · mỗi tô = 3")}
                value={meal[CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount] ?? 0}
                disabled={!canEdit}
                onChange={(value) =>
                  putCell(sheet, row.identity.id, CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount, value)
                }
              />
              {rumorTokenEnabled ? (
                <Count
                  label={scoreText("Token tin đồn")}
                  value={meal[CRITTER_KITCHEN_SCALAR_KEYS.rumorTokenCount] ?? 0}
                  disabled={!canEdit}
                  onChange={(value) =>
                    putCell(
                      sheet,
                      row.identity.id,
                      CRITTER_KITCHEN_SCALAR_KEYS.rumorTokenCount,
                      value,
                    )
                  }
                />
              ) : null}
            </View>
            <Hint>
              {scoreText("Vị trí ưu tiên phải khác nhau giữa mọi người: 1 đi trước, tiếp theo là 2, v.v.")}</Hint>
            {missing.length > 0 && canEdit ? (
              <Button
                label={scoreText("Xác nhận giá trị đang hiện")}
                tone="ghost"
                onPress={() => {
                  putCell(
                    sheet,
                    row.identity.id,
                    CRITTER_KITCHEN_SCALAR_KEYS.previousStars,
                    meal[CRITTER_KITCHEN_SCALAR_KEYS.previousStars] ?? 0,
                  );
                  putCell(
                    sheet,
                    row.identity.id,
                    CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition,
                    meal[CRITTER_KITCHEN_SCALAR_KEYS.priorityPosition] ??
                      defaultPriorities[row.identity.id] ??
                      1,
                  );
                  putCell(
                    sheet,
                    row.identity.id,
                    CRITTER_KITCHEN_SCALAR_KEYS.soupCount,
                    meal[CRITTER_KITCHEN_SCALAR_KEYS.soupCount] ?? 0,
                  );
                  putCell(
                    sheet,
                    row.identity.id,
                    CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount,
                    meal[CRITTER_KITCHEN_SCALAR_KEYS.bisqueCount] ?? 0,
                  );
                }}
              />
            ) : null}
            <View style={styles.inputGrid}>
              {availableCourses.map((course) => {
                const ingredientTypes: CritterKitchenIngredientType[] =
                  course === 'gelato'
                    ? ['gelato']
                    : selectedCritic?.ability === 'badger' && course !== 'mushroom'
                      ? [course, 'mushroom']
                      : [course];
                return (
                  <CourseMeal
                    key={course}
                    course={course}
                    playerId={row.identity.id}
                    meal={meal}
                    sheet={sheet}
                    disabled={!canEdit}
                    ingredientTypes={ingredientTypes}
                    criticAbility={selectedCritic?.ability ?? 'standard'}
                    allowAnySpice={meal[critterKitchenRestaurateurKey('julia-wild')] === 1}
                    showPairedWine={supportsPairedWine}
                  />
                );
              })}
            </View>
            <PersonalEffects
              playerId={row.identity.id}
              meal={meal}
              sheet={sheet}
              disabled={!canEdit}
            />
            {leftoversEnabled ? (
              <LeftoverInputs
                playerId={row.identity.id}
                meal={meal}
                sheet={sheet}
                disabled={!canEdit}
                ingredientTypes={leftoverIngredientTypes}
                showSpices={leftoverSpicesEnabled}
              />
            ) : null}
          </Card>
        );
      })}

      {result ? (
        <EngineBreakdown
          result={result}
          playerNames={Object.fromEntries(
            sheet.state.players.map((player) => [player.id, scorePlayerName(player)]),
          )}
        />
      ) : null}
    </View>
  );
}

function putCell(
  sheet: SheetApi,
  playerId: string,
  key: string,
  value: number,
  clearAtZero = false,
) {
  const normalized = Math.max(0, Math.round(value));
  sheet.setInputValue(
    playerId,
    CRITTER_KITCHEN_MEAL_CATEGORY_KEY,
    key,
    clearAtZero && normalized === 0 ? null : normalized,
  );
}

function CourseMeal({
  course,
  playerId,
  meal,
  sheet,
  disabled,
  ingredientTypes,
  criticAbility,
  allowAnySpice,
  showPairedWine,
}: {
  course: CritterKitchenCourseId;
  playerId: string;
  meal: MealRecord;
  sheet: SheetApi;
  disabled: boolean;
  ingredientTypes: readonly CritterKitchenIngredientType[];
  criticAbility: string;
  allowAnySpice: boolean;
  showPairedWine: boolean;
}) {
  const [sourceChoice, setSourceChoice] = useState<CritterKitchenIngredientType>(course);
  const [valueChoice, setValueChoice] = useState<number>(4);
  const [spiceChoice, setSpiceChoice] = useState<CritterKitchenSpiceType>(
    course === 'gelato' ? 'bread' : course,
  );
  const [pairedWineValue, setPairedWineValue] = useState<number>(4);
  const effectiveSourceChoice = ingredientTypes.includes(sourceChoice)
    ? sourceChoice
    : (ingredientTypes[0] ?? course);
  const allowedSpicesFor = (source: CritterKitchenIngredientType): CritterKitchenSpiceType[] =>
    allowAnySpice || (criticAbility === 'badger' && source === 'mushroom')
      ? SPICES
      : SPICES.filter((spice) => spice === source);
  const keys = SOURCE_INGREDIENTS.flatMap((source) =>
    VALUE_OPTIONS.map((value) => {
      const served = critterKitchenServedKey(course, source, value);
      const allspice = critterKitchenAllspiceKey(course, source, value);
      return { source, value, served, allspice };
    }),
  );
  const used = keys.filter(
    ({ served, allspice, source, value }) =>
      (meal[served] ?? 0) > 0 ||
      (meal[allspice] ?? 0) > 0 ||
      SPICES.some((spice) => (meal[critterKitchenSpiceKey(course, source, value, spice)] ?? 0) > 0),
  );

  return (
    <Collapsible title={scoreText(COURSE_LABEL[course])}>
      <Hint>
        {scoreText("Nhập nguyên liệu thực sự đã đặt lên món; dùng loại in trên token nếu hiệu ứng cho phép đổi món.")}</Hint>
      {used.map(({ source, value, served, allspice }) => (
        <View key={served} style={styles.ingredientRow}>
          <Count
            label={scoreText('{ingredient} {value}', {
              ingredient: scoreText(COURSE_LABEL[source]),
              value,
            })}
            value={meal[served] ?? 0}
            disabled={disabled}
            onChange={(count) => putCell(sheet, playerId, served, count, true)}
          />
          {SPICES.map((spice) => {
            const key = critterKitchenSpiceKey(course, source, value, spice);
            if ((meal[key] ?? 0) === 0) return null;
            return (
              <Count
                key={key}
                label={scoreText('Gia vị {spice}', { spice: scoreText(COURSE_LABEL[spice]) })}
                value={meal[key] ?? 0}
                disabled={disabled}
                onChange={(count) => putCell(sheet, playerId, key, count, true)}
              />
            );
          })}
          <View style={styles.wrap}>
            {(() => {
              const options = allowedSpicesFor(source);
              const selectedSpice = options.includes(spiceChoice) ? spiceChoice : options[0];
              return selectedSpice ? (
                <>
                  <Chip
                    label={scoreText('Thêm gia vị {spice}', {
                      spice: scoreText(COURSE_LABEL[selectedSpice]),
                    })}
                    disabled={disabled}
                    onPress={() => {
                      const key = critterKitchenSpiceKey(course, source, value, selectedSpice);
                      putCell(sheet, playerId, key, (meal[key] ?? 0) + 1);
                    }}
                  />
                  <View style={styles.wrap}>
                    {options.map((spice) => (
                      <Chip
                        key={spice}
                        label={scoreText(COURSE_LABEL[spice])}
                        selected={selectedSpice === spice}
                        disabled={disabled}
                        onPress={() => setSpiceChoice(spice)}
                      />
                    ))}
                  </View>
                </>
              ) : null;
            })()}
            <Count
              label={scoreText("Allspice")}
              value={meal[allspice] ?? 0}
              disabled={disabled}
              onChange={(count) => putCell(sheet, playerId, allspice, count, true)}
            />
          </View>
        </View>
      ))}
      <View style={styles.selectionBox}>
        <Text style={styles.smallHeading}>{scoreText("Thêm nguyên liệu đã phục vụ")}</Text>
        <View style={styles.wrap}>
          {ingredientTypes.map((source) => (
            <Chip
              key={source}
              label={scoreText(COURSE_LABEL[source])}
              selected={effectiveSourceChoice === source}
              disabled={disabled}
              onPress={() => setSourceChoice(source)}
            />
          ))}
        </View>
        <View style={styles.wrap}>
          {VALUE_OPTIONS.map((value) => (
            <Chip
              key={value}
              label={String(value)}
              selected={valueChoice === value}
              disabled={disabled}
              onPress={() => setValueChoice(value)}
            />
          ))}
        </View>
        <Button
          label={scoreText("Thêm 1 nguyên liệu")}
          tone="ghost"
          disabled={disabled}
          onPress={() => {
            const key = critterKitchenServedKey(course, effectiveSourceChoice, valueChoice);
            putCell(sheet, playerId, key, (meal[key] ?? 0) + 1);
          }}
        />
      </View>
      {showPairedWine ? (
        <View style={styles.selectionBox}>
          <Text style={styles.smallHeading}>{scoreText("Rượu ghép · Fruit Bat")}</Text>
          <View style={styles.wrap}>
            {VALUE_OPTIONS.map((value) => (
              <Chip
                key={value}
                label={String(value)}
                selected={pairedWineValue === value}
                disabled={disabled}
                onPress={() => setPairedWineValue(value)}
              />
            ))}
          </View>
          <Count
            label={scoreText('Rượu ghép {value}', { value: pairedWineValue })}
            value={meal[critterKitchenPairedWineKey(course, pairedWineValue)] ?? 0}
            disabled={disabled}
            onChange={(count) =>
              putCell(
                sheet,
                playerId,
                critterKitchenPairedWineKey(course, pairedWineValue),
                count,
                true,
              )
            }
          />
        </View>
      ) : null}
    </Collapsible>
  );
}

function PersonalEffects({
  playerId,
  meal,
  sheet,
  disabled,
}: {
  playerId: string;
  meal: MealRecord;
  sheet: SheetApi;
  disabled: boolean;
}) {
  const restaurateurs = CRITTER_KITCHEN_CATALOG.restaurateurs;
  const selected = restaurateurs.find((item) => meal[critterKitchenRestaurateurKey(item.id)] === 1);
  const noRestaurateurSelected = meal[critterKitchenRestaurateurKey('none')] === 1;
  return (
    <Collapsible title={scoreText("Thẻ và hiệu ứng cá nhân")}>
      <Hint>
        {scoreText("Chọn đúng một chủ nhà hàng hoặc «Không dùng chủ nhà hàng». Sao thưởng được cộng tự động.")}</Hint>
      <View style={styles.wrap}>
        <Chip
          label={scoreText("Không dùng chủ nhà hàng")}
          selected={noRestaurateurSelected}
          disabled={disabled}
          onPress={() => {
            if (selected)
              putCell(sheet, playerId, critterKitchenRestaurateurKey(selected.id), 0, true);
            putCell(sheet, playerId, critterKitchenRestaurateurKey('none'), 1);
          }}
        />
        {restaurateurs.map((item) => (
          <Chip
            key={item.id}
            label={item.supported ? item.label : scoreText('{label} · chưa hỗ trợ', { label: item.label })}
            selected={selected?.id === item.id}
            disabled={disabled || (!item.supported && selected?.id !== item.id)}
            onPress={() => {
              if (selected?.id)
                putCell(sheet, playerId, critterKitchenRestaurateurKey(selected.id), 0, true);
              if (noRestaurateurSelected)
                putCell(sheet, playerId, critterKitchenRestaurateurKey('none'), 0, true);
              if (selected?.id !== item.id && item.supported)
                putCell(sheet, playerId, critterKitchenRestaurateurKey(item.id), 1);
            }}
          />
        ))}
      </View>
      {restaurateurs
        .filter((item) => !item.supported)
        .map((item) => (
          <Hint key={`unsupported-restaurateur-${item.id}`}>
            {item.label}: {scoreText(UNSUPPORTED_CARD_MESSAGE)}
          </Hint>
        ))}
      {selected ? (
        <Hint>
          {selected.label}: +{selected.bonusStars} {scoreText("sao tự động.")}{selected.finalMealAbility === 'allspice-conversion'
            ? scoreText("Gia vị bất kỳ có thể ghép như Allspice.")
            : selected.finalMealAbility === 'extra-rumor'
              ? scoreText("Chủ bàn sẽ nhập tin đồn bổ sung đã lật trong thiết lập chung.")
              : ''}
        </Hint>
      ) : null}
    </Collapsible>
  );
}

function LeftoverInputs({
  playerId,
  meal,
  sheet,
  disabled,
  ingredientTypes,
  showSpices,
}: {
  playerId: string;
  meal: MealRecord;
  sheet: SheetApi;
  disabled: boolean;
  ingredientTypes: readonly CritterKitchenIngredientType[];
  showSpices: boolean;
}) {
  const [ingredientChoice, setIngredientChoice] = useState<CritterKitchenIngredientType>(
    ingredientTypes[0] ?? 'bread',
  );
  const [valueChoice, setValueChoice] = useState<number>(4);
  const [spiceChoice, setSpiceChoice] = useState<CritterKitchenSpiceType>('bread');
  const effectiveIngredientChoice = ingredientTypes.includes(ingredientChoice)
    ? ingredientChoice
    : (ingredientTypes[0] ?? 'bread');
  const existingIngredients = SOURCE_INGREDIENTS.flatMap((source) =>
    VALUE_OPTIONS.map((value) => ({
      source,
      value,
      key: critterKitchenLeftoverKey(source, value),
    })),
  ).filter(({ key, source }) => ingredientTypes.includes(source) && (meal[key] ?? 0) > 0);
  const existingSpices = SPICES.map((spice) => ({
    spice,
    key: critterKitchenLeftoverSpiceKey(spice),
  })).filter(({ key }) => showSpices && (meal[key] ?? 0) > 0);
  const allspiceKey = critterKitchenLeftoverSpiceKey('allspice');

  return (
    <Collapsible title={scoreText("Nguyên liệu và gia vị còn thừa")}>
      <Hint>{scoreText("Chỉ nhập phần thừa nếu một tin đồn hoặc hiệu ứng đang dùng chúng để chấm điểm.")}</Hint>
      {existingIngredients.map(({ source, value, key }) => (
        <Count
          key={key}
          label={scoreText('{ingredient} {value} còn thừa', {
            ingredient: scoreText(COURSE_LABEL[source]),
            value,
          })}
          value={meal[key] ?? 0}
          disabled={disabled}
          onChange={(count) => putCell(sheet, playerId, key, count, true)}
        />
      ))}
      {existingSpices.map(({ spice, key }) => (
        <Count
          key={key}
          label={scoreText('Gia vị {spice} còn thừa', { spice: scoreText(COURSE_LABEL[spice]) })}
          value={meal[key] ?? 0}
          disabled={disabled}
          onChange={(count) => putCell(sheet, playerId, key, count, true)}
        />
      ))}
      {ingredientTypes.length > 0 ? (
        <View style={styles.selectionBox}>
          <Text style={styles.smallHeading}>{scoreText("Thêm nguyên liệu thừa")}</Text>
          <View style={styles.wrap}>
            {ingredientTypes.map((source) => (
              <Chip
                key={source}
                label={scoreText(COURSE_LABEL[source])}
                selected={effectiveIngredientChoice === source}
                disabled={disabled}
                onPress={() => setIngredientChoice(source)}
              />
            ))}
          </View>
          <View style={styles.wrap}>
            {VALUE_OPTIONS.map((value) => (
              <Chip
                key={value}
                label={String(value)}
                selected={valueChoice === value}
                disabled={disabled}
                onPress={() => setValueChoice(value)}
              />
            ))}
          </View>
          <Button
            label={scoreText("Thêm 1 nguyên liệu thừa")}
            tone="ghost"
            disabled={disabled}
            onPress={() => {
              const key = critterKitchenLeftoverKey(effectiveIngredientChoice, valueChoice);
              putCell(sheet, playerId, key, (meal[key] ?? 0) + 1);
            }}
          />
        </View>
      ) : null}
      {showSpices ? (
        <View style={styles.selectionBox}>
          <Text style={styles.smallHeading}>{scoreText("Thêm gia vị thừa")}</Text>
          <View style={styles.wrap}>
            {SPICES.map((spice) => (
              <Chip
                key={spice}
                label={scoreText(COURSE_LABEL[spice])}
                selected={spiceChoice === spice}
                disabled={disabled}
                onPress={() => setSpiceChoice(spice)}
              />
            ))}
          </View>
          <Button
            label={scoreText('Thêm 1 gia vị {spice}', {
              spice: scoreText(COURSE_LABEL[spiceChoice]),
            })}
            tone="ghost"
            disabled={disabled}
            onPress={() => {
              const key = critterKitchenLeftoverSpiceKey(spiceChoice);
              putCell(sheet, playerId, key, (meal[key] ?? 0) + 1);
            }}
          />
          <Count
            label={scoreText("Allspice còn thừa")}
            value={meal[allspiceKey] ?? 0}
            disabled={disabled}
            onChange={(count) => putCell(sheet, playerId, allspiceKey, count, true)}
          />
        </View>
      ) : null}
    </Collapsible>
  );
}

function EngineBreakdown({
  result,
  playerNames,
}: {
  result: ReturnType<typeof computeCritterKitchen>;
  playerNames: Record<string, string>;
}) {
  return (
    <Card>
      <Heading>{scoreText("Phân tích Critter Kitchen")}</Heading>
      {!result.complete ? (
        <Hint>{scoreText("Chưa thể chốt ván. Hoàn tất các trường bắt buộc bên dưới.")}</Hint>
      ) : null}
      {result.errors.map((error) => (
        <Text key={`${error.code}-${error.path ?? error.message}`} style={styles.error}>
          {scoreFeedbackText(error.message)}
        </Text>
      ))}
      {result.warnings.map((warning) => (
        <Hint key={warning}>{scoreFeedbackText(warning)}</Hint>
      ))}
      {result.players.map((player) => (
        <View key={player.identityId} style={styles.resultPlayer}>
          <Text style={styles.playerName}>
            {player.rank ? `#${player.rank} ` : ''}
            {playerNames[player.identityId] ?? player.identityId}
          </Text>
          <Text style={styles.total}>{player.total} ★</Text>
          <Hint>
            {Object.entries(player.courseQuality)
              .map(
                ([course, quality]) =>
                  `${scoreText(COURSE_LABEL[course as CritterKitchenCourseId] ?? course)}: ${quality}`,
              )
              .join(' · ') || scoreText("Chưa đủ món để tính chất lượng.")}
          </Hint>
          <Hint>
            {Object.entries(player.categories)
              .map(([category, score]) => `${scoreText(CATEGORY_LABEL[category] ?? category)}: ${score}`)
              .join(' · ')}
          </Hint>
          {Object.entries(player.rumorScores).length ? (
            <Hint>
              {scoreText("Tin đồn:")}{' '}
              {Object.entries(player.rumorScores)
                .map(([id, score]) => `${CRITTER_KITCHEN_CATALOG.rumors.find((rumor) => rumor.id === id)?.label ?? id}: ${score}`)
                .join(' · ')}
            </Hint>
          ) : null}
          <Hint>
            {scoreText('Track:')} {player.trackPosition} {scoreText("· vượt mốc 70:")}{" "}{player.trackLoops}
          </Hint>
        </View>
      ))}
    </Card>
  );
}

const CATEGORY_LABEL: Record<string, string> = {
  challengeStars: 'Sao món thử thách',
  mostSoup: 'Súp và bisque',
  allSevenCourses: 'Đủ 7 món',
  bestOfCourse: 'Món tốt nhất',
  rumors: 'Tin đồn',
  bonus: 'Sao thưởng',
  criticTrackLoopStars: 'Sao vượt mốc 70',
  criticTrackRowStars: 'Sao hàng cuối',
};

const styles = themeStyles(() => StyleSheet.create({
  column: { gap: 12 },
  nestedCard: { padding: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  playerBlock: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  playerName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countLabel: { flex: 1, color: colors.text, fontSize: 13 },
  inputGrid: { gap: 8 },
  ingredientRow: { gap: 8, padding: 8, borderRadius: 10, backgroundColor: colors.bg },
  selectionBox: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  smallHeading: { color: colors.text, fontSize: 13, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13 },
  resultPlayer: { gap: 4, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  total: { color: colors.primary, fontSize: 18, fontWeight: '800' },
}));
