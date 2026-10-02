import { Hint } from '../../ui/primitives';

export function BarcodeScanner(_props: { onDetect: (code: string) => void }) {
  return <Hint>Quét bằng camera chỉ khả dụng trên web — nhập mã vạch tay bên dưới.</Hint>;
}
