---
title: "P2 – Chủ quán quản lý cơ sở + import CSV/JSON"
description: "cafe_members theo cơ sở, claim quán có maintainer duyệt, import thông tin quán/kho game với template + mapping preset"
status: pending
priority: P2
effort: "6-8d"
tags: [owners, import, post-mvp]
created: 2026-09-24
---

# P2 – Chủ quán + import (sau MVP)

## Quyết định (2026-09-24)
- Quyền theo **từng cơ sở**: `cafe_members(userId, cafeId, role 'owner'|'staff', PK)` — 1 người nhiều quán, 1 quán nhiều người; không thêm role toàn cục.
- **Claim**: user bấm "Tôi là chủ quán" + bằng chứng (link tin nhắn fanpage, SĐT, ảnh) → `cafe_claims(status pending|approved|rejected, reviewedBy)` → maintainer duyệt → tạo `cafe_members owner`, `consentStatus = granted`, `verifiedAt`.
- Chủ quán tạo cơ sở mới (chi nhánh) → `pending` tới khi maintainer duyệt lần đầu; sau đó cơ sở thuộc chủ đã xác minh được tự duyệt.
- **Import**: template chung CSV/JSON cho (a) thông tin quán, (b) kho game; bước **ghép cột** + lưu `import_presets(cafeId|ownerId, kind, mapping jsonb)`; dry-run → xem trước lỗi theo dòng → apply trong 1 transaction; game chưa có → khớp theo barcode/bggId/tên (unaccent+trigram) → danh sách "cần xác nhận".

## Phases (chi tiết viết khi bắt đầu)
1. Schema `cafe_members`, `cafe_claims`, middleware `requireCafeRole(cafeId, ...)`.
2. Luồng claim + màn duyệt maintainer + email thông báo (dùng Mailer P1b).
3. Dashboard chủ quán `/quan-cua-toi`: danh sách cơ sở, sửa thông tin, kho game (tái dùng UI admin), quét mã (tái dùng P1 phase 5).
4. Import engine dùng chung (parser CSV/JSON, mapping, validate, match game) + UI mapping/preset.
5. Template tải về + docs cho chủ quán.

## Success Criteria
- [ ] Chủ quán chỉ sửa được cơ sở mình là member (test 403 chéo quán).
- [ ] Claim được duyệt → quán chuyển `granted`, chủ quán thấy trong dashboard.
- [ ] Import 200 dòng kho game từ CSV tùy cột, lưu preset, lần 2 import không cần map lại.

## Non-goals
Thanh toán/gói trả phí, POS/đặt bàn, MCP.
