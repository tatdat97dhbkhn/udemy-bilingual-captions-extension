# Udemy Bilingual Captions

Chrome Extension cá nhân (Manifest V3) hiển thị bản dịch tiếng Việt bên dưới phụ đề tiếng Anh gốc của bài học Udemy. Extension không sửa phụ đề gốc, không điều khiển việc phát video và không tải video hay transcript về máy.

## Tính năng

- Dịch caption tiếng Anh đang phát sang tiếng Việt bằng OpenAI API hoặc LibreTranslate tự host.
- Giữ nguyên caption tiếng Anh và hiển thị một dòng tiếng Việt ở overlay bên dưới.
- Lưu cache tối đa 5.000 bản dịch trong `chrome.storage.local`.
- Khi transcript Udemy đang mở, dịch trước các cue transcript mà Udemy đã render trong DOM.
- Gom prefetch theo batch 20 cue, chống gửi trùng và ưu tiên caption đang phát.
- Chống kết quả cũ xuất hiện khi tua video hoặc chuyển bài học.
- Hiển thị diagnostics trong popup: cache hit, prefetch hit, thời gian dịch active và trạng thái transcript.

## Yêu cầu

- Google Chrome.
- Node.js và npm.
- Một OpenAI API key có quyền gọi Chat Completions API, hoặc một máy chủ LibreTranslate bạn tin cậy.
- Bài học Udemy có phụ đề tiếng Anh. Mở transcript để extension có thể dịch trước các cue mà Udemy hiển thị.

## Cài đặt cục bộ

```bash
npm install
npm run build
```

Sau khi build:

1. Mở `chrome://extensions`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked**.
4. Chọn thư mục `dist/` của dự án.
5. Mở một bài học Udemy, nhấn icon extension, chọn nhà cung cấp và lưu cấu hình.

Model mặc định là `gpt-4o-mini`; có thể thay đổi trực tiếp trong popup. Tham khảo [OpenAI Models](https://platform.openai.com/docs/models) và [Chat Completions API](https://platform.openai.com/docs/api-reference/chat).

### LibreTranslate

Chọn **LibreTranslate** trong popup, nhập base URL của máy chủ (ví dụ `http://localhost:5000`) và chọn **Lưu**. Extension sẽ yêu cầu quyền truy cập đúng origin của URL đó; nếu từ chối, cấu hình vẫn được giữ nhưng không có yêu cầu dịch nào được gửi.

LibreTranslate là phần mềm mã nguồn mở có thể tự host, kể cả offline. API key là tùy chọn và chỉ cần nếu instance của bạn yêu cầu. Hãy tự host hoặc chọn một instance bạn tin cậy; dự án không cấu hình sẵn endpoint công cộng miễn phí vì quota, độ sẵn sàng và chính sách CORS không ổn định. Xem [tài liệu LibreTranslate](https://github.com/LibreTranslate/Documentation/blob/main/src/content/docs/guides/api_usage.md).

## Cách dùng để giảm độ trễ

1. Bật phụ đề tiếng Anh trong video Udemy.
2. Mở **Transcript** của bài học.
3. Để transcript tự cuộn theo bài học hoặc cuộn tới khu vực bạn sắp xem.

Extension quan sát các cue transcript đã được Udemy render. Các cue mới sẽ được đưa vào hàng đợi dịch nền theo batch tối đa 20 câu. Khi video phát tới một cue đã có trong cache, overlay hiển thị bản dịch gần như ngay lập tức.

Caption đang phát luôn được xử lý ở hàng ưu tiên cao. Nếu transcript không có, đang đóng hoặc Udemy chưa render cue tương ứng, extension vẫn dịch caption đang phát theo cơ chế thông thường.

> Udemy có thể virtualize transcript: trình duyệt chỉ có một phần cue trong DOM tại một thời điểm. Vì vậy extension chỉ dịch trước phần transcript đang hiện/được render khi cuộn, không gọi endpoint nội bộ hoặc tải toàn bộ transcript.

## Chẩn đoán

Popup có thể hiển thị:

- `Cache`: số caption được phục vụ từ cache.
- `Dịch trước`: số cache hit đến từ prefetch transcript.
- `N ms`: thời gian xử lý caption đang phát gần nhất.
- `Không có transcript để dịch trước`: transcript chưa mở, selector không khớp, hoặc Udemy chưa render cue.

Nếu thấy “Không tìm thấy phụ đề đang hiển thị”, hãy bảo đảm phụ đề tiếng Anh đang bật. Udemy có thể đổi markup; khi đó selector trong content script có thể cần điều chỉnh.

## Quyền riêng tư và dữ liệu

- API key, cấu hình, diagnostics và cache được lưu trong `chrome.storage.local`.
- API key và nội dung caption không được ghi log bởi extension.
- Caption được gửi tới OpenAI hoặc endpoint LibreTranslate do bạn chọn chỉ khi cần dịch hoặc prefetch.
- Extension chỉ đọc caption/transcript mà trang Udemy đã render trong trình duyệt; không sử dụng endpoint nội bộ của Udemy.
- Nút **Clear cache** chỉ xóa cache bản dịch cục bộ.

## Phát triển và kiểm thử

```bash
npm test
npm run build
```

`npm test` chạy Vitest cho chuẩn hóa caption, cache, stale-generation, hàng đợi ưu tiên, batch prefetch và xử lý lỗi. `npm run build` chạy type-check cùng hai bundle Vite cho popup/background và content script.

## Giới hạn

- Chỉ hỗ trợ dịch sang tiếng Việt.
- Chất lượng/tốc độ phụ thuộc model, mạng và giới hạn API OpenAI.
- Prefetch tăng số token API sử dụng khi transcript được mở.
- Không có transcript được render thì không thể dịch trước; overlay vẫn hoạt động với caption hiện tại.
