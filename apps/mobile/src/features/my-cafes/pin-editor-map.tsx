import { StyleSheet, Text } from 'react-native';
import { colors } from '../../ui/theme';

export interface RecenterTarget {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface PinEditorMapProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  recenterTo?: RecenterTarget | null;
}

export default function PinEditorMap(_props: PinEditorMapProps) {
  return (
    <Text style={styles.note}>
      Bản đồ chỉ khả dụng trên trình duyệt web — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.
    </Text>
  );
}

const styles = StyleSheet.create({ note: { color: colors.muted, fontSize: 13 } });
