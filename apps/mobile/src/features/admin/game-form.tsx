import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
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
  useAppPreferences();
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
      setError(errorMessage(e, t('Có lỗi xảy ra, thử lại sau')));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <Field
        label={t('Tên tiếng Anh *')}
        value={v.nameEn}
        onChangeText={(nameEn) => patch({ nameEn })}
      />
      <Field
        label={t('Tên tiếng Việt')}
        value={v.nameVi}
        onChangeText={(nameVi) => patch({ nameVi })}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <Field
          label={t('Số người (min)')}
          keyboardType="number-pad"
          value={v.minPlayers}
          onChangeText={(minPlayers) => patch({ minPlayers })}
        />
        <Field
          label={t('Số người (max)')}
          keyboardType="number-pad"
          value={v.maxPlayers}
          onChangeText={(maxPlayers) => patch({ maxPlayers })}
        />
        <Field
          label={t('Thời gian (phút)')}
          keyboardType="number-pad"
          value={v.playMinutes}
          onChangeText={(playMinutes) => patch({ playMinutes })}
        />
        <Field
          label={t('Tuổi tối thiểu')}
          keyboardType="number-pad"
          value={v.minAge}
          onChangeText={(minAge) => patch({ minAge })}
        />
        <Field
          label={t('Độ khó (1-5)')}
          keyboardType="decimal-pad"
          value={v.weight}
          onChangeText={(weight) => patch({ weight })}
        />
        <Field
          label={t('BGG ID')}
          keyboardType="number-pad"
          value={v.bggId}
          onChangeText={(bggId) => patch({ bggId })}
        />
      </View>

      <CheckRow
        label={t('Thuần Việt / Việt hóa')}
        checked={v.isVietnamese}
        onChange={(isVietnamese) => patch({ isVietnamese })}
      />

      {GROUPS.map(({ label, kind }) => {
        const group = categories.filter((c) => c.kind === kind);
        if (group.length === 0) return null;
        return (
          <View key={kind} style={{ gap: space.sm }}>
            <Heading>{t(label)}</Heading>
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
        label={t('Mô tả (tiếng Việt)')}
        multiline
        value={v.descriptionVi}
        onChangeText={(descriptionVi) => patch({ descriptionVi })}
      />

      <Section title={t('Nguồn mô tả')}>
        <PickerField
          value={v.source}
          options={SOURCE_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
          onChange={(source) => patch({ source })}
        />
        {v.source === 'translated_with_permission' ? (
          <>
            <Field
              label={t('Đơn vị cấp phép *')}
              value={v.rightsHolder}
              onChangeText={(rightsHolder) => patch({ rightsHolder })}
            />
            <Field
              label={t('Tham chiếu giấy phép *')}
              value={v.permissionRef}
              onChangeText={(permissionRef) => patch({ permissionRef })}
            />
            <PickerField
              label={t('Giấy phép')}
              value={v.license}
              options={LICENSE_OPTIONS.map((option) => ({ ...option, label: t(option.label) }))}
              onChange={(license) => patch({ license })}
            />
          </>
        ) : (
          <>
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {t('Giấy phép: CC BY-SA 4.0 (khoá vì nguồn là cộng đồng tự viết)')}
            </Text>
            <CheckRow
              label={t(
                'Tôi tự viết nội dung này (không dịch/chép từ BGG, hộp game, sách luật) và đồng ý cấp phép CC BY-SA 4.0',
              )}
              checked={v.acceptLicense}
              onChange={(acceptLicense) => patch({ acceptLicense })}
            />
          </>
        )}
      </Section>

      <Field
        label={t('Video (mỗi link một dòng, YouTube/Facebook)')}
        multiline
        value={v.videoUrls}
        placeholder={'https://www.youtube.com/watch?v=...\nhttps://www.facebook.com/...'}
        onChangeText={(videoUrls) => patch({ videoUrls })}
      />
      <Field
        label={t('Nguồn ảnh bìa')}
        value={v.imageCredit}
        onChangeText={(imageCredit) => patch({ imageCredit })}
      />

      <ErrorText message={error} />
      <Button
        label={initial ? t('Lưu thay đổi') : t('Tạo game')}
        disabled={pending}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}
