# Ngôn ngữ và giao diện

Ngôn ngữ và giao diện được dùng chung để không phải chọn lại ở từng màn hình. Trên web và native, nút cờ cạnh nút menu hiển thị lựa chọn hiện tại (`🇻🇳 VI` hoặc `🇬🇧 EN`) và chuyển sang ngôn ngữ còn lại bằng một lần bấm. Nhãn truy cập mô tả ngôn ngữ sẽ chuyển sang.

Khi chưa có lựa chọn thủ công, locale tiếng Việt (`vi`, gồm `vi-VN`) dùng VI; locale khác dùng EN. Mặc định giao diện theo thiết bị và tự đổi khi chế độ sáng/tối của hệ thống đổi. Ba lựa chọn **Theo thiết bị**, **Sáng**, **Tối** có biểu tượng ở cuối menu, sau nhóm nguồn và giấy phép.

Lựa chọn thủ công được lưu trên trình duyệt/thiết bị và giữ sau khi tải lại, đồng thời vẫn đọc được lựa chọn từ preferences v1 cũ. Ngôn ngữ và giao diện độc lập: đổi một tùy chọn không cố định tùy chọn còn lại. Đổi ngôn ngữ hoặc giao diện giữ nguyên điểm và dữ liệu đang nhập.

Ngôn ngữ áp dụng cho nội dung do ứng dụng biên soạn. Tên người, tên quán và nội dung do người dùng nhập được giữ nguyên; dữ liệu catalog dùng bản dịch đã có thay vì tự tạo bản dịch khi hiển thị.

Liên kết nguồn, giấy phép và yêu cầu sửa/gỡ nằm trong menu, tránh footer lặp lại trong các luồng chơi.

## Nguồn bảo trì

- [PreferencesProvider](../apps/mobile/src/ui/preferences.tsx) quản lý lựa chọn chung; không tạo tùy chọn ngôn ngữ riêng cho từng công cụ.
- [Mô hình preferences](../apps/mobile/src/ui/preferences-model.ts) đọc lựa chọn đã lưu và resolve mặc định thiết bị; [header](../apps/mobile/src/ui/site-header.tsx) sở hữu nút ngôn ngữ và điều khiển giao diện.
- [Bộ dịch](../apps/mobile/src/ui/i18n.ts) và [các bảng dịch](../apps/mobile/src/i18n/) sở hữu nội dung VI/EN. Câu có dữ liệu động dùng tham số có tên để giữ dữ liệu tách khỏi bản dịch.
- [Theme](../apps/mobile/src/ui/theme.ts) sở hữu màu ngữ nghĩa. Thành phần dùng màu hoặc bản dịch cần theo dõi tùy chọn chung để đổi ngay mà không làm mất dữ liệu đang nhập.
- [Kiểm thử ngôn ngữ](../apps/mobile/src/ui/i18n.test.ts) kiểm tra khóa dịch, tham số và nội dung đóng gói. Kiểm tra giao diện vẫn cần cho độ tương phản, bố cục và các điều khiển bản đồ.

Các trang hướng dẫn và bảng điểm dùng chung lựa chọn ngôn ngữ với header; không thêm tab VI/EN song song cho cùng một nội dung.
