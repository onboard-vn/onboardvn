import type { RawValue, ScoreCategory } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { NumberField } from '../ui/number-field';
import { Button, Card, Chip, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import { categoryAppliesToAny, categoryApplies, visibleCategories } from './model';
import type { SheetApi } from './use-sheet';

const asNumber = (v: RawValue | undefined): number =>
  typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : 0;
const asList = (v: RawValue | undefined): number[] =>
  Array.isArray(v) ? v : typeof v === 'number' ? [v] : [];
const asRecord = (v: RawValue | undefined): Record<string, number> =>
  v && typeof v === 'object' && !Array.isArray(v) ? v : {};

function ListField({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
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
            onPress={() => onChange(value.filter((_, j) => j !== i))}
          />
        ))}
      </View>
      <View style={styles.inline}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          keyboardType="numbers-and-punctuation"
          placeholder="Thêm giá trị"
          style={styles.input}
        />
        <Button label="Thêm" tone="ghost" onPress={add} disabled={draft.trim() === ''} />
      </View>
    </View>
  );
}

function Control({
  cat,
  value,
  onChange,
}: {
  cat: ScoreCategory;
  value: RawValue | undefined;
  onChange: (v: RawValue) => void;
}) {
  switch (cat.input) {
    case 'bool':
      return <Switch value={asNumber(value) !== 0} onValueChange={(b) => onChange(b ? 1 : 0)} />;
    case 'counts': {
      const rec = asRecord(value);
      return (
        <View style={{ gap: 6 }}>
          {(cat.inputs ?? []).map((name) => (
            <View key={name} style={styles.inline}>
              <Text style={styles.sub}>{name}</Text>
              <NumberField
                value={rec[name] ?? 0}
                min={0}
                width={56}
                onChange={(n) => onChange({ ...rec, [name]: n })}
              />
            </View>
          ))}
        </View>
      );
    }
    case 'repeating':
    case 'perRound':
      return <ListField value={asList(value)} onChange={onChange} />;
    default:
      return (
        <NumberField value={asNumber(value)} min={cat.min} max={cat.max} onChange={onChange} />
      );
  }
}

function CategoryCard({ sheet, cat }: { sheet: SheetApi; cat: ScoreCategory }) {
  const { state, summary } = sheet;
  const { players } = state;
  const resultOf = (id: string) =>
    summary.result?.players.find((p) => p.id === id)?.categories[cat.key];
  const showPoints = cat.formula.type !== 'sum';

  let body;
  if (cat.input === 'exclusive') {
    const chosen = players.find((p) => asNumber(state.values[p.id]?.[cat.key]) !== 0)?.id ?? null;
    const pick = (id: string | null) =>
      sheet.patchValues(
        Object.fromEntries(players.map((p) => [p.id, { [cat.key]: p.id === id ? 1 : 0 }])),
      );
    body = (
      <View style={styles.wrap}>
        <Chip label="Không ai" selected={chosen === null} onPress={() => pick(null)} />
        {players.map((p) => (
          <Chip key={p.id} label={p.name} selected={chosen === p.id} onPress={() => pick(p.id)} />
        ))}
      </View>
    );
  } else if (cat.scope === 'team') {
    body = (
      <Control
        cat={cat}
        value={state.teamValues[cat.key]}
        onChange={(v) => sheet.setTeamValue(cat.key, v)}
      />
    );
  } else {
    body = players.map((p) => {
      const applies = categoryApplies(cat, p.id, summary, players.length);
      const pts = resultOf(p.id);
      return (
        <View key={p.id} style={styles.playerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.player}>{p.name}</Text>
            {applies && showPoints && pts !== undefined ? (
              <Text style={styles.points}>= {pts} điểm</Text>
            ) : null}
          </View>
          {applies ? (
            <Control
              cat={cat}
              value={state.values[p.id]?.[cat.key]}
              onChange={(v) => sheet.setValue(p.id, cat.key, v)}
            />
          ) : (
            <Text style={styles.na}>Không áp dụng</Text>
          )}
        </View>
      );
    });
  }

  return (
    <Card>
      <View style={{ gap: 2 }}>
        <Heading>{cat.labelVi ?? cat.label}</Heading>
        {cat.hint ? <Hint>{cat.hint}</Hint> : null}
        {cat.expansion ? <Hint>Bản mở rộng: {cat.expansion}</Hint> : null}
      </View>
      {body}
    </Card>
  );
}

export function GenericCategories({ sheet }: { sheet: SheetApi }) {
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

const styles = StyleSheet.create({
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
  na: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  sub: { color: colors.text, fontSize: 14, flex: 1 },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
});
