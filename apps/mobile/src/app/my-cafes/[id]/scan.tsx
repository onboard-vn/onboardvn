import { Stack, useLocalSearchParams } from 'expo-router';
import { ManageGate } from '../../../features/my-cafes/manage-gate';
import { ScanSession } from '../../../features/scan/scan-session';
import { H1, P } from '../../../features/static/text';

export default function CafeScan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''} maxWidth={768}>
      {(cafe) => (
        <>
          <Stack.Screen options={{ title: 'Quét mã vạch' }} />
          <H1>Quét mã vạch · {cafe.name}</H1>
          <P muted>Quét liên tục nhiều hộp game rồi thêm vào kho quán này bằng một lần bấm.</P>
          <ScanSession cafes={[{ id: cafe.id, name: cafe.name }]} lookup="local" />
        </>
      )}
    </ManageGate>
  );
}
