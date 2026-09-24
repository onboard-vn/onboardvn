# Research: shelfscan (j5bot) — porting ideas cho Onboard VN

Repo clone (shallow, read-only): `/private/tmp/claude-501/-private-var-www-laradock--code-projects-onboard-vn/bbef013b-5706-48dd-87f3-40a84c035e95/scratchpad/shelfscan`
Upstream: https://github.com/j5bot/shelfscan

## 1. License — KHÔNG compatible, không được copy code

Không có file `LICENSE`, `package.json` không có field `license`. README nói thẳng:

> "At this time the app is not licensed for modification. Message me if you'd like to discuss contributing or forking the app."
— https://github.com/j5bot/shelfscan/blob/main/README.md#L58

→ All-rights-reserved, mã nguồn public chỉ để đọc, KHÔNG có license open-source nào (không phải MIT/Apache/GPL...). Câu hỏi "AGPL-3.0 compatible?" do đó vô nghĩa — không cần xét compatibility vì tác giả chưa cấp quyền derivative work nào. **Kết luận: chỉ được học ý tưởng/kiến trúc/UX flow, KHÔNG copy/paste bất kỳ dòng code nào từ shelfscan vào Onboard VN.** Nếu muốn dùng nguyên khối, phải liên hệ tác giả (Jonathan Cook, cookie@shelfscan.io) xin phép trước.

Ngoại lệ: package phụ trợ `gameupc-hooks` (do cùng tác giả, đăng trên npm riêng) có `license: "MIT"` trong package.json của nó (xem registry: `https://registry.npmjs.org/gameupc-hooks/1.0.12`). MIT thì compatible với AGPL — nhưng nội dung của package này khá mỏng (1 React hook wrapper quanh vài fetch call), port lại tự viết nhanh hơn là depend vào nó (nó gắn chặt vào Next.js server actions/`"use server"`, React hook API, không hợp NestJS/Hono).

## 2. Barcode scanning: lib, format, UX flow

- Lib: `@react-barcode-scanner/components` (https://github.com/jmparsons/react-barcode-scanner) chạy trên `@undecaf/zbar-wasm` (ZBar biên dịch WASM) — package.json:29-30. Có patch riêng cho `@undecaf/barcode-detector-polyfill@0.9.23` (patches/@undecaf__barcode-detector-polyfill@0.9.23.patch) → dùng Barcode Detector API polyfill khi trình duyệt không có API gốc (Chrome Android có native `BarcodeDetector`, Safari/Firefox thì fallback zbar-wasm).
- Component chính: `src/app/ui/Scanner.tsx` (https://github.com/j5bot/shelfscan/blob/main/src/app/ui/Scanner.tsx)
  - Video crop theo breakpoint Tailwind (mobile/sm/md/lg), size table `SCANNER_SIZES` (Scanner.tsx:12-19).
  - Quay video portrait rồi crop landscape để quét (`videoCropHeight/videoCropWidth`, Scanner.tsx:50-55) — tối ưu vì code thường nằm ngang trên hộp game dù cầm điện thoại dọc.
  - Dedupe: nếu `codes` (từ `CodesProvider`) đã chứa code thì bỏ qua, không callback (Scanner.tsx:83-84).
  - Phát âm thanh "beep" khi scan được (`/sounds/barcode-scan.mp3`, Scanner.tsx:63-70).
  - Track sự kiện qua PostHog (`posthog.capture('barcode_scanned')`, Scanner.tsx:88).
  - Multi-camera: liệt kê `MediaDeviceInfo[]`, cho chọn camera qua dialog (Scanner.tsx:135-158) — hữu ích khi máy có nhiều camera (macro lens).
- `CodesProvider` (src/app/lib/CodesProvider.tsx) giữ danh sách code đã scan trong session, persist vào IndexedDB (Dexie) theo key `${username}|codes`, load lại khi quay lại app — pattern tốt để port cho batch-scan tại quầy café.

## 3. GameUPC API — endpoint, request/response, cơ chế "vote"

Tìm thấy trong package `gameupc-hooks@1.0.12` (tải tarball từ npm registry để đọc `dist/server-LHHepc3b.js`, vì code build minified 1 chữ nhưng đọc được logic):

- Host: `https://api.gameupc.com/v1` (test mode: `/test`), chọn bằng biến `GAMEUPC_TOKEN` có set hay không.
- Auth: header `x-api-key: <GAMEUPC_TOKEN>` (fallback `test_test_test_test_test` nếu không set token — nhưng thử gọi thật với key test này bị `403 Forbidden`, tức là key test không hoạt động public, phải xin token riêng).
- Endpoints:
  - `GET /v1/warmup` — gọi 1 lần lúc mount (giữ Lambda ấm / cold-start warmup), xem `GameUPCDataProvider.tsx:28` gọi `useGameUPC({ updaterId: 'ShelfScan' })` → tự warmup trong `useEffect`.
  - `GET /v1/upc/{upc}?search={optional text}` — lookup chính. `search` dùng khi user tự nhập tên game để tìm thay vì chỉ dựa UPC (fallback khi UPC lạ).
  - `POST /v1/upc/{upc}/bgg_id/{bggId}` hoặc `/version/{versionId}` — **đây chính là cơ chế "vote"/submit khi barcode chưa có trong DB hoặc sai**: body `{ user_id: updaterId }`, tăng `confidence` score cho association đó. Không có endpoint downvote riêng — thay vào đó:
  - `DELETE` cùng path — gỡ association khi user xác nhận mapping sai (`removeGame` trong hook).
- Response shape (`dist/types.d.ts`, cũng khớp `sampleData/scout-lookup-data.json`):
  ```ts
  type GameUPCData = {
    status: 'ok' | 'error';
    upc: string; name: string; searched_for: string;
    bgg_info_status: 'verified'|'none'|'choose_from_versions'|
                      'choose_from_bgg_info_or_search'|'choose_from_versions_or_search';
    bgg_info: GameUPCBggInfo[]; // mỗi info có id, confidence, thumbnail_url,
                                 // page_url, image_url, data_url, update_url,
                                 // version_status, versions: GameUPCBggVersion[]
  };
  ```
  `confidence` là số nguyên (vd 12, 1) — càng nhiều người POST cùng 1 mapping thì confidence càng tăng, `bgg_info_status` chuyển dần từ `choose_from_*` → `verified`. Đây chính là "voting" mà brief hỏi — không có bảng vote riêng phía client, server GameUPC tự cộng dồn theo mỗi POST.
- Client (`useGameUPC.js`) gọi các server action này qua Next.js `"use server"` (server-LHHepc3b.js dòng đầu `"use server"`) → API key **không** lộ ra browser, mọi request đi qua server Next.js proxy. Đây là pattern nên port nguyên (dù không copy code): FE gọi backend riêng (NestJS/Hono), backend giữ API key GameUPC, forward request.
- gameupc.com trang chủ không có swagger/docs public, liên hệ `gameupc@grettir.org` để xin API key/docs. Test endpoint trả `403 Forbidden` với key giả — không thể tự suy ra rate limit; phải hỏi trực tiếp tác giả khi đăng ký key thật.

## 4. BGG integration

- Không dùng OAuth cá nhân của user — chỉ cần **username** BGG công khai (không lưu password). Toàn bộ collection/user/thing/geeklist đều là API public XML v2 (`src/app/lib/actions.ts`):
  - `GET https://boardgamegeek.com/xmlapi2/collection?username=...&version=1&stats=1[&subtype=boardgame&excludesubtype=boardgameexpansion | &subtype=boardgameexpansion]`
  - `GET https://boardgamegeek.com/xmlapi2/user?name=...&buddies=1`
  - `GET https://boardgamegeek.com/xmlapi2/thing?id=...&versions=1`
  - `GET https://boardgamegeek.com/xmlapi/geeklist/{id}` (API v1, cho geeklist/math-trade)
- Nhưng **mọi request đều cần server-side Bearer token**: `fetchFromBggWithToken` (actions.ts:13-33) gắn `Authorization: Bearer ${process.env.BGG_TOKEN}`, nếu thiếu token thì throw ngay — nghĩa là BGG hiện đòi API key cấp cho app (không còn free-for-all như XML API v2 cũ hoàn toàn public). Retry logic: BGG trả `202` khi đang generate export collection async → poll lại sau 2s, tối đa `MAX_ATTEMPTS = 20` (~40s).
- Cache: response XML thô được cache trong Dexie `cacheDatabase.responses` (id, method, payload, response) — tránh gọi lại BGG liên tục; ảnh game cache riêng trong `cacheDatabase.images` (Blob/ArrayBuffer + size, để quản lý dung lượng cache).
- Parse: dùng DOM parser (`getPageDOM` trong `src/app/lib/utils/xml.ts`) chọn element theo CSS selector (`document.querySelector('user')`, `.getAttribute('name')`...) thay vì lib XML riêng — nhẹ, chạy được cả client lẫn server (jsdom test).

Với Onboard VN: KHÔNG cần BGG token vì mình không phụ thuộc BGG core (VN chưa có "BGG tương đương" — trừ khi muốn liên kết board game info từ BGG cho phần "VN wiki"). Nếu có dùng BGG XML API, cần xin BGG_TOKEN riêng (liên hệ BGG), không dùng free.

## 5. Data model games/collections

- `src/app/lib/types/game.ts` — model tối giản dùng chung cho cả GameUPC lẫn BGG:
  ```ts
  type Game = { id: number; collectionId?: number; name: string; pageUrl: string; thumbnailUrl?: string; imageUrl?: string; };
  type Version = { versionId: number; name: string; pageUrl: string; thumbnailUrl?: string; imageUrl?: string; published?: number; language?: string; };
  ```
- `src/app/lib/types/bgg.ts` — `BggCollectionItem`, `BggCollectionMap` (map theo collectionId), `BggCollectionStatuses` (own/prevowned/fortrade/want/wanttoplay/wanttobuy/wishlist/preordered), `BggUser`, `BggVersion`, `BggRawObject`.
- Local persistence: Dexie `database.ts` (6 version migrations) — bảng: `settings`, `plugins`, `collections` (BggCollectionMap theo username), `scanned` (mã đã scan theo session/user), `dataforms` (custom form schema cho extension), `scanHistory` (mỗi lần scan: `upc, status, timestamp, username, bggId` — có index để lọc), `filters` (saved filter theo tên).
- Adapter layer (`src/app/lib/utils/gameAdapters.ts`) convert qua lại `GameUPCBggInfo/Version` ↔ `Game/Version` ↔ `BggCollectionItem` — tách rời model nguồn dữ liệu khỏi model UI, đáng học (Onboard VN sẽ có ít nhất 2 nguồn: GameUPC-tương-đương của mình + BGG-cache cho info game quốc tế).
- `GameUPCStatus` enum (verified/none/choose_from_versions/choose_from_bgg_info_or_search/choose_from_versions_or_search) điều khiển toàn bộ UX "chưa chắc UPC nào khớp game nào" — quan trọng để port ý tưởng (không port code) cho luồng "scan → chưa rõ → user chọn/verify → tăng confidence".

## 6. Đáng port (ý tưởng, không phải code) vs. nên tránh

**Đáng học/port ý tưởng:**
- Kiến trúc: FE không gọi trực tiếp 3rd-party API có key — luôn qua backend proxy giữ secret (áp dụng cho GameUPC/BGG-tương-đương).
- UX 5-status flow (`GameUPCStatus`) cho quy trình xác nhận barcode ↔ game khi độ tin cậy thấp — rất hợp với "café tự nhập kho game qua scan, không chắc chắn 100%".
- Vote/confidence tăng dần mỗi lần user xác nhận thay vì binary đúng/sai — hợp mô hình crowdsource cho VN wiki (đóng góp thông tin quán café/kèo).
- Scan dedupe theo session + persist offline-first (Dexie/IndexedDB) — hữu ích cho mobile Expo sau này (SQLite/AsyncStorage tương đương) khi mạng café yếu.
- Cache response + cache ảnh riêng biệt, có quản lý size — tránh gọi lại BGG-tương-đương liên tục, tiết kiệm quota.
- Barcode Detector API native trước, zbar-wasm fallback — chiến lược quét đa nền tảng hợp lý, đặc biệt vì Onboard VN cũng cần chạy tốt trên trình duyệt di động VN đời cũ/Safari.
- Video crop landscape từ portrait feed — tăng tốc độ decode/scan trên điện thoại cầm dọc.

**Nên tránh:**
- Đừng tự tạo project "not licensed for modification" — ngược hẳn ý định Onboard VN AGPL/CC-BY-SA mở. Nếu tham khảo ý tưởng UI/UX cụ thể (bố cục, wording), nên tự thiết kế lại chứ không chụp/tái tạo y hệt để tránh tranh chấp bản quyền giao diện.
- Kiến trúc quá gắn chặt Next.js Server Actions cho toàn bộ business logic (bgg service, gameupc-hooks) — không hợp target stack NestJS/Hono tách BE riêng; nên tự thiết kế REST/RPC layer thay vì bám theo pattern "use server" của Next.
- Phụ thuộc gói ngoài hẹp/ít người dùng cho tính năng lõi (`@react-barcode-scanner/components` chỉ 1 người maintain theo README) — nên khảo sát thêm lib scan khác phổ biến hơn (vd `zxing-js`, `@zxing/browser`, hoặc Barcode Detection API thuần + fallback riêng) trước khi chốt, tránh rủi ro abandonware.
- Toàn bộ mô hình "1 user 1 BGG username, không OAuth" chỉ work vì BGG public theo username — Onboard VN cần tự thiết kế auth thật (không có "BGG của VN" để free-ride).

## Nguồn tham khảo

- https://github.com/j5bot/shelfscan (clone shallow, main branch, không có LICENSE)
- https://github.com/j5bot/shelfscan/blob/main/README.md
- https://github.com/j5bot/shelfscan/blob/main/src/app/ui/Scanner.tsx
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/CodesProvider.tsx
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/GameUPCDataProvider.tsx
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/actions.ts
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/database/database.ts
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/database/cacheDatabase.ts
- https://github.com/j5bot/shelfscan/blob/main/src/app/lib/types/game.ts
- https://github.com/j5bot/shelfscan/blob/main/sampleData/scout-lookup-data.json
- https://registry.npmjs.org/gameupc-hooks/1.0.12 (MIT license metadata + tarball dist/server-LHHepc3b.js, dist/useGameUPC.js — inspected locally, không commit vào repo Onboard VN)
- https://gameupc.com (trang chủ, không có swagger/docs public)
- https://api.gameupc.com/v1/* (test call trả 403 Forbidden, xác nhận cần API key thật)

## Câu hỏi chưa giải quyết

1. GameUPC API rate limit / pricing / ToS thật sự — không public, cần liên hệ `gameupc@grettir.org` để hỏi trực tiếp nếu Onboard VN định dùng chung DB đó (không khuyến nghị — nên tự xây DB barcode-game VN riêng theo CC BY-SA).
2. `@react-barcode-scanner/components` license/độ ổn định chưa kiểm tra riêng (không phải scope brief) — cần audit license trước khi thêm dependency thật.
3. Chưa rõ Onboard VN có định tái sử dụng chính GameUPC service (qua key riêng) hay tự xây service UPC↔game tương tự cho thị trường VN — quyết định này ảnh hưởng lớn tới scope backend.
