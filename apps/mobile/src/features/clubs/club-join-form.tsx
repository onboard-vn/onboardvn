import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '../../api/client';
import { clubsApi } from '../../api/clubs';
import { space } from '../../ui/theme';
import { clubJoinErrorMessage } from './club-join-error';
import { canSubmitClubJoin } from './club-join-state';
import { Btn, FormError, TextField, href } from '../events/ui';
import { useAppPreferences } from '../../ui/preferences';
import { t } from '../../ui/i18n';



export function ClubJoinForm({ code }: { code: string }) {
  useAppPreferences();
  const router = useRouter();
  const [clubId, setClubId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresClubIdForRetry, setRequiresClubIdForRetry] = useState(false);

  async function onSubmit() {
    if (pending) return;
    const submittedClubId = clubId.trim();
    if (!canSubmitClubJoin(submittedClubId, requiresClubIdForRetry)) {
      setError(clubJoinErrorMessage(null));
      return;
    }
    setClubId('');
    setError(null);
    setPending(true);
    if (requiresClubIdForRetry) setRequiresClubIdForRetry(false);
    try {
      const joined = await clubsApi.joinByInvite(code, submittedClubId || undefined);
      if (submittedClubId && !joined.externalMatched) {
        setRequiresClubIdForRetry(true);
        setError(clubJoinErrorMessage(null));
        return;
      }
      router.replace(href(`/clubs/${joined.slug}`));
    } catch (cause) {
      if (submittedClubId) setRequiresClubIdForRetry(true);
      setError(clubJoinErrorMessage(cause instanceof ApiError ? cause.status : null));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: space.lg }}>
      <TextField
        label="Club ID"
        hint={
          requiresClubIdForRetry
            ? t("Nhập lại Club ID để thử liên kết lần nữa.")
            : t("Nhập nếu bạn muốn liên kết tài khoản club cũ. Có thể để trống.")
        }
        maxLength={100}
        editable={!pending}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        secureTextEntry
        value={clubId}
        onChangeText={setClubId}
        onSubmitEditing={() => void onSubmit()}
      />
      <FormError message={error} />
      <Btn
        disabled={pending || !canSubmitClubJoin(clubId, requiresClubIdForRetry)}
        label={pending ? t("Đang liên kết…") : t("Tham gia CLB")}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}
