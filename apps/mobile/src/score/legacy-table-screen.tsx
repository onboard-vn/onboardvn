import type { IdentityDto, PlayDto, ScoreTemplate } from '@onboard/shared';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clubsApi } from '../api/clubs';
import { playersOf, sheetFromPlay } from '../api/play-mapping';
import { createHttpPlaysApi } from '../api/plays-http';
import { loadTableBundle, startTablePlay, type TableBundle } from '../api/table-play';
import { RequireLogin } from '../auth/require-login';
import { useSession } from '../auth/session';
import { isCoop } from '../score/model';
import { ScoreSheet } from '../score/score-sheet';
import { Button, Card, Heading, Hint } from '../ui/primitives';
import { themeStyles, colors } from '../ui/theme';
import { useLoad } from '../ui/use-load';
import { useAppPreferences } from '../ui/preferences';
import { scoreFeedbackText, scoreLocale, scoreText, templateScoreText } from './localization';
function FinalResult({ play, template }: { play: PlayDto; template: ScoreTemplate | null }) {
  const { language } = useAppPreferences();
  const coop = template ? isCoop(template) : false;
  const rows = [...play.players].sort(
    (a, b) => (a.computed?.rank ?? 99) - (b.computed?.rank ?? 99),
  );
  const won = play.players.some((p) => p.computed?.isWinner);
  const teamStats = template?.categories.filter(
    (c) => c.scope !== 'player' && c.input !== 'perRound',
  );
  const first = play.players[0]?.computed?.categories ?? {};
  return (
    <Card>
      <Heading>{scoreText("Kết quả đã chốt")}</Heading>
      {coop ? (
        <>
          <View
            style={[
              styles.banner,
              { backgroundColor: won ? colors.successSoft : colors.dangerSoft },
            ]}
          >
            <Text style={styles.bannerText}>{won ? scoreText("Cả đội thắng") : scoreText("Cả đội thua")}</Text>
          </View>
          {teamStats?.map((c) => (
            <View key={c.key} style={styles.row}>
              <Text style={styles.name}>{templateScoreText(c.labelVi ?? c.label, c.label, language)}</Text>
              <Text style={styles.total}>{first[c.key] ?? 0}</Text>
            </View>
          ))}
          <Text style={styles.meta}>{rows.map((p) => p.identity.displayName).join(', ')}</Text>
        </>
      ) : (
        rows.map((p) => (
          <View key={p.identity.id} style={styles.row}>
            <Text style={styles.name}>
              {p.computed?.rank ? `#${p.computed.rank} ` : ''}
              {p.identity.displayName}
              {p.computed?.isWinner ? '  🏆' : ''}
            </Text>
            <Text style={styles.total}>{(p.computed?.total ?? 0).toLocaleString(scoreLocale(language))}</Text>
          </View>
        ))
      )}
      {play.warnings.map((w) => (
        <Text key={w} style={styles.meta}>
          {scoreFeedbackText(w)}
        </Text>
      ))}
    </Card>
  );
}

function GuestActions({ guest, tableId }: { guest: IdentityDto; tableId: string }) {
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<string>) =>
    fn().then(setNote, (e: unknown) =>
      setNote(e instanceof Error ? e.message : 'Không thực hiện được'),
    );
  return (
    <View style={styles.guest}>
      <Text style={styles.name}>{guest.displayName} {scoreText("(khách)")}</Text>
      <View style={styles.actions}>
        <Button
          tone="ghost"
          label={scoreText("Đây là tôi")}
          onPress={() =>
            run(async () => {
              await clubsApi.requestClaim(guest.id, tableId);
              return 'Đã gửi yêu cầu, chờ người mời hoặc admin CLB duyệt.';
            })
          }
        />
        <Button
          tone="ghost"
          label={scoreText("Tạo link nhận")}
          onPress={() =>
            run(async () => `Gửi link này cho khách: ${(await clubsApi.claimLink(guest.id)).url}`)
          }
        />
      </View>
      {note ? (
        <Text selectable style={styles.meta}>
          {scoreFeedbackText(note)}
        </Text>
      ) : null}
    </View>
  );
}

function TablePlay({ bundle, reload }: { bundle: TableBundle; reload: () => void }) {
  const router = useRouter();
  const { user } = useSession();
  const { table, play, template, templateId } = bundle;
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playsApi = useMemo(
    () =>
      play && user
        ? createHttpPlaysApi({
            play,
            template,
            templateId,
            myUserId: user.id,
            clubId: table.clubId,
            tableId: table.id,
          })
        : null,
    [play, template, templateId, user, table.clubId, table.id],
  );
  const saved = useMemo(() => (play ? sheetFromPlay(play, template) : null), [play, template]);
  const myIdentity =
    play?.players.find((p) => p.identity.userId === user?.id)?.identity.id ??
    table.seated.find((s) => s.userId === user?.id)?.id ??
    user?.id ??
    'me';
  const guests = table.seated.filter((s) => s.kind === 'guest');

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await startTablePlay(table.id, templateId);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được ván');
    } finally {
      setStarting(false);
    }
  };

  const title = <Stack.Screen options={{ title: table.game?.name ?? scoreText('Bảng điểm') }} />;

  if (play?.status === 'final') {
    return (
      <>
        {title}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            <FinalResult play={play} template={template} />
            {guests.length ? (
              <Card>
                <Heading>{scoreText("Khách ở bàn")}</Heading>
                {guests.map((g) => (
                  <GuestActions key={g.id} guest={g} tableId={table.id} />
                ))}
              </Card>
            ) : null}
          </View>
        </ScrollView>
      </>
    );
  }

  if (!play || !playsApi || !template) {
    return (
      <>
        {title}
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            <Card>
              <Heading>{table.game?.name ?? scoreText("Bàn chơi")}</Heading>
              <Hint>
                {table.meetupTitle} ·{' '}
                {table.seated.map((s) => s.displayName).join(', ') || scoreText("chưa có ai")}
              </Hint>
              {!template ? <Hint>{scoreText("Game này chưa có mẫu tính điểm.")}</Hint> : null}
              {template && !play ? (
                <Button
                  label={starting ? scoreText("Đang tạo…") : scoreText("Bắt đầu tính điểm")}
                  disabled={starting}
                  onPress={() => void start()}
                />
              ) : null}
              {error ? <Text style={styles.error}>{scoreFeedbackText(error)}</Text> : null}
            </Card>
          </View>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      {title}
      <ScoreSheet
        key={play.id}
        template={template}
        players={playersOf(play)}
        playId={play.id}
        saved={saved}
        api={playsApi}
        actorId={myIdentity}
        restoredFromDraft={false}
        onExit={() => router.back()}
      />
    </>
  );
}

function TableScreenBody({ tableId }: { tableId: string }) {
  const bundle = useLoad(() => loadTableBundle(tableId), [tableId]);
  if (bundle.loading && !bundle.data) return <ActivityIndicator style={{ marginTop: 48 }} />;
  if (bundle.error) return <Hint>{bundle.error}</Hint>;
  if (!bundle.data) return null;
  return <TablePlay bundle={bundle.data} reload={bundle.reload} />;
}

export function LegacyTableScoreScreen() {
  useAppPreferences();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  return (
    <RequireLogin reason={scoreText('Đăng nhập để tính điểm cho bàn này.')}>
      {tableId ? <TableScreenBody tableId={tableId} /> : <Hint>{scoreText("Thiếu mã bàn.")}</Hint>}
    </RequireLogin>
  );
}

const styles = themeStyles(() => StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 16, color: colors.text },
  total: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.muted },
  error: { color: colors.danger },
  banner: { borderRadius: 10, padding: 12, alignItems: 'center' },
  bannerText: { fontSize: 18, fontWeight: '800', color: colors.text },
  guest: { gap: 4, paddingVertical: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
