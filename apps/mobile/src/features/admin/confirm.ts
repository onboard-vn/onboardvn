import { t } from '../../ui/i18n';
import { Alert, Platform } from 'react-native';

export function confirmAction(message: string, confirmLabel = t('Đồng ý')): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: t('Hủy'), style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
