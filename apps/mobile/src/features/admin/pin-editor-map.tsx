import { Hint } from '../../ui/primitives';
import type { PinEditorMapProps } from './pin-types';

export const pinMapAvailable = false;

export default function PinEditorMap(_props: PinEditorMapProps) {
  return <Hint>Bản đồ chỉ khả dụng trên web — nhập vĩ độ/kinh độ trực tiếp ở ô bên dưới.</Hint>;
}
