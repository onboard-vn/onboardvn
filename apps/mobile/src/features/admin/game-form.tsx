import type { CategoryDto, CategoryKind } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../api/client';
import { Button, Chip, Heading } from '../../ui/primitives';
import { colors, space } from '../../ui/theme';
import { errorMessage } from '../errors';
import {
  asCreateInput,
  buildGameBody,
  gameValuesFrom,
  validateGame,
  type DescriptionLicense,
  type DescriptionSource,
  type GameFormInitial,
  type GameFormValues,
} from './game-body';
import { CheckRow, ErrorText, Field, PickerField, Section, type Option } from './ui';

const SOURCE_OPTIONS: Option<DescriptionSource>[] = [
  { value: 'original', label: 'Cộng đồng tự viết' },
  { value: 'translated_with_permission', label: 'Bản dịch được NPH cho phép' },
  { value: 'translated_from_bgg', label: 'Dịch từ BGG (không thuộc CC BY-SA)' },
];

const LICENSE_OPTIONS: Option<DescriptionLicense>[] = [
  { value: 'permission-only', label: 'Chỉ theo phép của NPH' },
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
];

const GROUPS: { label: string; kind: CategoryKind }[] = [
  { label: 'Thể loại', kind: 'category' },
  { label: 'Cơ chế', kind: 'mechanic' },
];

export function GameForm({
  categories,
  initial,
  presetNameEn,
}: {
  categories: CategoryDto[];
  initial?: GameFormInitial;
  presetNameEn?: string;
}) {
  const router = useRouter();
  const [v, setV] = useState<GameFormValues>(() => gameValuesFrom(initial, presetNameEn));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const patch = (next: Partial<GameFormValues>) => setV((cur) => ({ ...cur, ...next }));

  const toggleCategory = (id: string) =>
    patch({
      categoryIds: v.categoryIds.includes(id)
        ? v.categoryIds.filter((c) => c !== id)
        : [...v.categoryIds, id],
    });

  async function onSubmit() {
    const invalid = validateGame(v);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const body = buildGameBody(v, !!initial);
      const game = initial
        ? await api<{ slug: string }>(`/games/${initial.id}`, { method: 'PATCH', body })
        : await api<{ slug: string }>('/games', { method: 'POST', body: asCreateInput(body) });
      router.push({ pathname: '/games/[slug]', params: { slug: game.slug } });
    } catch (e) {
      setError(errorMessage(e, 'Có lỗi xảy ra, thử lại sau'));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Field
        label="Tên tiếng Anh *"
        value={v.nameEn}
        onChangeText={(nameEn) => patch({ nameEn })}
      />
      <Field label="Tên tiếng Việt" value={v.nameVi} onChangeText={(nameVi) => patch({ nameVi })} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <Field
          label="Số người (min)"
          keyboardType="number-pad"
          value={v.minPlayers}
          onChangeText={(minPlayers) => patch({ minPlayers })}
        />
        <Field
          label="Số người (max)"
          keyboardType="number-pad"
          value={v.maxPlayers}
          onChangeText={(maxPlayers) => patch({ maxPlayers })}
        />
        <Field
          label="Thời gian (phút)"
          keyboardType="number-pad"
          value={v.playMinutes}
          onChangeText={(playMinutes) => patch({ playMinutes })}
        />
        <Field
          label="Tuổi tối thiểu"
          keyboardType="number-pad"
          value={v.minAge}
          onChangeText={(minAge) => patch({ minAge })}
        />
        <Field
          label="Độ khó (1-5)"
          keyboardType="decimal-pad"
          value={v.weight}
          onChangeText={(weight) => patch({ weight })}
        />
        <Field
          label="BGG ID"
          keyboardType="number-pad"
          value={v.bggId}
          onChangeText={(bggId) => patch({ bggId })}
        />
      </View>

      <CheckRow
        label="Thuần Việt / Việt hóa"
        checked={v.isVietnamese}
        onChange={(isVietnamese) => patch({ isVietnamese })}
      />

      {GROUPS.map(({ label, kind }) => {
        const group = categories.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <View key={kind} style={{ gap: space.sm }}>
            <Heading>{label}</Heading>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {group.map((c) => (
                <Chip
                  key={c.id}
                  label={c.nameVi ?? c.name}
                  selected={v.categoryIds.includes(c.id)}
                  onPress={() => toggleCategory(c.id)}
                />
              ))}
            </View>
          </View>
        );
      })}

      <Field
        label="Mô tả (tiếng Việt)"
        multiline
        value={v.descriptionVi}
        onChangeText={(descriptionVi) => patch({ descriptionVi })}
      />

      <Section title="Nguồn mô tả">
        <PickerField
          value={v.source}
          options={SOURCE_OPTIONS}
          onChange={(source) => patch({ source })}
        />
        {v.source === 'translated_with_permission' ? (
          <>
            <Field
              label="Đơn vị cấp phép *"
              value={v.rightsHolder}
              onChangeText={(rightsHolder) => patch({ rightsHolder })}
            />
            <Field
              label="Tham chiếu giấy phép *"
              value={v.permissionRef}
              onChangeText={(permissionRef) => patch({ permissionRef })}
            />
            <PickerField
              label="Giấy phép"
              value={v.license}
              options={LICENSE_OPTIONS}
              onChange={(license) => patch({ license })}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              Giấy phép: CC BY-SA 4.0 (khoá vì nguồn là cộng đồng tự viết)
            </Text>
            <CheckRow
              label="Tôi tự viết nội dung này (không dịch/chép từ BGG, hộp game, sách luật) và đồng ý cấp phép CC BY-SA 4.0"
              checked={v.acceptLicense}
              onChange={(acceptLicense) => patch({ acceptLicense })}
            />
          </>
        )}
      </Section>

      <Field
        label="Video (mỗi link một dòng, YouTube/Facebook)"
        multiline
        value={v.videoUrls}
        placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.facebook.com/...'}
        onChangeText={(videoUrls) => patch({ videoUrls })}
      />
      <Field
        label="Nguồn ảnh bìa"
        value={v.imageCredit}
        onChangeText={(imageCredit) => patch({ imageCredit })}
      />

      <ErrorText message={error} />
      <Button
        label={initial ? 'Lưu thay đổi' : 'Tạo game'}
        disabled={pending}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}
