# Design · WebAuth Studio

## Hướng thị giác

Một “access portal” sáng, kỹ thuật và thân thiện: nền xanh đêm cho phần nhận diện, nền xanh nhạt cho workspace, điểm nhấn lime biểu thị trạng thái đã sẵn sàng.

## Mapping với yêu cầu

| Yêu cầu | Thành phần |
| --- | --- |
| Register | `02 / CREATE ACCOUNT`, bốn trường, validation inline |
| Login | `01 / WELCOME BACK`, email + password |
| Profile | `03 / PROFILE`, avatar chữ cái, display name, phone, logout |
| Firebase | trạng thái `Firebase connected` ở topbar và adapter riêng |
| Feedback | notice màu đỏ/xanh cho lỗi và thành công |

Responsive layout chuyển từ hai cột sang một cột ở màn hình nhỏ; form luôn giữ focus ring và label rõ ràng.
