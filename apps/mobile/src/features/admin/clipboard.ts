import { Platform, Share } from 'react-native';

export async function copyText(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    await navigator.clipboard.writeText(text);
    return;
  }
  await Share.share({ message: text });
}
