import { t } from '../../../ui/i18n';
import { useAppPreferences } from '../../../ui/preferences';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ManageGate } from '../../../features/my-cafes/manage-gate';
import { ScanSession } from '../../../features/scan/scan-session';
import { H1, P } from '../../../features/static/text';

export default function CafeScan() {
  useAppPreferences();
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''} maxWidth={768}>
      {(cafe) => (
        <>
          <Stack.Screen options={{ title: t('Quét mã vạch') }} />
          <H1>
            {t('Quét mã vạch ·')} {cafe.name}
          </H1>
          <P muted>
            {t('Quét liên tục nhiều hộp game rồi thêm vào kho quán này bằng một lần bấm.')}
          </P>
          <ScanSession cafes={[{ id: cafe.id, name: cafe.name }]} lookup="local" />
        </>
      )}
    </ManageGate>
  );
}
