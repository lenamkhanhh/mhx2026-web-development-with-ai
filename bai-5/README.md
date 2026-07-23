# Buổi 5 · WebAuth Studio

Website bài tập Buổi 5 gồm ba flow: Register, Login và Profile.

Live demo: https://mhx2026-web-development-with-ai.vercel.app/bai-5/

## Chạy thử

Từ root repo:

```bash
npm run dev
```

Mở `/bai-5/`. Khi thiếu cấu hình Firebase, app dùng local demo mode bằng
`localStorage`; hiện tại project đã được nối Firebase thật.

## Firebase đã triển khai

- Project: `mhx2026-web-buoi-5`
- Web app: `Buoi 5 WebAuth`
- Authentication: Email/Password đã bật
- Firestore: database `(default)` tại `asia-southeast1` (Singapore)
- Rules nguồn: `firestore.rules`
- Client config: `firebaseConfig.js`

Firebase Web config/API key là public client identifier, không phải service-account
secret. Không đưa private key hoặc file service account vào frontend.

Khi có config, app sẽ tạo tài khoản, đăng nhập/đăng xuất và lưu hồ sơ tại
`users/{uid}`. Rules chỉ cho tài khoản hiện tại đọc/ghi document của chính mình,
đồng thời khóa thao tác xóa.
