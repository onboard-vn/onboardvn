import type { RawValue, ScoreCategory } from '@onboard/shared';
import { useState } from 'react';
import { TEAM_ID } from '../api/plays-types';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NumberField } from '../ui/number-field';
import { Button, Card, Chip, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { useAppPreferences } from '../ui/preferences';
import { Flash, PresenceLabel } from './cell-flash';
import { categoryAppliesToAny, categoryApplies, visibleCategories } from './model';
import type { SheetApi } from './use-sheet';
import { scorePlayerName, scoreText, templateScoreText } from './localization';
const asNumber = (v: RawValue | undefined): number =>
  typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : 0;
const asList = (v: RawValue | undefined): number[] =>
  Array.isArray(v) ? v : typeof v === 'number' ? [v] : [];
const asRecord = (v: RawValue | undefined): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

function ListField({
  value,
  onChange,
  disabled,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const n = Number(draft.replace(',', '.'));
    if (draft.trim() === '' || !Number.isFinite(n)) return;
    onChange([...value, n]);
    setDraft('');
  };
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.wrap}>
        {value.map((n, i) => (
          <Chip
            key={`${i}-${n}`}
            label={`${n} ✕`}
            disabled={disabled}
            onPress={() => onChange(value.filter((_, j) => j !== i))}
          />
        ))}
      </View>
      <View style={styles.inline}>
        <TextInput
          value={draft}
          editable={!disabled}
          onChangeText={setDraft}
          onSubmitEditing={add}
          keyboardType="numbers-and-punctuation"
          placeholder={scoreText('Thêm giá trị')}
          style={styles.input}
        />
        <Button
          label={scoreText('Thêm')}
          tone="ghost"
          onPress={add}
          disabled={disabled || draft.trim() === ''}
        />
      </View>
    </View>
  );
}

function BoolListField({
  value,
  max,
  onChange,
  disabled,
}: {
  value: number[];
  max?: number;
  disabled?: boolean;
  onChange: (v: number[]) => void;
}) {
  const full = max !== undefined && value.length >= max;
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.wrap}>
        {value.map((n, i) => (
          <Chip
            key={`${i}-${n}`}
            disabled={disabled}
            label={`${i + 1}: ${n ? '✓' : '✗'}`}
            tint={n ? colors.success : colors.danger}
            selected
            onPress={() => onChange(value.filter((_, j) => j !== i))}
          />
        ))}
        {value.length === 0 ? <Hint>{scoreText('Chưa có phi vụ nào.')}</Hint> : null}
      </View>
      <View style={styles.wrap}>
        <Button
          label={scoreText('✓ Thành công')}
          disabled={disabled || full}
          onPress={() => onChange([...value, 1])}
        />
        <Button
          label={scoreText('✗ Thất bại')}
          tone="ghost"
          disabled={disabled || full}
          onPress={() => onChange([...value, 0])}
        />
      </View>
      {value.length ? <Hint>{scoreText('Bấm vào một ô để xoá.')}</Hint> : null}
    </View>
  );
}

export function CategoryControl({
  cat,
  value,
  onChange,
  disabled,
}: {
  cat: ScoreCategory;
  disabled?: boolean;
  value: RawValue | undefined;
  onChange: (v: RawValue) => void;
}) {
  switch (cat.input) {
    case 'bool':
      return (
        <Switch
          disabled={disabled}
          value={asNumber(value) !== 0}
          onValueChange={(b) => onChange(b ? 1 : 0)}
        />
      );
    case 'counts': {
      const rec = asRecord(value);
      return (
        <View style={{ gap: 6 }}>
          {(cat.inputs ?? []).map((name) => (
            <View key={name} style={styles.inline}>
              <Text style={styles.sub}>{scoreText(name)}</Text>
              <NumberField
                value={rec[name] ?? 0}
                min={0}
                width={56}
                disabled={disabled}
                onChange={(n) => onChange({ ...rec, [name]: n })}
              />
            </View>
          ))}
        </View>
      );
    }
    case 'perRound':
      if (cat.roundInput === 'bool') {
        return (
          <BoolListField
            disabled={disabled}
            value={asList(value)}
            max={cat.max ?? undefined}
            onChange={onChange}
          />
        );
      }
      return <ListField disabled={disabled} value={asList(value)} onChange={onChange} />;
    case 'repeating':
      return <ListField disabled={disabled} value={asList(value)} onChange={onChange} />;
    default:
      return (
        <NumberField
          disabled={disabled}
          value={asNumber(value)}
          min={cat.min}
          max={cat.max}
          onChange={onChange}
        />
      );
  }
}

function CategoryCard({ sheet, cat }: { sheet: SheetApi; cat: ScoreCategory }) {
  const { language } = useAppPreferences();
  const { state, summary } = sheet;
  const { players } = state;
  const resultOf = (id: string) =>
    summary.result?.players.find((p) => p.id === id)?.categories[cat.key];
  const showPoints = cat.formula.type !== 'sum';

  let body;
  if (cat.input === 'derived') {
    const computed = (id: string | undefined) =>
      cat.scope === 'team'
        ? summary.result?.teams.find((t) => !id || t.memberIds.includes(id))?.categories[cat.key]
        : id
          ? resultOf(id)
          : undefined;
    body =
      cat.scope === 'team' ? (
        <Text style={styles.derived}>{computed(players[0]?.id) ?? 0}</Text>
      ) : (
        players.map((p) => (
          <View key={p.id} style={styles.playerRow}>
            <Text style={styles.player}>{scorePlayerName(p)}</Text>
            <Text style={styles.derived}>{computed(p.id) ?? 0}</Text>
          </View>
        ))
      );
  } else if (cat.input === 'exclusive') {
    const chosen = players.find((p) => asNumber(state.values[p.id]?.[cat.key]) !== 0)?.id ?? null;
    const pick = (id: string | null) =>
      sheet.patchValues(
        Object.fromEntries(players.map((p) => [p.id, { [cat.key]: p.id === id ? 1 : 0 }])),
      );
    body = (
      <View style={styles.wrap}>
        <Chip
          disabled={!sheet.canManage}
          label={scoreText('Không ai')}
          selected={chosen === null}
          onPress={() => pick(null)}
        />
        {players.map((p) => (
          <Chip
            disabled={!sheet.canManage}
            key={p.id}
            label={scorePlayerName(p)}
            selected={chosen === p.id}
            onPress={() => pick(p.id)}
          />
        ))}
      </View>
    );
  } else if (cat.scope === 'team') {
    body = (
      <Flash sheet={sheet} id={TEAM_ID} cat={cat.key}>
        <CategoryControl
          cat={cat}
          value={state.teamValues[cat.key]}
          disabled={!sheet.canManage}
          onChange={(v) => sheet.setTeamValue(cat.key, v)}
        />
      </Flash>
    );
  } else {
    body = players.map((p) => {
      const applies = categoryApplies(cat, p.id, summary, players.length);
      const pts = resultOf(p.id);
      return (
        <View key={p.id} style={styles.playerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.player}>{scorePlayerName(p)}</Text>
            <PresenceLabel sheet={sheet} id={p.id} name={p.name} fallbackSeat={p.fallbackSeat} />
            {applies && showPoints && pts !== undefined ? (
              <Text style={styles.points}>
                = {pts} {scoreText('điểm')}
              </Text>
            ) : null}
          </View>
          {applies ? (
            <Flash sheet={sheet} id={p.id} cat={cat.key}>
              <CategoryControl
                cat={cat}
                value={state.values[p.id]?.[cat.key]}
                disabled={!sheet.canEditIdentity(p.id)}
                onChange={(v) => sheet.setValue(p.id, cat.key, v)}
              />
            </Flash>
          ) : (
            <Text style={styles.na}>{scoreText('Không áp dụng')}</Text>
          )}
        </View>
      );
    });
  }

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Heading>{templateScoreText(cat.labelVi ?? cat.label, cat.label, language)}</Heading>
        {cat.hint ? <Hint>{scoreText(cat.hint)}</Hint> : null}
        {cat.expansion ? (
          <Hint>
            {scoreText('Bản mở rộng:')} {scoreText(cat.expansion)}
          </Hint>
        ) : null}
      </View>
      {body}
    </Card>
  );
}

export function GenericCategories({ sheet }: { sheet: SheetApi }) {
  useAppPreferences();
  const cats = visibleCategories(sheet.template, sheet.state).filter(
    (c) => c.scope === 'team' || categoryAppliesToAny(c, sheet.summary, sheet.state.players),
  );
  return (
    <>
      {cats.map((c) => (
        <CategoryCard key={c.key} sheet={sheet} cat={c} />
      ))}
    </>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    inline: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
    playerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    player: { fontSize: 15, fontWeight: '600', color: colors.text },
    points: { fontSize: 12, color: colors.muted },
    derived: { fontSize: 18, fontWeight: '700', color: colors.text },
    na: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
    sub: { color: colors.text, fontSize: 14, flex: 1 },
    input: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
    },
  }),
);
