import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { InventoryManager } from '../../../features/my-cafes/inventory-manager';
import { OwnerCafeForm } from '../../../features/my-cafes/info-form';
import { ManageGate } from '../../../features/my-cafes/manage-gate';
import { MediaForm } from '../../../features/my-cafes/media-form';
import { StaffForm } from '../../../features/my-cafes/staff-form';
import { H1 } from '../../../features/static/text';
import { colors, space } from '../../../ui/theme';

export default function MyCafeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ManageGate id={id ?? ''}>
      {(cafe, reload) => (
        <>
          <Stack.Screen options={{ title: 'Quản lý địa điểm chơi' }} />
          <View style={styles.head}>
            <H1>{cafe.name}</H1>
            <View style={styles.links}>
              <Link
                href={{ pathname: '/my-cafes/[id]/import', params: { id: cafe.id } }}
                style={styles.link}
              >
                Import kho CSV
              </Link>
              <Link
                href={{ pathname: '/my-cafes/[id]/scan', params: { id: cafe.id } }}
                style={styles.link}
              >
                Quét mã vạch
              </Link>
              <Link
                href={{ pathname: '/my-cafes/[id]/consent', params: { id: cafe.id } }}
                style={styles.link}
              >
                Đồng ý hiển thị
              </Link>
            </View>
          </View>

          <MediaForm
            cafeId={cafe.id}
            logoUrl={cafe.logoUrl}
            coverUrl={cafe.coverUrl}
            photos={cafe.photos}
            onChanged={reload}
          />
          <OwnerCafeForm cafe={cafe} onSaved={reload} />
          <InventoryManager cafeId={cafe.id} inventory={cafe.inventory} onChanged={reload} />
          <StaffForm cafeId={cafe.id} />
        </>
      )}
    </ManageGate>
  );
}

const styles = StyleSheet.create({
  head: { gap: space.sm },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  link: { color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },
});
