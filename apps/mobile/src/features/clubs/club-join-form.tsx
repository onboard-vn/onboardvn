import type { ClubJoinResponse } from '@onboard/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '../../api/client';
import { space } from '../../ui/theme';
import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Body, Btn, FormError, TextField, href, useAction } from '../events/ui';

export function ClubJoinForm({ code }: { code: string }) {
  useAppPreferences();
  const router = useRouter();
  const [externalId, setExternalId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  async function onSubmit() {
    await run(async () => {
      const joined = await api<ClubJoinResponse>(`/clubs/join/${encodeURIComponent(code)}`, {
        method: 'POST',
        body: { externalId: externalId.trim() || undefined },
      });
      if (externalId.trim() && !joined.externalMatched) {
        setNotice(t('Đã tham gia club, nhưng không khớp được ID. Bạn có thể thử lại trong club.'));
        setTimeout(() => router.replace(href(`/clubs/${joined.slug}`)), 1500);
        return;
      }
      router.replace(href(`/clubs/${joined.slug}`));
    }, t('Link mời không hợp lệ hoặc đã hết hạn'));
  }

  return (
    <View style={{ gap: space.lg }}>
      <TextField
        label={t('ID trên app club cũ (tùy chọn)')}
        hint={t('Nhập nếu bạn đã có tài khoản ở app club cũ để liên kết lịch sử chơi.')}
        maxLength={100}
        autoCapitalize="none"
        autoCorrect={false}
        value={externalId}
        onChangeText={setExternalId}
      />
      <FormError message={error} />
      {notice ? <Body>{notice}</Body> : null}
      <Btn disabled={pending} label={t('Tham gia')} onPress={() => void onSubmit()} />
    </View>
  );
}
