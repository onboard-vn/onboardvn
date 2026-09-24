# Đóng góp cho Onboard VN

Cảm ơn bạn quan tâm đóng góp cho Onboard VN. Tài liệu này mô tả quy trình đóng góp mã nguồn và dữ liệu.

## Giấy phép

- Mã nguồn: [GNU AGPL-3.0-only](LICENSE).
- Dữ liệu: dữ kiện `facts/` CC0 1.0; mô tả game và thông tin quán [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); `admin-units/` giữ license MIT của nguồn.

Bằng việc gửi pull request, bạn đồng ý cấp phép đóng góp của mình theo các giấy phép trên.

### Nội dung tự viết (mô tả game, ghi chú...)

- Mô tả game do bạn tự viết ("original") được cấp phép **CC BY-SA 4.0**; form nhập liệu yêu cầu xác nhận đồng ý trước khi lưu.
- **Không dịch/copy** mô tả từ BoardGameGeek, hộp game, hay rulebook nếu chưa có phép của nhà phát hành (chủ sở hữu bản quyền, thường không phải BGG). Bản dịch có phép phải ghi rõ đơn vị cấp phép và tham chiếu giấy phép, và được đánh dấu `permission-only` (không xuất ra dataset công khai).
- Dữ kiện khách quan (tên, số người chơi, thời gian, độ khó, thể loại, mã vạch...) thuộc `facts/` trong dataset, cấp phép **CC0** (public domain) để tương thích với Wikidata.

## DCO — không có CLA

Dự án dùng **Developer Certificate of Origin (DCO)** thay vì Contributor License Agreement (CLA). Nghĩa là:

- Không cần ký CLA hay chuyển giao bản quyền cho dự án.
- Mỗi commit phải được "sign-off" bằng flag `-s`:

  ```bash
  git commit -s -m "feat: thêm bộ lọc theo tỉnh"
  ```

  Lệnh này thêm dòng `Signed-off-by: Tên <email>` vào commit message, xác nhận bạn có quyền gửi đóng góp này theo DCO. Đọc toàn văn tại [developercertificate.org](https://developercertificate.org/).

- **Hệ quả của việc không có CLA**: dự án không được quyền đơn phương đổi giấy phép (relicense) mã nguồn sau này. Muốn đổi giấy phép AGPL-3.0-only sang giấy phép khác, cần có sự đồng ý của **toàn bộ** tác giả đã đóng góp. Đây là đánh đổi có chủ đích để bảo vệ tính mở lâu dài của dự án.

## Chuẩn commit message

Dùng [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, v.v. Không thêm nhắc đến AI trong commit message.

## Quy trình Pull Request

1. Fork repo, tạo nhánh từ `main` (ví dụ `feat/cafe-filter`).
2. Cài đặt môi trường (xem [README](README.md#quickstart)).
3. Trước khi mở PR, đảm bảo chạy sạch:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

   (tương đương lệnh CI chạy trên mỗi PR — xem `.github/workflows/ci.yml`.)

4. Format code: `pnpm format`.
5. Mở PR vào `main`, điền theo [template PR](.github/PULL_REQUEST_TEMPLATE.md), tick DCO checkbox, đợi CI xanh và review.

## Thiết lập môi trường local

```bash
pnpm i
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm dev
```

Yêu cầu: Node 22 (xem `.nvmrc`), pnpm 11 (`packageManager` trong `package.json`), Docker (cho Postgres).

## Báo lỗi bảo mật

Không mở issue công khai cho lỗ hổng bảo mật — xem [SECURITY.md](SECURITY.md).

---

## English summary

Onboard VN uses **DCO, not a CLA** — sign every commit with `git commit -s`. No CLA means the project cannot relicense the AGPL-3.0-only codebase later without consent from every contributor. Use Conventional Commits. Before opening a PR, run `pnpm lint typecheck test build` (matches CI in `.github/workflows/ci.yml`) and `pnpm format`. Code is AGPL-3.0-only; dataset facts are CC0, descriptions/cafés CC BY-SA 4.0, admin units MIT. Report security vulnerabilities privately per [SECURITY.md](SECURITY.md), not via public issues.
