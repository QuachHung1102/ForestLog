# ForestLog

ForestLog là ứng dụng Android offline-first để kiểm lâm tạo chuyến tuần tra, ghi sự kiện kèm ảnh và GPS, hoàn thành chuyến đi, xem lịch sử, rồi tạo và chia sẻ PDF ngay trên thiết bị.

## Công nghệ

- React Native 0.87 và TypeScript
- SQLite qua `@op-engineering/op-sqlite`
- Camera/thư viện ảnh qua `react-native-image-picker`
- GPS qua `@react-native-community/geolocation`
- Bản đồ và vùng tải trước qua `@maplibre/maplibre-react-native` với OpenFreeMap
- Lưu tệp qua `react-native-file-access`
- Tạo, mở và chia sẻ PDF bằng native Android module

Không có backend, tài khoản hay đồng bộ đám mây. Mạng chỉ cần khi xem hoặc chủ động tải trước nền bản đồ; dữ liệu tuần tra không được tải lên.

## Cài đặt và chạy

Yêu cầu Node.js 22.11+, Android Studio/SDK và một thiết bị hoặc emulator Android.

```sh
npm install
npm start
```

Trong terminal khác:

```sh
npm run android
```

Các kiểm tra cục bộ:

```sh
npx tsc --noEmit
npm run lint
npm test -- --runInBand
```

## Dữ liệu cục bộ

- SQLite là nguồn dữ liệu chính cho khu vực, chuyến tuần tra, sự kiện, metadata ảnh và bản nháp.
- Chỉ một chuyến được phép ở trạng thái đang thực hiện.
- Bản nháp tạo chuyến, hoàn thành chuyến và ghi sự kiện được khôi phục sau khi ứng dụng bị đóng.
- Ảnh được chuyển vào thư mục do ứng dụng quản lý; SQLite chỉ lưu URI ổn định và thứ tự ảnh.
- Khi xóa sự kiện, metadata và tệp ảnh không còn được tham chiếu sẽ được dọn an toàn.

## GPS và quyền thiết bị

GPS được lấy tự động khi mở form ghi nhận. Người dùng có thể thử lại, nhưng GPS thất bại hoặc bị từ chối quyền không chặn việc lưu sự kiện. Camera là hành động chính; thư viện ảnh là tùy chọn. Khi quyền bị từ chối, ứng dụng cho phép mở Settings hoặc tiếp tục mà không có ảnh/GPS.

Từ chuyến đang hoạt động, mở **Bản đồ điểm GPS** và tải trước vùng 8 km quanh vị trí khi còn mạng. Sau khi trạng thái chuyển thành **Đã tải**, nền bản đồ hoạt động từ cache cục bộ; GPS chỉ cập nhật vị trí hiện tại.

## Báo cáo

PDF được tạo hoàn toàn trên Android từ dữ liệu SQLite và ảnh cục bộ. Tên tệp có dạng `ForestLog_YYYY-MM-DD_TKxx_Kx_Lx.pdf`. Sau khi tạo, người dùng có thể mở PDF bằng trình đọc trên máy hoặc chia sẻ qua native share sheet.

## Kiểm tra offline

1. Khi còn mạng, mở bản đồ từ chuyến đang hoạt động và tải vùng 8 km đến khi hiện **Đã tải**.
2. Bật chế độ máy bay rồi tắt hẳn và mở lại ứng dụng.
3. Kiểm tra nền bản đồ, điểm đã lưu và vị trí GPS vẫn hiển thị.
4. Ghi nhiều sự kiện, chụp ảnh và lưu kể cả khi GPS không có.
5. Tiếp tục chuyến đang làm, hoàn thành chuyến, kiểm tra lịch sử và tạo PDF.

## Phạm vi MVP hiện tại

Đã có Home, tạo/khôi phục/hoàn thành chuyến, chọn Tiểu khu → Khoảnh → Lô, tạo/sửa/xóa sự kiện và phiếu quan trắc, nhiều ảnh, GPS tự động, bản đồ có vùng tải trước, lịch sử/chi tiết chỉ đọc, PDF cục bộ và native sharing.

## Giới hạn đã biết

- Android là nền tảng đã được kiểm chứng; iOS chưa có module tạo/chia sẻ PDF tương đương.
- Không theo dõi tuyến đường; quãng đường do người dùng nhập khi hoàn thành chuyến.
- Không có đồng bộ, tài khoản, theo dõi tuyến đường, DOCX, chú thích ảnh hay sắp xếp lại ảnh.
- Lịch sử chưa có tìm kiếm/bộ lọc nâng cao; bổ sung khi dữ liệu thực tế cho thấy cần thiết.
