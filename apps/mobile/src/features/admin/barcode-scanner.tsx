import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Hint } from '../../ui/primitives';

export function BarcodeScanner(_props: { onDetect: (code: string) => void }) {
  useAppPreferences();
  return <Hint>{t('Quét bằng camera chỉ khả dụng trên web — nhập mã vạch tay bên dưới.')}</Hint>;
}
