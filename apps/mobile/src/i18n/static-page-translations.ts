import { REFERENCES_MARKDOWN } from '../features/static/references';

export const staticPageTranslations: Record<string, string> = {
  [REFERENCES_MARKDOWN]: `# References

OnBoardVN learns **architecture and UX patterns and ideas** from the projects below, without copying their source code, descriptions, or images.

## Board Game Wikia

An active Vietnamese board game community platform: a café directory with game inventories, café events and meetups, game information, personal game shelves, and “unboxing” style recommendations. Its source code is closed.

- https://boardgamewikia.com/vi/
- https://boardgamewikia.com/vi/shops/
- https://boardgamewikia.com/vi/events/

OnBoardVN draws on feature ideas (café game inventories, events, and personal shelves) while making its own choices: open source, open CC BY-SA data, private meetups, and barcode scanning to add inventory.

## ShelfScan

A board game barcode scanning app (no open license — “not licensed for modification”). We studied its barcode scanning architecture, barcode ↔ game confirmation flow, and GameUPC/BGG integration — **without copying code**.

- https://github.com/j5bot/shelfscan (shallow clone, read only, no LICENSE)

Lessons learned: the frontend never calls third-party APIs with secret keys directly (requests go through a backend proxy); a five-state barcode ↔ game confirmation flow for low-confidence matches; confidence that increases gradually rather than a binary correct/incorrect result; and scan deduplication per session with an offline-first cache.

## GameUPC

A barcode ↔ board game lookup service (\`api.gameupc.com\`). It requires a separate API key (contact \`gameupc@grettir.org\`) and has no public documentation or Swagger specification. The API key stays **only** in \`apps/api\` and is never exposed to the frontend.

- https://gameupc.com

Details used for Phase 5 (barcode scanning), verified on 2026-09-24:

- Development/test server: \`https://api.gameupc.com/test\` (data is periodically cleared; public test key: \`test_test_test_test_test\`). Production server: \`https://api.gameupc.com/v1\` (request a separate key by email; not yet part of the MVP).
- Optional provider: enabled only when both \`GAMEUPC_BASE_URL\` and \`GAMEUPC_API_KEY\` are set in \`apps/api\`. Without them, the MVP uses only the internal catalog and manual barcode matching, without calling GameUPC.
- Only \`bggId\` and suggested names from GameUPC are stored for display. Images and descriptions from \`bgg_info\` are neither stored nor displayed (to avoid BGG image/description copyright issues).
- Community feedback (crowdsourced voting): when a scanner confirms a correct suggestion, OnBoardVN calls \`POST /upc/{code}/bgg_id/{bggId}\` with the pseudonymous \`user_id\` \`onboard-<userId>\` to contribute to GameUPC’s shared confidence score. According to GameUPC documentation, about two non-conflicting votes are needed for a UPC ↔ BGG mapping to be considered “verified”.

## Administrative divisions (provinces/wards)

Province/city and ward/commune data after the two-tier reform (July 2025) comes from **ThangLeQuoc/vietnamese-provinces-database** (MIT license). A reduced snapshot (only \`code\`/\`name\`/\`slug\`) is stored in \`apps/api/data/admin-units.json\`, captured on 2026-09-24 (34 provinces/cities and 3,321 wards/communes).

- https://github.com/ThangLeQuoc/vietnamese-provinces-database

## “What shall we play today?” sounds

Files in \`apps/mobile/public/sfx/\` (renamed and converted to MP3):

- Shuffling, dealing, discarding, and flipping cards: **Kenney Casino Audio** (CC0) — https://kenney.nl/assets/casino-audio
- Suspense before a reveal: “Loot box open” by freesound_community on Pixabay (Pixabay License) — https://pixabay.com/sound-effects/
- Result reveal: “Level up!” by tithuh on Pixabay (Pixabay License) — https://pixabay.com/sound-effects/

## BoardGameGeek (BGG)

OnBoardVN stores **\`bgg_id\` and links** to BGG pages. Since 2026-10-03 (the owner’s decision), games without an uploaded cover **display an image link from BGG’s CDN** (\`games.external_image_url\`, without downloading it to the server), credited as “Image: BoardGameGeek”. Vietnamese descriptions are **translated from BGG descriptions**, labeled \`translated_from_bgg\` + \`permission-only\` (copyright belongs to BGG / the publisher), currently noted as “Translated from the description on BoardGameGeek”, and **excluded from the CC BY-SA dataset**. Uploaded images and original community descriptions always take priority and are not overwritten by imports. XML API v2 now requires a server-side Bearer token (it is no longer completely public without authentication).

- https://boardgamegeek.com/xmlapi2

## The Gang — mission drawing tool

The in-app tool refers to The Gang’s official rules and community homebrew cards. Homebrew author names are retained on cards that provide this information.

- [Official rules — Thames & Kosmos](https://www.thamesandkosmos.com/manuals/full/683887_TheGang_Manual-Web_051624.pdf).
- [The Gang — publisher page](https://thamesandkosmos.com/collections/board-games/products/the-gang).
- [Homebrew Modifier Cards — ColorfulPockets / Andrew Nathenson on BoardGameGeek](https://boardgamegeek.com/filepage/321535/homebrew-modifier-cards).
`,
  'Nguồn tham khảo': 'References',
  'Nguồn dữ liệu & yêu cầu sửa/gỡ': 'Data sources & correction/removal requests',
  'Nguồn dữ liệu': 'Data sources',
  'Mục đích': 'Purpose',
  'Giúp người chơi board game tìm quán và kho game phù hợp gần mình.':
    'Help board game players find suitable cafés and game collections nearby.',
  'Quyền của chủ quán': 'Café owners’ rights',
  'Chủ quán được quyền sửa thông tin quán mình hoặc từ chối hiển thị hoàn toàn, thông qua link mời chủ quán do quản trị viên cấp, hoặc bằng cách liên hệ trực tiếp bên dưới.':
    'Café owners can correct their café’s information or have the listing removed entirely, using an owner invitation link provided by an administrator or contacting us directly below.',
  'Liên hệ / báo lỗi': 'Contact / report an issue',
  'Yêu cầu sửa hoặc gỡ thông tin quán, vui lòng':
    'To request a correction or removal of a café listing, please',
  'liên hệ email': 'email',
  'tạo issue trên GitHub:': 'open an issue on GitHub:',
  'Tìm quán - Tìm game - Tìm người cùng chơi': 'Find cafés - Find games - Find people to play with',
  'Thông tin quán board game trên': 'Board game café information on',
  '(tên, địa chỉ, giờ mở cửa, kho game) tổng hợp từ thông tin kinh doanh công khai (fanpage, Google Maps) và từ chủ quán/người đóng góp. Với tài khoản đã đăng ký, chúng tôi chỉ lưu dữ liệu người dùng tự cung cấp khi tạo tài khoản và sử dụng dịch vụ (hồ sơ, tủ game, ván chơi).':
    '(names, addresses, opening hours, and game inventories) is compiled from public business information (social media pages and Google Maps), café owners, and contributors. For registered accounts, we store only the information users provide when creating an account and using the service (profiles, game shelves, and plays).',
};
