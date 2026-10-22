import type { ClubCreateResponse } from '@onboard/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { InviteShare } from '../events/invite-share';
import { Body, Btn, FormError, LinkBtn, Muted, TextField, useAction } from '../events/ui';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';


export function ClubCreateForm() {
  useAppPreferences();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [created, setCreated] = useState<ClubCreateResponse | null>(null);
  const { pending, error, setError, run } = useAction();

  async function onSubmit() {
    if (name.trim().length < 2) {
      setError('Tên club cần ít nhất 2 ký tự');
      return;
    }
    await run(async () => {
      setCreated(
        await api<ClubCreateResponse>('/clubs', {
          method: 'POST',
          body: { name, description: description.trim() || undefined },
        }),
      );
    }, 'Tạo club thất bại, kiểm tra lại thông tin');
  }

  if (created) {
    return (
      <View style={{ gap: space.lg }}>
        <Body bold>{t('Đã tạo club "{name}"', { name: created.club.name })}.</Body>
        <InviteShare inviteUrl={created.inviteUrl} title={created.club.name} />
        <LinkBtn label={t("Vào club")} to={`/clubs/${created.club.slug}`} />
      </View>
    );
  }

  return (
    <View style={{ gap: space.lg }}>
      <TextField label={t("Tên club")} maxLength={80} value={name} onChangeText={setName} />
      <TextField
        label={t("Mô tả (tùy chọn)")}
        multiline
        maxLength={1000}
        value={description}
        onChangeText={setDescription}
      />
      <Muted small>
        {t("Club ở chế độ riêng tư: người ngoài chỉ thấy tên và số thành viên, tham gia bằng link mời.")}
      </Muted>
      <FormError message={error} />
      <Btn disabled={pending} label={t("Tạo club")} onPress={() => void onSubmit()} />
    </View>
  );
}
