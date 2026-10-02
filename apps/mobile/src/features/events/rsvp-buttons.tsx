import type { ParticipantStatus, RsvpStatus } from '@onboard/shared';
import { api } from '../../api/client';
import { Btn, FormError, Muted, Row, useAction } from './ui';
import { View } from 'react-native';
import { space } from '../../ui/theme';

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: 'going', label: 'Đi' },
  { value: 'maybe', label: 'Có thể' },
  { value: 'declined', label: 'Không đi' },
];

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  going: 'Bạn đang tham gia',
  maybe: 'Bạn có thể tham gia',
  declined: 'Bạn đã từ chối',
  waitlist: 'Bạn đang trong danh sách chờ',
  invited: 'Bạn được mời',
};

export function RsvpButtons({
  meetupId,
  code,
  viewerStatus,
  waitlistPosition,
  onChanged,
}: {
  meetupId: string;
  code?: string;
  viewerStatus: ParticipantStatus | null;
  waitlistPosition?: number | null;
  onChanged: () => void;
}) {
  const { pending, error, run } = useAction();

  async function rsvp(status: RsvpStatus) {
    const ok = await run(
      () =>
        api(`/events/${meetupId}/rsvp`, {
          method: 'POST',
          body: { status, ...(code && { code }) },
        }),
      'Không thực hiện được, thử lại sau',
    );
    if (ok) onChanged();
  }

  return (
    <View style={{ gap: space.sm }}>
      {viewerStatus ? (
        <Muted>
          {STATUS_LABEL[viewerStatus]}
          {viewerStatus === 'waitlist' && waitlistPosition ? ` (vị trí ${waitlistPosition})` : ''}
        </Muted>
      ) : null}
      <Row>
        {OPTIONS.map((opt) => (
          <Btn
            key={opt.value}
            small
            disabled={pending}
            variant={viewerStatus === opt.value ? 'primary' : 'outline'}
            label={opt.label}
            onPress={() => void rsvp(opt.value)}
          />
        ))}
      </Row>
      <FormError message={error} />
    </View>
  );
}
