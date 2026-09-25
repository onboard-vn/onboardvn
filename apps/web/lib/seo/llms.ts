import { SITE_NAME } from '../site';

const DATASET_URL = 'https://github.com/onboard-vn/onboardvn';
const SOURCE_URL = DATASET_URL;

/** ~500KB cap so `llms-full.txt` stays a reasonable single fetch for an LLM crawler. */
export const MAX_LLMS_FULL_BYTES = 500_000;

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function buildLlmsTxt(siteUrl: string): string {
  return `# ${SITE_NAME}

> Nền tảng cộng đồng board game Việt Nam: danh bạ quán board game, kho game (barcode scan), hướng tới người chơi (player-centric).
> Mã nguồn mở AGPL-3.0-only. Dữ liệu mở: facts/ CC0 1.0, mô tả & quán CC BY-SA 4.0, admin-units/ MIT.

## Docs
- [Trang chủ](${siteUrl})
- [Danh sách game](${siteUrl}/games)
- [Danh sách quán](${siteUrl}/cafes)
- [API cho lập trình viên](${siteUrl}/developers)
- [OpenAPI spec](${siteUrl}/api/openapi.json)
- [Toàn bộ dữ liệu dạng markdown](${siteUrl}/llms-full.txt)

## Dataset
- [Dataset GitHub (facts/mô tả/quán/admin-units)](${DATASET_URL})
- [Mã nguồn](${SOURCE_URL})

## License
- Mã nguồn: AGPL-3.0-only
- Dữ liệu facts/: CC0 1.0
- Mô tả & quán: CC BY-SA 4.0
- admin-units/: MIT
`;
}

export interface LlmsGameEntry {
  slug: string;
  nameVi: string | null;
  nameEn: string;
}

export interface LlmsCafeEntry {
  slug: string;
  name: string;
  provinceName: string;
  wardName: string;
}

/** Appends game/cafe listings to `buildLlmsTxt`'s content, stopping once `maxBytes` is reached. */
export function buildLlmsFullTxt(
  siteUrl: string,
  games: LlmsGameEntry[],
  cafes: LlmsCafeEntry[],
  maxBytes = MAX_LLMS_FULL_BYTES,
): string {
  let content = `${buildLlmsTxt(siteUrl)}\n## Game\n`;
  let truncated = false;

  for (const game of games) {
    const line = `- [${game.nameVi || game.nameEn}](${siteUrl}/games/${game.slug})\n`;
    if (byteLength(content) + byteLength(line) > maxBytes) {
      truncated = true;
      break;
    }
    content += line;
  }

  if (!truncated) {
    content += '\n## Quán\n';
    for (const cafe of cafes) {
      const line = `- [${cafe.name}](${siteUrl}/cafes/${cafe.slug}) — ${cafe.wardName}, ${cafe.provinceName}\n`;
      if (byteLength(content) + byteLength(line) > maxBytes) {
        truncated = true;
        break;
      }
      content += line;
    }
  }

  return truncated ? `${content}\n<!-- danh sách bị cắt bớt do giới hạn kích thước -->\n` : content;
}
