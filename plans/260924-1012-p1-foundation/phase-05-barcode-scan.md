---
phase: 5
title: "Quét mã vạch"
status: completed
priority: P1
effort: "3d"
dependencies: [3, 4]
---

# Phase 5: Quét mã vạch

## Overview
Quét EAN-13/UPC-A bằng camera trên web → tra DB nội bộ → fallback GameUPC (qua API proxy) → chọn game → thêm vào kho quán. Mã lạ: gắn thủ công và (tùy chọn) submit ngược GameUPC.

## Requirements
- Functional: màn quét liên tục (nhiều hộp liên tiếp), dedupe mã trong phiên, danh sách "đã quét" để xác nhận hàng loạt vào 1 quán; nhập tay mã khi camera kém.
- Non-functional: key GameUPC chỉ ở server; cache kết quả tra cứu; timeout 5s + retry 1 lần.

## Architecture
```
[web /admin/scan] --camera--> barcode-detector polyfill (zxing-wasm)
      │ code
      ▼
GET /barcodes/:code ──► game_barcodes (hit) ──► game
                   └──► barcode_lookups cache (TTL 30d) ──► GameUPC GET /upc/{code}
                                                         └─ trả candidates { bggId, name, confidence }
POST /barcodes/:code/link { gameId, submitUpstream? }  (maintainer)
POST /cafes/:id/games/bulk { gameIds[] }
```
```ts
// apps/api/src/modules/barcodes/gameupc-client.ts
export interface GameUpcCandidate { bggId: number; name: string; confidence: number }
export type LookupResult =
  | { kind: 'local'; game: GameSummary }
  | { kind: 'candidates'; items: GameUpcCandidate[] }
  | { kind: 'unknown' };
```
- Candidate có `bggId` trùng game nội bộ → gợi ý game đó; không có → mở form tạo game nhanh (prefill tên).
- Chỉ học ý tưởng từ ShelfScan (proxy giữ key, confidence, dedupe) — repo đó không có license mở.

## Related Code Files
- Create: `apps/api/src/modules/barcodes/*` (routes, service, gameupc-client, cache schema), `apps/web/app/admin/scan/page.tsx`, `apps/web/components/barcode-scanner.tsx`.

## Implementation Steps
1. Kiểm tra docs/điều khoản GameUPC hiện hành, xin API key; ghi vào `docs/references.md`.
2. Client GameUPC với timeout/retry, map response → `GameUpcCandidate`.
3. Service lookup 3 tầng + cache table.
4. Component scanner: `BarcodeDetector` native khi có, polyfill zxing-wasm khi không; formats `ean_13, upc_a, ean_8`; rung/tiếng bíp khi bắt được.
5. UI phiên quét → chọn quán → xác nhận bulk.
6. Test: service với GameUPC mock (hit/miss/timeout), checksum; e2e Playwright headless với ảnh barcode tĩnh (fake camera).

## Success Criteria
- [ ] Quét 10 hộp liên tiếp không trùng, thêm vào kho quán 1 lần bấm.
- [ ] GameUPC down → vẫn nhập tay được, lỗi hiện rõ.
- [ ] Không có key GameUPC nào trong bundle web (kiểm tra build).

## Risk Assessment
- iOS Safari không có `BarcodeDetector` → polyfill bắt buộc; test thật trên iPhone.
- GameUPC đổi điều khoản/ngừng → tầng local + nhập tay vẫn chạy; client tách interface để thay nguồn.

## Addendum — MVP chưa có key GameUPC (chốt 2026-09-24)
- GameUPC là provider tùy chọn: chỉ bật khi có `GAMEUPC_BASE_URL` + `GAMEUPC_API_KEY`; thiếu → lookup chỉ tầng local, trả `unknown`, UI hiện "chưa có gợi ý, chọn game thủ công".
- Dev/test: `https://api.gameupc.com/test` + key test công khai. Prod MVP: tắt. Xin key `/v1` qua email sau khi MVP lên.
- Success criterion "gợi ý game" từ GameUPC chỉ áp dụng khi provider bật; quét → gắn tay → thêm kho vẫn bắt buộc chạy ở MVP.
