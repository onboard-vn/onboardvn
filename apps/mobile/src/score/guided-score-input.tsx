import type { RawValue, ScoreCategory } from '@onboard/shared';
import { Linking, Switch, Text, View } from 'react-native';
import { NumberField } from '../ui/number-field';
import { Button, Card, Chip, Heading, Hint } from '../ui/primitives';
import { CategoryControl } from './generic-categories';
import { TEAM_ID } from '../api/plays-types';
import { categoryApplies, visibleCategories } from './model';
import type { GameGuide, GuideField, GuideGroup } from './guides/types';
import type { SheetApi } from './use-sheet';
import { scorePlayerName, scoreText, templateScoreText } from './localization';
import { useAppPreferences } from '../ui/preferences';
export function guideMatches(sheet: SheetApi, guide: GameGuide): boolean {
  return (
    sheet.template.templateVersion >= (guide.minTemplateVersion ?? 1) &&
    (guide.requiredKeys ?? []).every((key) => sheet.template.categories.some((c) => c.key === key))
  );
}

function Field({ sheet, field, cat }: { sheet: SheetApi; field: GuideField; cat: ScoreCategory }) {
  const { language } = useAppPreferences();
  const shared = cat.scope === 'team';
  const participants = shared ? [{ id: '__shared', name: scoreText('Cả bàn') }] : sheet.state.players;
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontWeight: '600', fontSize: 16 }}>
        {field.icon ?? '•'}{' '}
        {field.label
          ? scoreText(field.label)
          : templateScoreText(cat.labelVi ?? cat.label, cat.label, language)}
      </Text>
      {field.hint || cat.hint ? <Hint>{scoreText(field.hint ?? cat.hint ?? '')}</Hint> : null}
      {field.manualPoints ? <Hint>{scoreText("Nhập VP đã tính theo thẻ/luật, không nhập số lượng.")}</Hint> : null}
      {participants.map((p) => {
        if (!shared && !categoryApplies(cat, p.id, sheet.summary, sheet.state.players.length))
          return null;
        const raw = shared ? sheet.state.teamValues[cat.key] : sheet.state.values[p.id]?.[cat.key];
        const editable = shared || field.hostOnly ? sheet.canManage : sheet.canEditIdentity(p.id);
        const write = (value: RawValue) =>
          shared ? sheet.setTeamValue(cat.key, value) : sheet.setValue(p.id, cat.key, value);
        const points = sheet.summary.result?.players.find((r) => shared || r.id === p.id)
          ?.categories[cat.key];
        const scalar = (v: RawValue | undefined) =>
          typeof v === 'number' ? v : Number(v === true);
        const choices = (
          value: number,
          items: { value: number; label: string }[],
          update: (n: number) => void,
        ) => (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {items.map((c) => (
              <Chip
                key={c.value}
                label={scoreText(c.label)}
                selected={value === c.value}
                disabled={!editable}
                onPress={() => update(c.value)}
              />
            ))}
          </View>
        );
        return (
          <View key={p.id} style={{ gap: 6 }}>
            <Text>
              {scorePlayerName(p)}
              {points !== undefined && !(cat.input === 'bool' && !cat.countsToTotal)
                ? ` · ${points} ${cat.countsToTotal ? 'VP' : scoreText("(tham chiếu)")}`
                : ''}
            </Text>
            {field.readOnly ? (
              <Hint>{scoreText("Tự tính từ các mục đã nhập.")}</Hint>
            ) : field.choices ? (
              choices(scalar(raw), field.choices, write)
            ) : cat.input === 'counts' ? (
              (cat.inputs ?? []).map((key) => {
                const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
                const update = (n: number) => {
                  if (shared) sheet.setInputValue(TEAM_ID, cat.key, key, n);
                  else sheet.setInputValue(p.id, cat.key, key, n);
                };
                return (
                  <View key={key} style={{ gap: 4 }}>
                    <Text>{scoreText(field.inputs?.[key] ?? key)}</Text>
                    {field.inputChoices?.[key] ? (
                      choices(record[key] ?? 0, field.inputChoices[key], update)
                    ) : (
                      <NumberField
                        value={record[key] ?? 0}
                        min={
                          field.inputMin && Object.hasOwn(field.inputMin, key)
                            ? field.inputMin[key]
                            : 0
                        }
                        disabled={!editable}
                        onChange={update}
                      />
                    )}
                  </View>
                );
              })
            ) : cat.input === 'bool' ? (
              <Switch
                value={scalar(raw) !== 0}
                disabled={!editable}
                onValueChange={(v) => write(Number(v))}
              />
            ) : (
              <CategoryControl cat={cat} value={raw} disabled={!editable} onChange={write} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export function GuidedScoreInput({ sheet, guide }: { sheet: SheetApi; guide: GameGuide }) {
  useAppPreferences();
  const visible = visibleCategories(sheet.template, sheet.state);
  const declared = new Set(guide.groups.flatMap((g) => g.fields.map((f) => f.key)));
  const groups: GuideGroup[] = [
    ...guide.groups,
    {
      title: 'Mục bổ sung',
      fields: visible.filter((c) => !declared.has(c.key)).map((c) => ({ key: c.key })),
    },
  ];
  return (
    <>
      <Card>
        <Heading>{scoreText(guide.edition)}</Heading>
        <Hint>{scoreText(guide.summary)}</Hint>
        {guide.limitations?.map((line) => (
          <Hint key={line}>{scoreText(line)}</Hint>
        ))}
        {guide.companion ? (
          <>
            <Hint>{scoreText(guide.companion.hint ?? "Mở công cụ bên ngoài để tham khảo.")}</Hint>
            <Button
              label={scoreText(guide.companion.label)}
              tone="ghost"
              onPress={() => {
                if (guide.companion) void Linking.openURL(guide.companion.url);
              }}
            />
          </>
        ) : null}
      </Card>
      {groups.map((group) => {
        const fields = group.fields.flatMap((field) => {
          const cat = visible.find((c) => c.key === field.key);
          return cat ? [{ field, cat }] : [];
        });
        return fields.length ? (
          <Card key={group.title}>
            <Heading>
              {group.icon ?? ''} {scoreText(group.title)}
            </Heading>
            {group.hint ? <Hint>{scoreText(group.hint)}</Hint> : null}
            {fields.map(({ field, cat }) => (
              <Field key={field.key} sheet={sheet} field={field} cat={cat} />
            ))}
          </Card>
        ) : null;
      })}
    </>
  );
}
