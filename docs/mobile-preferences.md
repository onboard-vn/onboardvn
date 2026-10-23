# Ngôn ngữ và giao diện

Menu là nơi chọn ngôn ngữ và giao diện chung để người dùng không phải chọn lại ở từng màn hình. Liên kết nguồn, giấy phép và yêu cầu sửa/gỡ cũng nằm trong menu, tránh footer lặp lại trong các luồng chơi.

Ngôn ngữ áp dụng cho nội dung do ứng dụng biên soạn. Tên người, tên quán và nội dung do người dùng nhập được giữ nguyên; dữ liệu catalog dùng bản dịch đã có thay vì tự tạo bản dịch khi hiển thị.

## Nguồn bảo trì

- [PreferencesProvider](../apps/mobile/src/ui/preferences.tsx) quản lý lựa chọn chung; không tạo tùy chọn ngôn ngữ riêng cho từng công cụ.
- [Bộ dịch](../apps/mobile/src/ui/i18n.ts) và [các bảng dịch](../apps/mobile/src/i18n/) sở hữu nội dung VI/EN. Câu có dữ liệu động dùng tham số có tên để giữ dữ liệu tách khỏi bản dịch.
- [Theme](../apps/mobile/src/ui/theme.ts) sở hữu màu ngữ nghĩa. Thành phần dùng màu hoặc bản dịch cần theo dõi tùy chọn chung để đổi ngay mà không làm mất dữ liệu đang nhập.
- [Kiểm thử ngôn ngữ](../apps/mobile/src/ui/i18n.test.ts) kiểm tra khóa dịch, tham số và nội dung đóng gói. Kiểm tra giao diện vẫn cần cho độ tương phản, bố cục và các điều khiển bản đồ.

Các trang hướng dẫn và bảng điểm dùng chung lựa chọn ngôn ngữ với menu; không thêm tab VI/EN song song cho cùng một nội dung.
