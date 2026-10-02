import type { MeetupInviteCodeResponse } from '@onboard/shared';
import { useState } from 'react';
import { api } from '../../api/client';
import { InviteFriendsPicker } from './invite-friends-picker';
import { InviteShare } from './invite-share';
import { Box, Btn, FormError, LinkBtn, Row, SectionTitle, confirmAsync, useAction } from './ui';

export function CreatorActions({
  meetupId,
  slug,
  title,
  onChanged,
}: {
  meetupId: string;
  slug: string;
  title: string;
  onChanged: () => void;
}) {
  const [inviting, setInviting] = useState(false);
  const [rotated, setRotated] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  async function rotate() {
    await run(async () => {
      const res = await api<MeetupInviteCodeResponse>(`/events/${meetupId}/invite-code/rotate`, {
        method: 'POST',
        body: {},
      });
      setRotated(res.inviteUrl);
    }, 'Không tạo được link mời');
  }

  async function cancelMeetup() {
    if (!(await confirmAsync('Hủy Kèo này? Người tham gia sẽ thấy trạng thái đã hủy.'))) return;
    const ok = await run(
      () => api(`/events/${meetupId}`, { method: 'DELETE' }),
      'Không hủy được Kèo, thử lại sau',
    );
    if (ok) onChanged();
  }

  return (
    <Box>
      <SectionTitle>Quản lý Kèo</SectionTitle>
      <Row>
        <LinkBtn small variant="outline" label="Sửa Kèo" to={`/events/${slug}/edit`} />
        <Btn
          small
          variant="outline"
          disabled={pending}
          label="Mời bạn bè"
          onPress={() => setInviting((v) => !v)}
        />
        <Btn
          small
          variant="outline"
          disabled={pending}
          label="Tạo lại link mời"
          onPress={() => void rotate()}
        />
        <Btn
          small
          variant="danger"
          disabled={pending}
          label="Hủy Kèo"
          onPress={() => void cancelMeetup()}
        />
      </Row>
      {inviting ? (
        <InviteFriendsPicker meetupId={meetupId} onDone={() => setInviting(false)} />
      ) : null}
      {rotated ? <InviteShare inviteUrl={rotated} title={title} /> : null}
      <FormError message={error} />
    </Box>
  );
}
