import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { useLocalSearchParams } from 'expo-router';
import { RequireLogin } from '../../../auth/require-login';
import { SharedTableScreen } from '../../../score/shared-table-screen';
import { Hint } from '../../../ui/primitives';
export default function TableScoreScreen() {
  useAppPreferences();
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  return (
    <RequireLogin reason={t('Đăng nhập để tính điểm cho bàn này.')}>
      {tableId ? <SharedTableScreen tableId={tableId} /> : <Hint>{t('Thiếu mã bàn.')}</Hint>}
    </RequireLogin>
  );
}
