# Bài tập nhóm cuối khóa — TripFlow

TripFlow là MVP quản lý lịch trình chuyến đi cho bài tập nhóm cuối khóa UIT.
Dự án được giữ riêng trong `final-group/` để không trộn với portfolio cá nhân
hoặc các bài Buổi 4–5 đã nộp.

## Trạng thái hiện tại

- App `/final-group/`: đã nối Auth, onboarding tạo chuyến đi, dashboard,
  lịch trình, thành viên, chi phí và thống kê.
- Firebase Auth/Firestore: đã có adapter typed và cấu hình bằng
  `VITE_FIREBASE_*`.
- Firestore Security Rules: đã kiểm tra bằng Emulator với các ca Lead, Member
  và người ngoài nhóm.
- Build production và toàn bộ test thông thường: đang xanh.
- Chưa deploy. Join bằng mã, sắp xếp lại sự kiện và chốt thanh toán vẫn bị
  vô hiệu hóa an toàn cho đến khi có thiết kế server/schema xác minh được.

## Phạm vi MVP

- Đăng ký/đăng nhập bằng Firebase Auth.
- Tạo chuyến đi. Tham gia bằng mã là phạm vi tiếp theo, chưa bật trong bản hiện
  tại vì client không được tự cấp membership chỉ bằng một mã bí mật.
- Lead/Member và phân quyền.
- CRUD sự kiện, duyệt sự kiện và phát hiện trùng lịch.
- Theo dõi trạng thái sự kiện.
- Chi phí, số tiền đã trả và công nợ.

## Quy tắc làm việc

Đọc [`SKILL.md`](./SKILL.md) trước khi sửa code. Mỗi module phải có test
riêng, không đưa service-account key hoặc secret vào frontend, và không deploy
cho đến khi chat tích hợp xác nhận build/test.

## Handoff cho các chat

- [`references/architecture.md`](./references/architecture.md): kiến trúc và
  boundary.
- [`references/data-model.md`](./references/data-model.md): schema Firestore.
- [`references/permissions.md`](./references/permissions.md): ma trận quyền.
- [`handoffs/TASK_PROMPTS.md`](./handoffs/TASK_PROMPTS.md): prompt và ownership
  cho từng chat.
- [`handoffs/HANDOFF_TEMPLATE.md`](./handoffs/HANDOFF_TEMPLATE.md): mẫu bàn
  giao bắt buộc.
- [`scripts/verify-final-group.ps1`](./scripts/verify-final-group.ps1): kiểm tra
  boundary, required files và secret pattern.

## Cấu hình local

Sao chép các khóa Firebase Web công khai trong
[`final-group/.env.example`](./.env.example) vào `.env.local` ở thư mục gốc.
Không đưa service-account, private key hoặc Admin SDK credential vào frontend.

## Chạy và kiểm thử

Từ thư mục gốc:

```bash
npm.cmd run dev -- --host 127.0.0.1 --port 4173
npm.cmd test -- final-group
npm.cmd run build
```

Mở `http://127.0.0.1:4173/final-group/`.

Rules test cần JDK 11+ và chạy hoàn toàn với project demo của Emulator, không
đụng dữ liệu Firebase thật:

```bash
npm.cmd run test:final-group:rules
```
