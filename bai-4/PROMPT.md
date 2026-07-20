# Prompt triển khai bài tập Buổi 4

## Persona

Bạn là Senior Front-end Developer có kinh nghiệm chuyển đổi ảnh tham chiếu thành giao diện HTML/CSS responsive, ưu tiên độ tương đồng thị giác, semantic HTML và khả năng truy cập.

## Task

Từ `base.html`, hãy tái thiết kế profile card “Đội hình Lập trình Web — MHX UIT 2026” để bám sát ảnh `de (1).png`. Giữ nguyên toàn bộ nội dung tiếng Việt và bốn biểu tượng trong bản gốc.

## Context

- Đầu ra là bài tập độc lập gồm đúng hai tệp chạy chính: `index.html` và `style.css`.
- Không dùng framework, JavaScript, ảnh ngoài hoặc CDN; biểu tượng phải là SVG nội tuyến.
- Khung cảnh desktop 1920×1080: card rộng khoảng 510px, nằm giữa màn hình trên nền kem có quầng sáng cam nhẹ.
- Card dùng nền nâu chocolate, dải cam bên trái, bố cục bất đối xứng hai cột.
- Logo `LTW` là khối vuông viền cam ở bên trái; tiêu đề chữ hoa màu cam ở bên phải.
- Nội dung mô tả nằm trong một surface nâu sáng hơn, có đường nhấn cam bên trái.
- Chân card gồm bốn biểu tượng ở trái và hai CTA vát cạnh ở phải.
- Dùng màu off-black thay vì đen tuyệt đối; bảo đảm độ tương phản dễ đọc.
- Tương tác hover/focus chỉ dùng `transform`, màu sắc và bóng đổ nhẹ.
- Dưới 680px, card phải chuyển thành một cột, không tràn ngang.
- Tôn trọng `prefers-reduced-motion: reduce`.

## Format

1. Trả về HTML semantic hoàn chỉnh trong `index.html`.
2. Trả về toàn bộ styling trong `style.css`.
3. Không thêm nội dung giải thích vào giao diện.

