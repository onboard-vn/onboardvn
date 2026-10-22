import type { FriendSummary } from '@onboard/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { Body, Btn, FormError, Muted, Row, useAction } from './ui';
import { useAppPreferences } from '../../ui/preferences';
import { t } from '../../ui/i18n';



const friendName = (u: Pick<FriendSummary, 'displayUsername' | 'username' | 'name'>) =>
  u.displayUsername ?? u.username ?? u.name;

export function InviteFriendsPicker({
  meetupId,
  onDone,
}: {
  meetupId: string;
  onDone: () => void;
}) {
  useAppPreferences();
  const [friends, setFriends] = useState<FriendSummary[] | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const { error, run } = useAction();

  useEffect(() => {
    let live = true;
    api<{ items: FriendSummary[] }>('/friends').then(
      (r) => live && setFriends(r.items),
      () => live && setFriends([]),
    );
    return () => {
      live = false;
    };
  }, []);

  async function invite(userId: string) {
    const ok = await run(
      () => api(`/events/${meetupId}/invite`, { method: 'POST', body: { userIds: [userId] } }),
      'Không mời được, thử lại sau',
    );
    if (ok) setInvited((prev) => new Set(prev).add(userId));
  }

  if (!friends) return <Muted>{t("Đang tải...")}</Muted>;
  if (friends.length === 0) return <Muted>{t("Bạn chưa có bạn bè nào.")}</Muted>;

  return (
    <View style={{ gap: space.sm }}>
      {friends.map((f) => (
        <Row key={f.id} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <View style={{ flex: 1 }}>
            <Body>{friendName(f)}</Body>
          </View>
          <Btn
            small
            disabled={invited.has(f.id)}
            label={invited.has(f.id) ? t("Đã mời") : t("Mời")}
            onPress={() => void invite(f.id)}
          />
        </Row>
      ))}
      <FormError message={error} />
      <Btn
        small
        variant="ghost"
        label="Xong"
        onPress={onDone}
        style={{ alignSelf: 'flex-start' }}
      />
    </View>
  );
}
