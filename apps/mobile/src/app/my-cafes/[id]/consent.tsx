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
import { colors, space } from '../../../ui/theme';

function ConsentForm({
  cafeId,
  consentStatus,
  onDone,
}: {
  cafeId: string;
  consentStatus: string;
  onDone: () => void;
}) {
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
      setError(errorMessage(e, 'Không lưu được, thử lại sau'));
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <Text style={styles.status}>
        Trạng thái hiện tại: <Text style={styles.bold}>{consentStatus}</Text>
      </Text>
      <TextInput
        style={[inputStyle, styles.reason]}
        placeholder="Lý do (tùy chọn, chỉ nội bộ)"
        placeholderTextColor={colors.muted}
        value={reason}
        onChangeText={setReason}
        multiline
        accessibilityLabel="Lý do"
      />
      <View style={styles.buttons}>
        <Button label="Đồng ý hiển thị" disabled={pending} onPress={() => void decide('granted')} />
        <Button
          label="Từ chối hiển thị"
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
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''} maxWidth={448}>
      {(cafe, reload) => (
        <>
          <Stack.Screen options={{ title: 'Đồng ý hiển thị' }} />
          <H1>Đồng ý hiển thị công khai</H1>
          <P muted>
            Quán &quot;{cafe.name}&quot; của bạn hiện chỉ hiện thông tin cơ bản. Bấm &quot;Đồng ý
            hiển thị&quot; để công khai đầy đủ thông tin, hoặc &quot;Từ chối hiển thị&quot; để ẩn
            quán khỏi các trang công khai.
          </P>
          <ConsentForm cafeId={id ?? ''} consentStatus={cafe.consentStatus} onDone={reload} />
        </>
      )}
    </ManageGate>
  );
}

const styles = StyleSheet.create({
  status: { color: colors.text },
  bold: { fontWeight: '700' },
  reason: { minHeight: 64, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
