import { Alert, Platform } from 'react-native';

export function confirmAction(message: string, confirmLabel = 'Đồng ý'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert(message, undefined, [
      { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
