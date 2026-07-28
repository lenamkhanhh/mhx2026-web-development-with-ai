# Bài tập nhóm cuối khóa — TripFlow

TripFlow là MVP quản lý lịch trình chuyến đi cho bài tập nhóm cuối khóa UIT.
Dự án được giữ riêng trong `final-group/` để không trộn với portfolio cá nhân
hoặc các bài Buổi 4–5 đã nộp.

## Trạng thái hiện tại

- Domain rules: đã có test và implementation.
- Dashboard UI: đã có các view tổng quan, lịch trình, chi phí và thành viên.
- Auth validation: đã có test và implementation.
- Firebase Auth/Firestore, onboarding, security rules và deployment: chưa nối.

## Phạm vi MVP

- Đăng ký/đăng nhập bằng Firebase Auth.
- Tạo hoặc tham gia một chuyến đi bằng mã.
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

## Chạy kiểm thử hiện tại

Từ thư mục gốc:

```bash
npm.cmd test -- final-group/src/domain.test.ts
npm.cmd test -- final-group/src/auth.test.ts
npm.cmd test -- final-group/src/components/TripDashboard.test.tsx
```

Luồng `App` hiện đang là checkpoint RED có chủ đích: test đã định nghĩa nhưng
`App.tsx` và Firebase adapter chưa được triển khai.
