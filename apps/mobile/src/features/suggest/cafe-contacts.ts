import type { CafeLinks } from '@onboard/shared';

export interface CafeContact {
  label: string;
  url: string;
}

const digitsOf = (value: string) => value.replace(/[^0-9+]/g, '');
const isUrl = (value: string) => /^https?:\/\//i.test(value);

/** Contact buttons for the result sheet, only for links the café has filled in. */
export function cafeContacts(links: CafeLinks | null | undefined): CafeContact[] {
  if (!links) return [];
  const out: CafeContact[] = [];
  if (links.zalo) {
    const zalo = links.zalo.trim();
    out.push({
      label: 'Nhắn Zalo quán',
      url: isUrl(zalo) ? zalo : `https://zalo.me/${digitsOf(zalo).replace(/^\+?84/, '0')}`,
    });
  }
  if (links.fanpage) out.push({ label: 'Fanpage quán', url: links.fanpage });
  if (links.maps) out.push({ label: 'Chỉ đường', url: links.maps });
  if (links.phone) out.push({ label: 'Gọi quán', url: `tel:${digitsOf(links.phone)}` });
  return out;
}
