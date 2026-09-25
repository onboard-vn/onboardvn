'use client';

import type { ParticipantStatus, RsvpStatus } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';

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
}: {
  meetupId: string;
  code?: string;
  viewerStatus: ParticipantStatus | null;
  waitlistPosition?: number | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rsvp(status: RsvpStatus) {
    setPending(true);
    setError(null);
    try {
      const res = await api.api.events[':id'].rsvp.$post({
        param: { id: meetupId },
        json: { status, ...(code && { code }) },
      });
      if (!res.ok) {
        setError(await apiErrorMessage(res, 'Không thực hiện được, thử lại sau'));
        return;
      }
      router.refresh();
    } catch {
      setError('Không thực hiện được, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {viewerStatus ? (
        <p className="text-sm text-muted-foreground">
          {STATUS_LABEL[viewerStatus]}
          {viewerStatus === 'waitlist' && waitlistPosition ? ` (vị trí ${waitlistPosition})` : ''}
        </p>
      ) : null}
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            disabled={pending}
            variant={viewerStatus === opt.value ? 'default' : 'outline'}
            onClick={() => void rsvp(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      <FormError message={error} />
    </div>
  );
}
