# TEST REPORT – Material Master ERP Training

Ngày tạo mã nguồn: 11/11/2026  
Môi trường: mã nguồn được tạo theo đặc tả; chưa kết nối Google Sheets/GAS thật.

| ID | Kịch bản | Trạng thái | Ghi chú |
|---|---|---|---|
| T01 | Desktop/mobile không tràn ngang | CHƯA THỬ | Có breakpoint responsive trong CSS; cần mở trên thiết bị thực |
| T02 | Chọn Thép tấm rồi Bu lông | ĐÃ TRIỂN KHAI / CHƯA THỬ | Form render từ schema JSON |
| T03 | Thép SS400 t20 W2000 L6000 | ĐÃ TRIỂN KHAI / CHƯA THỬ | Hàm sinh tên ở frontend và GAS |
| T04 | Client tự gửi name/code | ĐÃ TRIỂN KHAI / CHƯA THỬ | Payload client không gửi name/code; GAS chỉ nhận thuộc tính và tự sinh |
| T05 | 020, 20.0, 20 chuẩn hóa | ĐÃ TRIỂN KHAI / CHƯA THỬ | Chuẩn hóa số tối đa 3 chữ số thập phân |
| T06 | Trùng hoàn toàn | ĐÃ TRIỂN KHAI / CHƯA THỬ | Frontend so trùng; GAS kiểm tra lại |
| T07 | Bu lông khác cấp bền | ĐÃ TRIỂN KHAI / CHƯA THỬ | strength tham gia identity |
| T08 | PTFE và UHMWPE | ĐÃ TRIỂN KHAI / CHƯA THỬ | compound tham gia identity |
| T09 | Mã lịch sử thiếu thuộc tính | MỘT PHẦN | Frontend đưa cảnh báo tương tự khi có dữ liệu liên quan; cần xác minh thủ công |
| T10 | Nhấn lưu hai lần | MỘT PHẦN | Nút khóa trong lúc request; requestId tạo theo mỗi lần gửi |
| T11 | Gửi lại requestId sau timeout | ĐÃ TRIỂN KHAI / CHƯA THỬ | GAS dò requestId và trả replay; cần test trên GAS thật |
| T12 | Hai client cùng tạo một vật tư | CHƯA THỬ | GAS dùng ScriptLock và kiểm tra trong lock |
| T13 | Hai vật tư khác nhau | CHƯA THỬ | Cần test đồng thời trên GAS |
| T14 | GAS lỗi/timeout | ĐÃ TRIỂN KHAI / CHƯA THỬ | UI hiển thị lỗi; không giả thành công |
| T15 | Schema không khớp | ĐÃ TRIỂN KHAI / CHƯA THỬ | Khóa tạo nếu status không đúng schema |
| T16 | Cấp mã và barcode Code128 | ĐÃ TRIỂN KHAI / CHƯA THỬ | Code128-B, checksum, SVG và print; cần đối chiếu máy quét |
| T17 | GitHub Pages | CHƯA THỬ | Cần deploy repo thực tế |
| T18 | Tắt training mode | ĐÃ TRIỂN KHAI / CHƯA THỬ | Script Property TRAINING_ENABLED |
| T19 | Action lạ | ĐÃ TRIỂN KHAI / CHƯA THỬ | GAS deny-by-default |
| T20 | 10 website cùng GAS/Sheet | CHƯA THỬ | Phải test trên backend được phép, không giả lập PASS |

**Lưu ý:** “Đã triển khai / Chưa thử” có nghĩa là đã viết logic trong mã nguồn nhưng chưa xác minh bằng trình duyệt/GAS/Sheet thật. Không có test nào được tự nhận PASS production.
