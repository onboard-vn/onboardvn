import { Stack, useLocalSearchParams } from 'expo-router';
import { ImportManager } from '../../../features/my-cafes/import-manager';
import { ManageGate } from '../../../features/my-cafes/manage-gate';
import { H1, P } from '../../../features/static/text';

export default function CafeImport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''}>
      {(cafe) => (
        <>
          <Stack.Screen options={{ title: 'Import kho từ CSV' }} />
          <H1>Import kho · {cafe.name}</H1>
          <P muted>
            Tải file mẫu, điền tên game (tối đa 500 dòng), tải lên để xem trước rồi mới áp dụng vào
            kho. Không tạo game mới — chỉ khớp với danh mục hiện có.
          </P>
          <ImportManager cafeId={cafe.id} />
        </>
      )}
    </ManageGate>
  );
}
