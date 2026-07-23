# Skill.md · Buổi 5

## Mục tiêu

- Dựng giao diện theo design mẫu: form rõ ràng, trạng thái lỗi/thành công dễ nhận biết.
- Viết validation email, mật khẩu và confirm password trước khi gọi Firebase.
- Tách adapter Firebase khỏi UI để demo local không phụ thuộc credentials.
- Lưu profile theo UID trong Firestore, không lưu mật khẩu ở Firestore/localStorage.
- Kiểm tra thủ công ba user journeys: register → login → profile edit.

## Checklist

- [ ] Email sai định dạng bị chặn trước khi gửi.
- [ ] Password tối thiểu 8 ký tự, có hoa/thường/ký tự đặc biệt.
- [ ] Confirm password phải trùng.
- [ ] Register thành công chuyển về Login.
- [ ] Login thành công mở Profile.
- [ ] Profile edit cập nhật Firestore.
- [ ] Logout xoá phiên demo hoặc gọi Firebase signOut.
- [ ] Không commit private key/service-account credentials.
