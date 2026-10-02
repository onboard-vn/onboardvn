import type { CafeMemberDto } from '@onboard/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import { ErrorText, Section, SmallButton } from './ui';

const ROLE_LABEL: Record<string, string> = { owner: 'Chủ quán', staff: 'Nhân viên' };

export function MembersSection({
  cafeId,
  initialMembers,
}: {
  cafeId: string;
  initialMembers: CafeMemberDto[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRemove(userId: string) {
    setPending(true);
    setError(null);
    try {
      await api(`/cafes/${cafeId}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      setMembers((await api<{ items: CafeMemberDto[] }>(`/cafes/${cafeId}/members`)).items);
    } catch (e) {
      setError(errorMessage(e, 'Không gỡ được thành viên'));
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Thành viên quán">
      {members.map((m) => (
        <View key={m.userId} style={styles.row}>
          <Text style={styles.text}>
            {m.name} (@{m.username ?? m.userId}) · {ROLE_LABEL[m.role] ?? m.role}
          </Text>
          <SmallButton label="Gỡ" disabled={pending} onPress={() => void onRemove(m.userId)} />
        </View>
      ))}
      {members.length === 0 ? <Text style={styles.muted}>Chưa có thành viên.</Text> : null}
      <ErrorText message={error} />
    </Section>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  text: { fontSize: 13, color: colors.text, flex: 1 },
  muted: { fontSize: 13, color: colors.muted },
});
