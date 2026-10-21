import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import catalog from '../../../../plans/reports/shadow-hunters-print-review.json';
import { Button, Card, Chip, Collapsible, Heading, Hint } from '../ui/primitives';
import { colors } from '../ui/theme';
import {
  presets,
  requiredDecisions,
  restoreSession,
  rulesFor,
  selectedCards,
  sets,
  setupErrors,
  setupFor,
  startSession,
  STORAGE_KEY,
  type CardRecord,
  type Session,
  type Setup,
} from '../shadow-hunters/model';

const deckLabel: Record<string, string> = {
  white: 'Trắng',
  black: 'Đen',
  green: 'Xanh lá',
  character: 'Tướng',
  location: 'Địa điểm',
};
const toggle = (values: string[], value: string) =>
  values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

function MarkPreview({ card }: { card: CardRecord }) {
  return (
    <View style={styles.row}>
      <View style={styles.face}>
        <Text style={styles.label}>Mặt trước</Text>
        <Text>{card.name}</Text>
        <Hint>
          {card.mark} · {card.version}
        </Hint>
        <Hint>{card.id}</Hint>
      </View>
      <View style={styles.face}>
        <Text style={styles.label}>Mặt sau</Text>
        <Text>{deckLabel[card.deck] ?? card.deck}</Text>
        <Hint>
          {card.mark} · {card.version}
        </Hint>
      </View>
    </View>
  );
}

export default function ShadowHuntersCompanion() {
  const [setup, setSetup] = useState<Setup>(() => setupFor('hunters-remastered'));
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [deck, setDeck] = useState('all');
  const [resetRequested, setResetRequested] = useState(false);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          const restored = restoreSession(raw);
          if (restored) setSession(restored);
          else setError('Không đọc được ván đã lưu. Hãy xóa bản lưu lỗi trước khi tạo ván mới.');
        }
      })
      .catch(() => {
        if (alive) setError('Không đọc được bộ nhớ thiết bị. Hãy mở lại màn hình để thử lại.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = session?.setup ?? setup;
  const cards = session?.cards ?? selectedCards(setup);
  const rules = session?.rules ?? rulesFor(setup);
  const decisions = requiredDecisions(setup);
  const errors = setupErrors(setup);
  const setLabels =
    session?.setLabels ??
    [...setup.characterSetIds, ...setup.drawSetIds].map(
      (id) => sets.find((s) => s.id === id)?.label_vi ?? id,
    );
  const totals = cards.reduce<Record<string, number>>((result, c) => {
    result[c.deck] = (result[c.deck] ?? 0) + c.quantity;
    return result;
  }, {});
  const normalizedQuery = query.toLocaleLowerCase('vi').trim();
  const visibleCards = cards.filter(
    (c) =>
      (deck === 'all' || c.deck === deck) &&
      `${c.name} ${c.id} ${c.mark} ${c.version}`.toLocaleLowerCase('vi').includes(normalizedQuery),
  );
  const change = (next: Partial<Setup>) => setSetup((s) => ({ ...s, ...next, decisions: {} }));
  async function begin() {
    setBusy(true);
    setError('');
    try {
      const next = startSession(setup);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSession(next);
      setQuery('');
      setDeck('all');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được ván.');
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setSetup(setupFor('hunters-remastered'));
      setResetRequested(false);
      setQuery('');
      setDeck('all');
      setError('');
    } catch {
      setError('Không xóa được bản lưu; ván hiện tại được giữ lại.');
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <View style={styles.content}>
        <Text>Đang khôi phục ván…</Text>
      </View>
    );
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Shadow Hunters · Mode & luật' }} />
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>
          {session ? `Đang chơi · ${session.label}` : 'Chuẩn bị ván'}
        </Text>
        <Text style={styles.bannerText}>
          {current.presetId === 'fangs-native'
            ? 'Fangs · Chưa đủ danh mục'
            : current.ruleset === 'shadow-hunters'
              ? 'Luật Shadow Hunters'
              : 'Luật Shadow Raiders'}{' '}
          · {current.playerCount} người
        </Text>
        <Text style={styles.bannerText}>{setLabels.join(' · ') || 'Chưa chọn bộ'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          {error ? (
            <Card>
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
              {!session ? (
                <Button
                  label="Xóa bản lưu lỗi"
                  tone="ghost"
                  disabled={busy}
                  onPress={() => setResetRequested(true)}
                />
              ) : null}
            </Card>
          ) : null}
          {!session ? (
            <>
              <Card>
                <Heading>Chọn mode</Heading>
                <View style={styles.wrap}>
                  {presets.map((p) => (
                    <Chip
                      key={p.id}
                      label={p.label_vi}
                      selected={setup.presetId === p.id}
                      onPress={() => {
                        setSetup(setupFor(p.id));
                        setQuery('');
                      }}
                    />
                  ))}
                </View>
                {presets
                  .find((p) => p.id === setup.presetId)
                  ?.notes_vi.map((n) => (
                    <Hint key={n}>{n}</Hint>
                  ))}
                <Text style={styles.label}>Luật nền</Text>
                <View style={styles.wrap}>
                  {(['shadow-hunters', 'shadow-raiders'] as const).map((r) => (
                    <Chip
                      key={r}
                      label={r === 'shadow-hunters' ? 'Shadow Hunters' : 'Shadow Raiders'}
                      selected={setup.ruleset === r}
                      onPress={() => change({ ruleset: r, presetId: 'custom-mix' })}
                    />
                  ))}
                </View>
                <Text style={styles.label}>Số người</Text>
                <View style={styles.wrap}>
                  {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <Chip
                      key={n}
                      label={String(n)}
                      selected={setup.playerCount === n}
                      onPress={() => change({ playerCount: n })}
                    />
                  ))}
                </View>
              </Card>
              <Card>
                <Heading>Kho tướng để chia kín</Heading>
                <Hint>
                  App không lưu ai cầm tướng nào. Chia tướng trên bàn theo tỷ lệ phe trong luật.
                </Hint>
                <View style={styles.wrap}>
                  <Chip
                    label="50 tướng đề xuất"
                    selected={setup.characterSelection === 'selected50'}
                    onPress={() =>
                      change({
                        characterSelection: 'selected50',
                        characterSetIds: sets.filter((s) => 'character_ids' in s).map((s) => s.id),
                        excludedCharacterIds: [],
                      })
                    }
                  />
                  <Chip
                    label="Chọn theo bộ"
                    selected={setup.characterSelection !== 'selected50'}
                    onPress={() => change({ characterSelection: 'sets' })}
                  />
                </View>
                {setup.characterSelection !== 'selected50' ? (
                  <View style={styles.wrap}>
                    {sets
                      .filter((s) => 'character_ids' in s)
                      .map((s) => (
                        <Chip
                          key={s.id}
                          label={`${s.mark_code} · ${s.label_vi}`}
                          selected={setup.characterSetIds.includes(s.id)}
                          onPress={() =>
                            change({
                              characterSetIds: toggle(setup.characterSetIds, s.id),
                              excludedCharacterIds: [],
                            })
                          }
                        />
                      ))}
                  </View>
                ) : null}
                <Hint>
                  {totals.character ?? 0} mẫu đang chọn. Có thể bỏ từng tướng ở phần tra cứu trước
                  khi bắt đầu.
                </Hint>
                {setup.excludedCharacterIds?.length ? (
                  <Button
                    tone="ghost"
                    label={`Khôi phục ${setup.excludedCharacterIds.length} tướng đã bỏ`}
                    onPress={() => change({ excludedCharacterIds: [] })}
                  />
                ) : null}
              </Card>
              <Card>
                <Heading>Bộ bài bốc</Heading>
                <View style={styles.wrap}>
                  {sets
                    .filter((s) => !('character_ids' in s))
                    .map((s) => (
                      <Chip
                        key={s.id}
                        label={`${s.mark_code} · ${s.label_vi}`}
                        selected={setup.drawSetIds.includes(s.id)}
                        onPress={() =>
                          change({
                            presetId: 'custom-mix',
                            drawSetIds: toggle(setup.drawSetIds, s.id),
                          })
                        }
                      />
                    ))}
                </View>
                <Hint>
                  Màu bài và dấu bộ là hai thông tin riêng. Fangs còn thiếu danh mục, chưa thể dùng
                  để bắt đầu ván.
                </Hint>
              </Card>
            </>
          ) : null}
          <Card>
            <Heading>{session ? 'Cấu hình đã khóa' : 'Kiểm tra bộ đang chọn'}</Heading>
            <View style={styles.wrap}>
              {Object.entries(totals).map(([kind, qty]) => (
                <Text key={kind} style={styles.pill}>
                  {deckLabel[kind] ?? kind}: {qty}
                </Text>
              ))}
            </View>
            <Hint>
              Cộng theo số bản vật lý của các bộ đã chọn; chưa loại trùng công dụng và không khẳng
              định bộ trộn đã cân bằng.
            </Hint>
            {session ? (
              <Hint>Ván lưu trên thiết bị này. Muốn đổi luật hoặc bộ bài, tạo ván mới.</Hint>
            ) : null}
          </Card>
          <Card>
            <Heading>Luật áp dụng</Heading>
            {current.presetId !== 'fangs-native' ? (
              rules.map((r) => (
                <Collapsible key={r.title} title={r.title}>
                  <Text style={styles.body}>{r.text}</Text>
                </Collapsible>
              ))
            ) : (
              <Hint>Chưa có cấu hình Fangs hoàn chỉnh; không hiển thị luật Hunters thay thế.</Hint>
            )}
            {session
              ? session.decisions.map((r) => (
                  <View key={r.id} style={styles.decision}>
                    <Text style={styles.label}>Nhóm tự chốt</Text>
                    {r.title ? <Hint>{r.title}</Hint> : null}
                    <Text style={styles.body}>{r.text}</Text>
                  </View>
                ))
              : decisions.map((r) => (
                  <View key={r.id} style={styles.decision}>
                    <Text style={styles.body}>{r.text}</Text>
                    <TextInput
                      accessibilityLabel={`Quyết định ${r.id}`}
                      multiline
                      placeholder="Ghi quyết định cụ thể hoặc xác nhận vật dụng đã chuẩn bị…"
                      style={styles.input}
                      value={setup.decisions[r.id] ?? ''}
                      onChangeText={(text) =>
                        setSetup((s) => ({ ...s, decisions: { ...s.decisions, [r.id]: text } }))
                      }
                    />
                  </View>
                ))}
            {!session ? (
              <>
                {errors.length ? (
                  <Hint>Còn {errors.length} mục trước khi bắt đầu:</Hint>
                ) : (
                  <Hint>Đã đủ cấu hình và quyết định nhóm.</Hint>
                )}
                {errors.map((e, i) => (
                  <Text key={`${i}:${e}`} style={styles.error}>
                    • {e}
                  </Text>
                ))}
                <Button
                  label="Bắt đầu ván với cấu hình này"
                  disabled={busy || !!error || errors.length > 0}
                  onPress={() => void begin()}
                />
              </>
            ) : (
              <Button
                label="Tạo ván mới"
                tone="ghost"
                disabled={busy}
                onPress={() => setResetRequested(true)}
              />
            )}
            {resetRequested ? (
              <View style={styles.decision}>
                <Text>Thay bản lưu trên thiết bị và quay về chọn mode?</Text>
                <Button label="Xác nhận tạo ván mới" disabled={busy} onPress={() => void reset()} />
                <Button
                  label="Giữ nguyên"
                  tone="ghost"
                  disabled={busy}
                  onPress={() => setResetRequested(false)}
                />
              </View>
            ) : null}
          </Card>
          <Card>
            <Heading>Tra cứu thẻ & dấu bộ</Heading>
            <TextInput
              accessibilityLabel="Tìm thẻ"
              placeholder="Tên thẻ, mã bộ hoặc mã thẻ…"
              value={query}
              onChangeText={setQuery}
              style={styles.input}
            />
            <View style={styles.wrap}>
              {['all', 'character', 'white', 'black', 'green', 'location'].map((k) => (
                <Chip
                  key={k}
                  label={k === 'all' ? 'Tất cả' : deckLabel[k]!}
                  selected={deck === k}
                  onPress={() => setDeck(k)}
                />
              ))}
            </View>
            <Hint>
              {visibleCards.length} mẫu/phiên bản trong cấu hình. Dấu mặt sau cho biết bộ; sleeve
              lưng đục có thể che dấu khi trộn kín. Đây là mẫu bố trí chữ, chưa phải file in.
            </Hint>
            {visibleCards.length === 0 ? <Text>Không có thẻ khớp trong cấu hình này.</Text> : null}
            {visibleCards.map((c) => (
              <Collapsible key={c.key} title={`${c.mark} · ${c.name} · ×${c.quantity}`}>
                <Text style={styles.body}>{c.effect}</Text>
                {c.notes.map((n, i) => (
                  <Hint key={i}>{n}</Hint>
                ))}
                <Hint>Nguồn của phiên bản này:</Hint>
                {c.sources.map((source) => (
                  <Text
                    key={source.id}
                    style={styles.body}
                    accessibilityRole={source.url ? 'link' : undefined}
                    onPress={source.url ? () => void Linking.openURL(source.url!) : undefined}
                  >
                    {source.title}
                  </Text>
                ))}
                <MarkPreview card={c} />
                {!session && c.deck === 'character' ? (
                  <Button
                    label={`Bỏ ${c.name} khỏi kho chia`}
                    tone="ghost"
                    onPress={() =>
                      change({
                        excludedCharacterIds: [...(setup.excludedCharacterIds ?? []), c.id],
                      })
                    }
                  />
                ) : null}
              </Collapsible>
            ))}
          </Card>
          <Collapsible title="Nguồn luật và thẻ">
            <Hint>
              Các bản dịch và bộ cộng đồng còn chờ duyệt. Quyết định của nhóm được hiển thị riêng
              trong luật ván.
            </Hint>
            {Object.entries(catalog.sources)
              .filter(([, source]) => 'url' in source)
              .map(([id, source]) => (
                <Button
                  key={id}
                  label={'title' in source ? source.title : id}
                  tone="ghost"
                  onPress={() => {
                    if ('url' in source) void Linking.openURL(source.url);
                  }}
                />
              ))}
          </Collapsible>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 800, gap: 14 },
  banner: { padding: 16, gap: 5, backgroundColor: colors.primary },
  bannerTitle: { fontWeight: '700', fontSize: 18, color: '#fff' },
  bannerText: { color: '#fff', fontSize: 13 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  face: {
    flex: 1,
    minWidth: 170,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    backgroundColor: colors.card,
  },
  label: { color: colors.text, fontWeight: '600' },
  body: { color: colors.text, lineHeight: 22 },
  error: { color: colors.danger, lineHeight: 20 },
  decision: { padding: 12, backgroundColor: colors.warnSoft, borderRadius: 8, gap: 8 },
  pill: { color: colors.primary, backgroundColor: colors.primarySoft, padding: 8, borderRadius: 8 },
});
