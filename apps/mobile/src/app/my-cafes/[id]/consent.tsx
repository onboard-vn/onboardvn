import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../../api/client';
import { FormError } from '../../../features/my-cafes/form-bits';
import { ManageGate } from '../../../features/my-cafes/manage-gate';
import { errorMessage } from '../../../features/errors';
import { inputStyle } from '../../../features/search-input';
import { H1, P } from '../../../features/static/text';
import { Button, Card } from '../../../ui/primitives';
import { themeStyles, colors, space } from '../../../ui/theme';

function ConsentForm({
  cafeId,
  consentStatus,
  onDone,
}: {
  cafeId: string;
  consentStatus: string;
  onDone: () => void;
}) {
  useAppPreferences();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: 'granted' | 'declined') => {
    setPending(true);
    setError(null);
    try {
      await api(`/me/cafes/${encodeURIComponent(cafeId)}/consent`, {
        method: 'POST',
        body: { decision, reason: reason.trim() || undefined },
      });
      onDone();
    } catch (e) {
      setError(errorMessage(e, t('Không lưu được, thử lại sau')));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Text style={styles.status}>
        {t('Trạng thái hiện tại:')}
        <Text style={styles.bold}>
          {t(
            (
              {
                granted: 'Đang hiển thị công khai',
                declined: 'Đã ẩn khỏi công khai',
                pending: 'Chờ xác nhận',
                public_info_only: 'Chỉ hiện thông tin cơ bản',
              } as Record<string, string>
            )[consentStatus] ?? 'Chỉ hiện thông tin cơ bản',
          )}
        </Text>
      </Text>
      <TextInput
        style={[inputStyle, styles.reason]}
        placeholder={t('Lý do (tùy chọn, chỉ nội bộ)')}
        placeholderTextColor={colors.muted}
        value={reason}
        onChangeText={setReason}
        multiline
        accessibilityLabel={t('Lý do')}
      />
      <View style={styles.buttons}>
        <Button
          label={t('Đồng ý hiển thị')}
          disabled={pending}
          onPress={() => void decide('granted')}
        />
        <Button
          label={t('Từ chối hiển thị')}
          tone="ghost"
          disabled={pending}
          onPress={() => void decide('declined')}
        />
      </View>
      <FormError message={error} />
    </Card>
  );
}

export default function CafeConsent() {
  useAppPreferences();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''} maxWidth={448}>
      {(cafe, reload) => (
        <>
          <Stack.Screen options={{ title: t('Đồng ý hiển thị') }} />
          <H1>{t('Đồng ý hiển thị công khai')}</H1>
          <P muted>
            {t(
              'Quán "{name}" của bạn hiện chỉ hiện thông tin cơ bản. Bấm "Đồng ý hiển thị" để công khai đầy đủ thông tin, hoặc "Từ chối hiển thị" để ẩn quán khỏi các trang công khai.',
              { name: cafe.name },
            )}
          </P>
          <ConsentForm cafeId={id ?? ''} consentStatus={cafe.consentStatus} onDone={reload} />
        </>
      )}
    </ManageGate>
  );
}

const styles = themeStyles(() =>
  StyleSheet.create({
    status: { color: colors.text },
    bold: { fontWeight: '700' },
    reason: { minHeight: 64, textAlignVertical: 'top' },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  }),
);
