import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Hint } from '../../ui/primitives';
import type { PinEditorMapProps } from './pin-types';

export const pinMapAvailable = false;

export default function PinEditorMap(_props: PinEditorMapProps) {
  useAppPreferences();
  return (
    <Hint>{t('Bản đồ chỉ khả dụng trên web — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.')}</Hint>
  );
}
