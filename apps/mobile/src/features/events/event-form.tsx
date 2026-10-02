import type {
  MeetupCreateResponseDto,
  MeetupDetailDto,
  MeetupVisibility,
  ProvinceDto,
} from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { Segmented } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { CafePicker, type CafeOption } from './cafe-picker';
import { DateField } from './date-field';
import { buildCreatePayload, buildUpdatePayload } from './form-payload';
import { InviteShare } from './invite-share';
import { Select } from './select';
import { ShelfGamePicker } from './shelf-game-picker';
import { isoToLocalDateTimeInputValue, normalizeLocalDateTime } from './time';
import {
  Body,
  Box,
  Btn,
  Field,
  FormError,
  LinkBtn,
  Muted,
  Row,
  SectionTitle,
  TextField,
  href,
  useAction,
} from './ui';

const VISIBILITY_OPTIONS: { value: MeetupVisibility; label: string; hint: string }[] = [
  {
    value: 'public',
    label: 'Công khai',
    hint: 'Hiện trong danh sách và bản đồ Kèo cho mọi người.',
  },
  { value: 'friends', label: 'Chỉ bạn bè', hint: 'Chỉ bạn bè của bạn thấy Kèo này.' },
  { value: 'private', label: 'Riêng tư', hint: 'Chỉ ai có link mời mới xem được.' },
  { value: 'club', label: 'Chỉ club', hint: 'Chỉ thành viên của club được chọn thấy Kèo này.' },
];

export interface ClubOption {
  id: string;
  name: string;
}

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

function Check({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onPress}
      style={styles.check}
    >
      <Text style={styles.checkBox}>{checked ? '☑' : '☐'}</Text>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

export function EventForm({
  provinces,
  mode,
  initial,
  prefillCafe,
  clubs = [],
  initialClubId,
  prefillGame,
}: {
  provinces: ProvinceDto[];
  mode: 'create' | 'edit';
  initial?: EventFormInitial;
  prefillCafe?: CafeOption;
  clubs?: ClubOption[];
  initialClubId?: string;
  prefillGame?: { id: string; name: string };
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
  const [visibility, setVisibility] = useState<MeetupVisibility>(
    initial?.visibility ?? (initialClubId ? 'club' : 'public'),
  );
  const visibilityOptions = VISIBILITY_OPTIONS.filter((opt) =>
    opt.value !== 'club'
      ? true
      : mode === 'create'
        ? clubs.length > 0
        : initial?.visibility === 'club',
  );
  const [clubId, setClubId] = useState(initialClubId ?? clubs[0]?.id ?? '');
  const [wantsTable, setWantsTable] = useState(!!prefillGame);
  const [tableGameId, setTableGameId] = useState<string | null>(prefillGame?.id ?? null);
  const [tableGameLabel, setTableGameLabel] = useState<string | null>(prefillGame?.name ?? null);
  const [pickingGame, setPickingGame] = useState(false);
  const [tableSeats, setTableSeats] = useState('');
  const { pending, error, setError, run } = useAction();
  const [created, setCreated] = useState<MeetupCreateResponseDto | null>(null);

  async function onSubmit() {
    setError(null);
    if (!title.trim()) {
      setError('Hãy nhập tiêu đề');
      return;
    }
    const start = normalizeLocalDateTime(startsAt);
    if (!start) {
      setError('Hãy nhập giờ bắt đầu hợp lệ (YYYY-MM-DD HH:mm)');
      return;
    }
    const end = endsAt.trim() ? normalizeLocalDateTime(endsAt) : '';
    if (end === null) {
      setError('Giờ kết thúc không hợp lệ (YYYY-MM-DD HH:mm)');
      return;
    }
    if (placeMode === 'cafe' && !cafe) {
      setError('Hãy chọn một quán');
      return;
    }
    if (placeMode === 'address' && (!addressLine.trim() || !provinceCode)) {
      setError('Hãy nhập địa chỉ và chọn tỉnh/thành');
      return;
    }
    const fields = {
      placeMode,
      cafeId: cafe?.id ?? null,
      addressLine,
      provinceCode,
      wardCode,
      title,
      description,
      startsAt: start,
      endsAt: end,
      capacity,
      visibility,
      clubId,
    };

    await run(
      async () => {
        if (mode === 'create') {
          const res = await api<MeetupCreateResponseDto>('/events', {
            method: 'POST',
            body: buildCreatePayload(
              fields,
              wantsTable
                ? {
                    gameId: tableGameId ?? undefined,
                    seats: tableSeats ? Number(tableSeats) : undefined,
                  }
                : undefined,
            ),
          });
          setCreated(res);
        } else if (initial) {
          const updated = await api<MeetupDetailDto>(`/events/${initial.id}`, {
            method: 'PATCH',
            body: buildUpdatePayload(fields),
          });
          router.replace(href(`/events/${updated.slug}`));
        }
      },
      mode === 'create'
        ? 'Tạo Kèo thất bại, kiểm tra lại thông tin'
        : 'Cập nhật thất bại, kiểm tra lại thông tin',
    );
  }

  if (created) {
    return (
      <View style={{ gap: space.lg }}>
        <Body bold>Đã tạo Kèo &quot;{created.title}&quot;.</Body>
        <InviteShare inviteUrl={created.inviteUrl} title={created.title} />
        <LinkBtn label="Xem Kèo" to={`/events/${created.slug}`} />
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <TextField label="Tiêu đề" maxLength={140} value={title} onChangeText={setTitle} />
      <TextField
        label="Mô tả (tùy chọn)"
        multiline
        maxLength={2000}
        value={description}
        onChangeText={setDescription}
      />

      <DateField label="Bắt đầu" kind="datetime-local" value={startsAt} onChange={setStartsAt} />
      <DateField
        label="Kết thúc (tùy chọn)"
        kind="datetime-local"
        value={endsAt}
        onChange={setEndsAt}
      />

      <Box>
        <SectionTitle>Địa điểm</SectionTitle>
        <Segmented
          value={placeMode}
          onChange={setPlaceMode}
          options={[
            { value: 'cafe', label: 'Chọn quán' },
            { value: 'address', label: 'Địa chỉ tự do' },
          ]}
        />
        {placeMode === 'cafe' ? (
          cafe ? (
            <Row style={{ justifyContent: 'space-between' }}>
              <Body>{cafe.name}</Body>
              <Btn small variant="outline" label="Đổi quán" onPress={() => setCafe(null)} />
            </Row>
          ) : (
            <CafePicker provinces={provinces} onPick={setCafe} />
          )
        ) : (
          <View style={{ gap: space.sm }}>
            <TextField
              label="Địa chỉ"
              placeholder="Địa chỉ"
              maxLength={300}
              value={addressLine}
              onChangeText={setAddressLine}
            />
            <Select
              label="Tỉnh/thành"
              placeholder="Chọn tỉnh/thành"
              value={provinceCode}
              options={provinces.map((p) => ({ value: p.code, label: p.name }))}
              onChange={setProvinceCode}
            />
            <TextField
              label="Mã phường/xã (tùy chọn)"
              value={wardCode}
              onChangeText={setWardCode}
              autoCapitalize="none"
            />
          </View>
        )}
      </Box>

      <TextField
        label="Sức chứa (tùy chọn, tổng người đi)"
        keyboardType="number-pad"
        value={capacity}
        onChangeText={setCapacity}
      />

      <Field label="Chế độ hiển thị">
        <View style={{ gap: space.sm }}>
          {visibilityOptions.map((opt) => (
            <Pressable
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: visibility === opt.value }}
              onPress={() => setVisibility(opt.value)}
              style={styles.radio}
            >
              <Text style={styles.checkBox}>{visibility === opt.value ? '◉' : '○'}</Text>
              <View style={{ flex: 1 }}>
                <Body bold>{opt.label}</Body>
                <Muted small>{opt.hint}</Muted>
              </View>
            </Pressable>
          ))}
          {mode === 'create' && visibility === 'club' ? (
            <Select
              label="Club"
              placeholder="Chọn club"
              value={clubId}
              options={clubs.map((c) => ({ value: c.id, label: c.name }))}
              onChange={setClubId}
            />
          ) : null}
        </View>
      </Field>

      {mode === 'create' ? (
        <Box>
          <Check
            checked={wantsTable}
            label="Tạo bàn đầu tiên (bạn sẽ là host)"
            onPress={() => setWantsTable((v) => !v)}
          />
          {wantsTable ? (
            <View style={{ gap: space.sm }}>
              <Row>
                <Body>Game: {tableGameLabel ?? 'chưa chọn'}</Body>
                <Btn
                  small
                  variant="outline"
                  label="Chọn từ tủ game"
                  onPress={() => setPickingGame((v) => !v)}
                />
              </Row>
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
              <TextField
                keyboardType="number-pad"
                placeholder="Số ghế (tính cả host, tùy chọn)"
                value={tableSeats}
                onChangeText={setTableSeats}
              />
            </View>
          ) : null}
        </Box>
      ) : null}

      <FormError message={error} />
      <Btn
        disabled={pending}
        label={mode === 'create' ? 'Tạo kèo' : 'Lưu thay đổi'}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  check: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  checkBox: { fontSize: 18, color: colors.primary },
  checkLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  radio: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
