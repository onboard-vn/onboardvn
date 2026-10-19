import { useLocalSearchParams } from 'expo-router';
import { RequireLogin } from '../../../auth/require-login';
import { SharedTableScreen } from '../../../score/shared-table-screen';
import { Hint } from '../../../ui/primitives';
export default function TableScoreScreen() {
  const { tableId } = useLocalSearchParams<{ tableId: string }>();
  return (
    <RequireLogin reason="Đăng nhập để tính điểm cho bàn này.">
      {tableId ? <SharedTableScreen tableId={tableId} /> : <Hint>Thiếu mã bàn.</Hint>}
    </RequireLogin>
  );
}
