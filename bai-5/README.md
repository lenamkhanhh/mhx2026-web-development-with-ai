# Buổi 5 · WebAuth Studio

Website bài tập Buổi 5 gồm ba flow bắt buộc: **Register**, **Login** và **Profile**.

## Chạy thử

Mở từ root repo bằng Vite:

```bash
npm run dev
```

Sau đó truy cập `/bai-5/`. Khi chưa có Firebase config, app chạy ở **local demo mode** bằng `localStorage` để có thể kiểm tra toàn bộ giao diện và validation mà không ghi dữ liệu vào project của BTC.

## Firebase

Tạo Firebase Web App riêng cho nhóm, bật Email/Password trong Authentication và Firestore. Điền object config vào `window.BUOI5_FIREBASE_CONFIG` trong `index.html`. Web config/API key không phải service-account secret; tuyệt đối không đưa private key hoặc file service account vào frontend.

Khi có config, app sẽ:

- tạo tài khoản bằng `createUserWithEmailAndPassword`;
- cập nhật display name;
- lưu profile trong collection `users/{uid}`;
- đăng nhập, đăng xuất và đồng bộ chỉnh sửa profile.

## Bàn giao

- `index.html`, `app.js`, `auth.js`, `firebaseClient.js`, `style.css`: source code;
- `README.md`: hướng dẫn chạy và cấu hình Firebase;
- `Skill.md`: kỹ năng và checklist triển khai;
- `DESIGN.md`: quyết định giao diện.
