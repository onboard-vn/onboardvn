import { StyleSheet, Text } from 'react-native';
import { colors } from '../../ui/theme';

export function BarcodeScanner(_props: { onDetect: (code: string) => void }) {
  return (
    <Text style={styles.note}>
      Quét bằng camera chỉ có trên trình duyệt web. Nhập mã vạch (EAN/UPC) thủ công bên dưới.
    </Text>
  );
}

const styles = StyleSheet.create({ note: { color: colors.muted, fontSize: 14 } });
