import { t } from '../../ui/i18n';
import { useAppPreferences } from '../../ui/preferences';
import { Hint } from '../../ui/primitives';

export interface FilePickProps {
  accept: string;
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function FilePick(_props: FilePickProps) {
  useAppPreferences();
  return <Hint>{t('Tải tệp lên chỉ khả dụng trên trình duyệt web.')}</Hint>;
}
