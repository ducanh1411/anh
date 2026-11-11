# Material Master – ERP Training (Chế độ A)

Ứng dụng thực hành quản lý dữ liệu chủ vật tư cho nhà máy cơ khí, tạo từ đặc tả `DE_BAI_AI_CODING_MATERIAL_MASTER_ERP.md`.

## 1. Chạy thử frontend

- Giải nén thư mục dự án.
- Mở bằng VS Code và chạy Live Server tại `index.html`.
- Ứng dụng mặc định chạy **Demo cục bộ**, có 5 bản ghi minh họa.
- Dữ liệu demo chỉ tồn tại trong phiên trình duyệt; chưa ghi lên Google Sheets.
- Không mở bằng `file://` nếu trình duyệt chặn fetch `config.json`.

## 2. Kết nối Google Sheets riêng (Mode A)

1. Tạo một Google Sheets mới do bạn sở hữu, không dùng Sheet của giảng viên/công ty.
2. Mở **Extensions → Apps Script**.
3. Sao chép toàn bộ `gas/Code.gs` vào `Code.gs`.
4. Chọn hàm `setup` và Run, cấp quyền theo tài khoản của bạn. Hàm tạo các tab `MATERIALS`, `NUMBER_RANGES`, `AUDIT_LOG`.
5. Deploy → New deployment → Web app.
6. Chọn quyền thực thi và phạm vi truy cập phù hợp cho buổi đào tạo. Public endpoint có thể bị người khác gọi trực tiếp; chỉ dùng dữ liệu giả lập, không nhạy cảm.
7. Sao chép URL kết thúc bằng `/exec`.
8. Mở `assets/js/cloud-bridge.js`, thay `const GAS_EXEC_URL = "";` bằng URL của bạn.
9. Lưu, tải lại trang. Ứng dụng gọi `training.status`, kiểm tra schema `erp-attribute-v1`, rồi mới tải danh mục và cho phép tạo mới.

> Nếu GAS đang chạy public, bất kỳ ai biết URL đều có thể gọi action được public. Hãy tắt training mode trong Apps Script khi kết thúc: chạy hàm `disableTraining()` (bạn cần thêm hàm dưới đây) hoặc đổi Script Property `TRAINING_ENABLED` thành `false` trong Project Settings → Script Properties. Không coi URL là bí mật.

## 3. Bật/tắt chế độ đào tạo

Thêm vào cuối `Code.gs`:

```javascript
function disableTraining(){
  PropertiesService.getScriptProperties().setProperty("TRAINING_ENABLED","false");
}
function enableTraining(){
  PropertiesService.getScriptProperties().setProperty("TRAINING_ENABLED","true");
}
```

Chỉ chủ sở hữu Apps Script được thao tác các hàm này trong editor; không có API public bật/tắt.

## 4. Triển khai GitHub Pages

1. Đưa frontend lên repository GitHub riêng: `index.html`, `assets/`, `manifest.webmanifest`, `service-worker.js`, `favicon.svg`.
2. Không cần đưa `gas/Code.gs` lên GitHub Pages nếu không muốn công khai mã backend.
3. Repository → Settings → Pages → Deploy from branch → chọn branch và thư mục root.
4. Mở URL Pages và kiểm tra CSS, JS, JSON, icon.
5. Cấu hình GAS `/exec` trong `cloud-bridge.js` nếu cần tạo dữ liệu dùng chung.
6. Không đưa dữ liệu công ty hoặc thông tin nhạy cảm vào môi trường public.

## 5. Chức năng đã triển khai

- Dashboard, danh mục, tìm kiếm, lọc, phân trang, chi tiết vật tư.
- 4 nhóm và 11 chủng loại theo schema trong phụ lục A.
- Thuộc tính động, chuẩn hóa số, sinh tên tự động, xác thực điều kiện cơ bản.
- Kiểm tra trùng cục bộ và cảnh báo gần giống.
- GAS: kiểm tra lại, chống requestId lặp, ScriptLock, cấp mã A + 6 chữ số, ghi audit.
- Barcode Code 128-B có checksum, tải SVG và in nhãn.
- Responsive desktop/mobile; trạng thái Demo cục bộ / kết nối GAS.

## 6. Giới hạn cần biết

- Bản demo không có đăng nhập/ủy quyền người dùng; `actorName` chỉ là nhãn audit, không xác thực danh tính.
- Không dùng cho ERP sản xuất thực tế.
- Kiểm tra tương tự lịch sử chỉ dựa trên dữ liệu có căn cứ; bản ghi không có `attributesJson` cần xác minh thủ công.
- Backend GAS mẫu cần được kiểm thử trên Sheet riêng trước khi dùng trong lớp. Không có tuyên bố đã kiểm thử production.
- `LockService` chỉ phối hợp các request trong cùng dự án Apps Script.
- Không có tồn kho, mua hàng, BOM, phê duyệt, sửa/xóa vật tư hay quản trị.

## 7. Cấu trúc

```text
material-master-student/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── favicon.svg
├── assets/
│   ├── css/styles.css
│   ├── js/app.js
│   ├── js/cloud-bridge.js
│   ├── js/material-rules.js
│   ├── js/barcode.js
│   └── data/config.json
├── gas/Code.gs
├── README.md
└── TEST_REPORT.md
```
