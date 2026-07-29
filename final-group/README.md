# Bài tập nhóm cuối khóa — TripFlow

TripFlow là MVP quản lý lịch trình chuyến đi cho bài tập nhóm cuối khóa UIT.
Dự án được giữ riêng trong `final-group/` để không trộn với portfolio cá nhân
hoặc các bài Buổi 4–5 đã nộp.

## Trạng thái hiện tại

- App `/final-group/`: đã nối Auth, onboarding tạo chuyến đi, dashboard,
  lịch trình, thành viên, chi phí và thống kê.
- Firebase Auth/Firestore: đã có adapter typed và cấu hình bằng
  `VITE_FIREBASE_*`.
- Firebase project riêng: `tripflow-mhx2026-khanh`; Firestore Standard đặt tại
  `asia-southeast1`, bật delete protection và Email/Password Authentication.
- Firestore Security Rules: bản hiện tại đã kiểm tra bằng Emulator với các ca
  Lead, Member và người ngoài nhóm. Bản production cần deploy lại sau khi khóa
  phạm vi lõi.
- Build production và toàn bộ test thông thường: đang xanh.
- Chưa deploy frontend. Sắp xếp lịch trình đã có thứ tự bền vững và chỉ Lead
  được đổi; khoản chi đã có luồng tạo và Lead-only settlement.
- Join bằng mã vẫn bị vô hiệu hóa an toàn cho đến khi có callable function hoặc
  join-proof được server xác minh.

## Phạm vi MVP

- Đăng ký/đăng nhập bằng Firebase Auth.
- Tạo chuyến đi. Tham gia bằng mã là phạm vi tiếp theo, chưa bật trong bản hiện
  tại vì client không được tự cấp membership chỉ bằng một mã bí mật.
- Lead/Member và phân quyền.
- CRUD sự kiện, duyệt sự kiện, phát hiện trùng lịch và sắp xếp bền vững.
- Theo dõi trạng thái sự kiện.
- Tạo/chốt khoản chi, số tiền đã trả và công nợ.

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

Rules test cần JDK 21+ và chạy hoàn toàn với project demo của Emulator, không
đụng dữ liệu Firebase thật:

```bash
npm.cmd run test:final-group:rules
```

E2E browser test cần Google Chrome cài trên máy và JDK 21. Lệnh dưới đây tự
khởi động Auth Emulator, Firestore Emulator và Vite trên các cổng local riêng,
dùng project `demo-tripflow-e2e`, rồi tự tắt sau khi test:

```bash
npm.cmd run test:final-group:e2e
```

Hai hành trình E2E bao phủ đăng ký/đăng nhập, tạo chuyến đi, join-by-code
fail-closed, CRUD và sắp xếp lịch trình, khoản chi/chốt sổ, cập nhật trách nhiệm,
phân quyền Lead/Member, realtime và thu hồi quyền thành viên. Cấu hình E2E ghi đè
toàn bộ Firebase Web values bằng dữ liệu giả và làm test thất bại nếu browser có
bất kỳ HTTP(S) request nào đi ra ngoài loopback.

Để chạy một vòng đầy đủ gồm kiểm tra biên/secret, unit/integration test, build,
Firestore Rules và browser E2E:

```powershell
powershell -ExecutionPolicy Bypass -File .\final-group\scripts\verify-final-group.ps1 -Full
```

Smoke test Auth thật tạo một tài khoản tổng hợp rồi xóa ngay:

```bash
npm.cmd run test:final-group:auth-live
```
