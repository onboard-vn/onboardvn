'use client';

import type { MeetupDetailDto, MeetupVisibility } from '@onboard/shared';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CafePicker, type CafeOption } from '@/components/events/cafe-picker';
import { InviteShare } from '@/components/events/invite-share';
import { ShelfGamePicker } from '@/components/shelf-game-picker';
import { FormError } from '@/components/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { buildCreatePayload, buildUpdatePayload } from '@/lib/events-form-payload';
import { isoToLocalDateTimeInputValue } from '@/lib/events-time';

interface Province {
  code: string;
  name: string;
  slug: string;
}

const VISIBILITY_OPTIONS: { value: MeetupVisibility; label: string; hint: string }[] = [
  {
    value: 'public',
    label: 'Công khai',
    hint: 'Hiện trong danh sách và bản đồ Kèo cho mọi người.',
  },
  { value: 'friends', label: 'Chỉ bạn bè', hint: 'Chỉ bạn bè của bạn thấy Kèo này.' },
  { value: 'private', label: 'Riêng tư', hint: 'Chỉ ai có link mời mới xem được.' },
];

export interface EventFormInitial {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  cafe: { id: string; slug: string; name: string; wardName?: string; provinceName?: string } | null;
  addressLine: string | null;
  provinceCode: string;
  wardCode: string | null;
  capacity: number | null;
  visibility: MeetupVisibility;
}

export function EventForm({
  provinces,
  mode,
  initial,
  prefillCafe,
}: {
  provinces: Province[];
  mode: 'create' | 'edit';
  initial?: EventFormInitial;
  prefillCafe?: CafeOption;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startsAt, setStartsAt] = useState(
    initial ? isoToLocalDateTimeInputValue(initial.startsAt) : '',
  );
  const [endsAt, setEndsAt] = useState(
    initial?.endsAt ? isoToLocalDateTimeInputValue(initial.endsAt) : '',
  );
  const [placeMode, setPlaceMode] = useState<'cafe' | 'address'>(
    initial?.cafe || prefillCafe ? 'cafe' : initial?.addressLine ? 'address' : 'cafe',
  );
  const [cafe, setCafe] = useState<CafeOption | null>(
    initial?.cafe
      ? {
          id: initial.cafe.id,
          slug: initial.cafe.slug,
          name: initial.cafe.name,
          wardName: initial.cafe.wardName ?? '',
          provinceName: initial.cafe.provinceName ?? '',
        }
      : (prefillCafe ?? null),
  );
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? '');
  const [provinceCode, setProvinceCode] = useState(initial?.provinceCode ?? '');
  const [wardCode, setWardCode] = useState(initial?.wardCode ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ? String(initial.capacity) : '');
  const [visibility, setVisibility] = useState<MeetupVisibility>(initial?.visibility ?? 'public');
  const [wantsTable, setWantsTable] = useState(false);
  const [tableGameId, setTableGameId] = useState<string | null>(null);
  const [tableGameLabel, setTableGameLabel] = useState<string | null>(null);
  const [pickingGame, setPickingGame] = useState(false);
  const [tableSeats, setTableSeats] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<(MeetupDetailDto & { inviteUrl: string }) | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (placeMode === 'cafe' && !cafe) {
      setError('Hãy chọn một quán');
      return;
    }
    if (placeMode === 'address' && (!addressLine.trim() || !provinceCode)) {
      setError('Hãy nhập địa chỉ và chọn tỉnh/thành');
      return;
    }
    setPending(true);
    try {
      const fields = {
        placeMode,
        cafeId: cafe?.id ?? null,
        addressLine,
        provinceCode,
        wardCode,
        title,
        description,
        startsAt,
        endsAt,
        capacity,
        visibility,
      };

      if (mode === 'create') {
        const res = await api.api.events.$post({
          json: buildCreatePayload(
            fields,
            wantsTable
              ? {
                  gameId: tableGameId ?? undefined,
                  seats: tableSeats ? Number(tableSeats) : undefined,
                }
              : undefined,
          ),
        });
        if (!res.ok) {
          setError(await apiErrorMessage(res, 'Tạo Kèo thất bại, kiểm tra lại thông tin'));
          return;
        }
        setCreated(await res.json());
      } else if (initial) {
        const res = await api.api.events[':id'].$patch({
          param: { id: initial.id },
          json: buildUpdatePayload(fields),
        });
        if (!res.ok) {
          setError(await apiErrorMessage(res, 'Cập nhật thất bại, kiểm tra lại thông tin'));
          return;
        }
        const updated = await res.json();
        router.push(`/events/${updated.slug}`);
        router.refresh();
      }
    } catch {
      setError('Có lỗi xảy ra, thử lại sau');
    } finally {
      setPending(false);
    }
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium">Đã tạo Kèo &quot;{created.title}&quot;.</p>
        <InviteShare inviteUrl={created.inviteUrl} title={created.title} />
        <Button render={<a href={`/events/${created.slug}`} />}>Xem Kèo</Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="event-title">Tiêu đề</Label>
        <Input
          id="event-title"
          required
          maxLength={140}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="event-description">Mô tả (tùy chọn)</Label>
        <Textarea
          id="event-description"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="event-starts">Bắt đầu</Label>
          <Input
            id="event-starts"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="event-ends">Kết thúc (tùy chọn)</Label>
          <Input
            id="event-ends"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Địa điểm</legend>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
          <button
            type="button"
            role="tab"
            aria-selected={placeMode === 'cafe'}
            onClick={() => setPlaceMode('cafe')}
            className={`rounded px-2 py-1 ${placeMode === 'cafe' ? 'bg-background font-medium shadow-sm' : ''}`}
          >
            Chọn quán
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={placeMode === 'address'}
            onClick={() => setPlaceMode('address')}
            className={`rounded px-2 py-1 ${placeMode === 'address' ? 'bg-background font-medium shadow-sm' : ''}`}
          >
            Địa chỉ tự do
          </button>
        </div>

        {placeMode === 'cafe' ? (
          cafe ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{cafe.name}</span>
              <Button type="button" variant="outline" size="xs" onClick={() => setCafe(null)}>
                Đổi quán
              </Button>
            </div>
          ) : (
            <CafePicker provinces={provinces} onPick={setCafe} />
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="event-address">Địa chỉ</Label>
            <Input
              id="event-address"
              placeholder="Địa chỉ"
              maxLength={300}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-address-province">Tỉnh/thành</Label>
                <select
                  id="event-address-province"
                  className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                  value={provinceCode}
                  onChange={(e) => setProvinceCode(e.target.value)}
                >
                  <option value="">Chọn tỉnh/thành</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="event-address-ward">Mã phường/xã (tùy chọn)</Label>
                <Input
                  id="event-address-ward"
                  value={wardCode}
                  onChange={(e) => setWardCode(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <Label htmlFor="event-capacity">Sức chứa (tùy chọn, tổng người đi)</Label>
        <Input
          id="event-capacity"
          type="number"
          min={1}
          max={500}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Chế độ hiển thị</legend>
        {VISIBILITY_OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="visibility"
              value={opt.value}
              checked={visibility === opt.value}
              onChange={() => setVisibility(opt.value)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{opt.label}</span>
              <span className="text-muted-foreground block text-xs">{opt.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {mode === 'create' ? (
        <fieldset className="flex flex-col gap-2 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={wantsTable}
              onChange={(e) => setWantsTable(e.target.checked)}
            />
            Tạo bàn đầu tiên (bạn sẽ là host)
          </label>
          {wantsTable ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span>Game: {tableGameLabel ?? 'chưa chọn'}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setPickingGame((v) => !v)}
                >
                  Chọn từ tủ game
                </Button>
              </div>
              {pickingGame ? (
                <ShelfGamePicker
                  onPick={(g) => {
                    setTableGameId(g.id);
                    setTableGameLabel(g.name);
                    setPickingGame(false);
                  }}
                  onCancel={() => setPickingGame(false)}
                />
              ) : null}
              <Input
                type="number"
                min={2}
                max={20}
                placeholder="Số ghế (tính cả host, tùy chọn)"
                value={tableSeats}
                onChange={(e) => setTableSeats(e.target.value)}
              />
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {mode === 'create' ? 'Tạo kèo' : 'Lưu thay đổi'}
      </Button>
    </form>
  );
}
