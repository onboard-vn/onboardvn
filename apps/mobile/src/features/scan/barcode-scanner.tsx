import { StyleSheet, Text } from 'react-native';
import { themeStyles, colors } from '../../ui/theme';
import { useAppPreferences } from '../../ui/preferences';
import { t } from '../../ui/i18n';



export function BarcodeScanner(_props: { onDetect: (code: string) => void }) {
  useAppPreferences();
  return (
    <Text style={styles.note}>
      {t("Quét bằng camera chỉ có trên trình duyệt web. Nhập mã vạch (EAN/UPC) thủ công bên dưới.")}
    </Text>
  );
}

const styles = themeStyles(() => StyleSheet.create({ note: { color: colors.muted, fontSize: 14 } }));
