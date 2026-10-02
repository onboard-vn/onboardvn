import type { CafeOwnerInviteDto, CafeOwnerInviteListResponse } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { copyText } from './clipboard';
import { formatLocalDate } from './format';
import { ErrorText, Section, SmallButton } from './ui';

function inviteStatus(invite: CafeOwnerInviteDto): string {
  if (invite.usedAt) return 'Đã dùng';
  if (invite.revokedAt) return 'Đã thu hồi';
  if (new Date(invite.expiresAt) < new Date()) return 'Hết hạn';
  return 'Còn hiệu lực';
}

export function OwnerInviteSection({
  cafeId,
  initialInvites,
}: {
  cafeId: string;
  initialInvites: CafeOwnerInviteDto[];
}) {
  const [invites, setInvites] = useState(initialInvites);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/cafes/${cafeId}/owner-invites`;

  async function refresh() {
    try {
      setInvites((await api<CafeOwnerInviteListResponse>(base)).items);
    } catch {
      /* keep the current list */
    }
  }

  async function onCreate() {
    setPending(true);
    setError(null);
    setNewUrl(null);
    try {
      const { url } = await api<{ url: string }>(base, { method: 'POST' });
      setNewUrl(url);
      await refresh();
    } catch {
      setError('Không tạo được link mời, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  async function onRevoke(inviteId: string) {
    setPending(true);
    setError(null);
    try {
      await api(`${base}/${inviteId}`, { method: 'DELETE' });
      await refresh();
    } catch (e) {
      setError(errorMessage(e, 'Không thu hồi được link mời'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Link mời chủ quán">
      <Button label="Tạo link mời mới" disabled={pending} onPress={() => void onCreate()} />

      {newUrl ? (
        <View style={styles.created}>
          <Text style={styles.strong}>Copy link này ngay — chỉ hiện 1 lần:</Text>
          <Text selectable style={styles.code}>
            {newUrl}
          </Text>
          <View style={{ alignSelf: 'flex-start' }}>
            <SmallButton label="Copy" onPress={() => void copyText(newUrl)} />
          </View>
        </View>
      ) : null}

      <ErrorText message={error} />

      {invites.map((invite) => (
        <View key={invite.id} style={styles.row}>
          <Text style={styles.text}>
            Tạo {formatLocalDate(invite.createdAt)} · {inviteStatus(invite)}
          </Text>
          {!invite.usedAt && !invite.revokedAt ? (
            <SmallButton
              label="Thu hồi"
              disabled={pending}
              onPress={() => void onRevoke(invite.id)}
            />
          ) : null}
        </View>
      ))}
      {invites.length === 0 ? <Text style={styles.muted}>Chưa có link mời nào.</Text> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  created: { gap: 4, backgroundColor: colors.bg, borderRadius: 8, padding: space.sm },
  strong: { fontSize: 12, fontWeight: '600', color: colors.text },
  code: { fontSize: 12, color: colors.text, fontFamily: 'monospace' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  text: { fontSize: 13, color: colors.text, flex: 1 },
  muted: { fontSize: 13, color: colors.muted },
});
