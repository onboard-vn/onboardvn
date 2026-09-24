---
phase: 6
title: "Open dataset & ghi nguồn"
status: completed
priority: P2
effort: "2d"
dependencies: [3, 4]
---

# Phase 6: Open dataset & ghi nguồn

## Overview
Export dữ liệu công khai (game, barcode, quán, kho) ra repo `dataset` theo CC BY-SA 4.0; import CSV để nhập liệu nhanh; trang "Nguồn tham khảo" và footer license trên web.

## Requirements
- Functional: `pnpm dataset:export` → `games.json|csv`, `cafes.json|csv`, `cafe_games.csv`; `pnpm dataset:import <csv>` (maintainer, dry-run mặc định).
- Non-functional: không export PII (user id, email, consent note); ổn định thứ tự để diff git gọn.

## Architecture
- Script trong `apps/api/scripts/dataset/*`, dùng lại repo layer.
- Repo `dataset`: `LICENSE` (CC BY-SA 4.0), `README` (schema cột, cách ghi nguồn), GitHub Action nhận PR dữ liệu → validate bằng zod từ `packages/shared`.
- Web: `/nguon-tham-khao` render từ `docs/references.md`; footer "Code AGPL-3.0 · Dữ liệu CC BY-SA 4.0".

## Related Code Files
- Create: `apps/api/scripts/dataset/{export,import}.ts`, `apps/web/app/nguon-tham-khao/page.tsx`, footer component; repo `dataset` skeleton.

## Implementation Steps
1. Export deterministic (sort theo slug), loại cột nhạy cảm; chỉ quán `consentStatus != pending`.
2. Import CSV với zod, báo lỗi theo dòng, `--apply` mới ghi.
3. Skeleton repo dataset + CI validate.
4. Trang nguồn tham khảo + footer.

## Success Criteria
- [ ] Export 2 lần liên tiếp không đổi → diff rỗng.
- [ ] Import CSV lỗi báo đúng dòng, dry-run không ghi DB.
- [ ] Trang nguồn tham khảo liệt kê Board Game Wikia, ShelfScan, GameUPC, BGG.

## Risk Assessment
- CC BY-SA áp lên mô tả cộng đồng: cần ghi trong điều khoản đóng góp (contributor đồng ý cấp phép) — thêm vào CONTRIBUTING/ToS.

## Amendment (code review 260924-1845, P1)
`admin-units/` (provinces.csv/wards.csv, nguồn MIT ThangLeQuoc/vietnamese-provinces-database) tách khỏi `facts/` (CC0) thành thư mục riêng với `LICENSE-MIT.txt` — MIT không tương thích với việc gộp vào CC0 của dữ kiện tự tạo.
