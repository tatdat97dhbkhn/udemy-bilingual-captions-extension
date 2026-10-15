# Udemy Bilingual Captions

[English](#english) | [Tiếng Việt](#tieng-viet)

<a id="english"></a>

## English

Personal Chrome Extension (Manifest V3) that shows a Vietnamese translation below the original English subtitles in Udemy lessons. The extension does not alter the original subtitles, control video playback, or download videos or transcripts.

### Features

- Translates the currently playing English caption into Vietnamese with the OpenAI API or self-hosted LibreTranslate.
- Preserves the English caption and displays a Vietnamese line in an overlay beneath it.
- Caches up to 5,000 translations in `chrome.storage.local`.
- When the Udemy transcript is open, prefetches transcript cues that Udemy has rendered in the DOM.
- Batches prefetching in groups of 20 cues, avoids duplicate requests, and prioritizes the current caption.
- Prevents stale results from appearing after seeking or changing lessons.
- Shows popup diagnostics: cache hits, prefetch hits, active translation time, and transcript status.

### Requirements

- Google Chrome.
- Node.js and npm.
- An OpenAI API key authorized for the Chat Completions API, or a LibreTranslate server you trust.
- A Udemy lesson with English subtitles. Open the transcript so the extension can prefetch the cues that Udemy renders.

### Local installation

```bash
npm install
npm run build
```

After building:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this project's `dist/` directory.
5. Open a Udemy lesson, click the extension icon, select a provider, and save the configuration.

The default model is `gpt-4o-mini`; you can change it directly in the popup. See [OpenAI Models](https://platform.openai.com/docs/models) and the [Chat Completions API](https://platform.openai.com/docs/api-reference/chat).

#### LibreTranslate

Select **LibreTranslate** in the popup, enter the server's base URL (for example, `http://localhost:5000`), and select **Save settings**. The extension requests access to that URL's origin; if access is denied, the configuration is retained but no translation requests are sent.

LibreTranslate is open-source software that can be self-hosted, including offline. An API key is optional and is needed only when your instance requires one. Self-host or choose an instance you trust; this project does not configure a free public endpoint because quotas, availability, and CORS policies are unreliable. See the [LibreTranslate documentation](https://github.com/LibreTranslate/Documentation/blob/main/src/content/docs/guides/api_usage.md).

### Using it to reduce latency

1. Enable English subtitles in the Udemy video.
2. Open the lesson **Transcript**.
3. Let the transcript follow the lesson or scroll to the section you are about to watch.

The extension observes transcript cues that Udemy has rendered. New cues are added to a background translation queue in batches of up to 20 sentences. When the video reaches a cue already in the cache, the overlay shows its translation almost immediately.

The current caption always has high priority. If the transcript is unavailable, closed, or Udemy has not rendered the matching cue, the extension still translates the current caption as usual.

> Udemy may virtualize the transcript: the browser has only part of the cues in the DOM at one time. Therefore, the extension prefetches only the rendered transcript as you scroll; it does not call Udemy internal endpoints or download the full transcript.

### Diagnostics

The popup can show:

- `Cache`: the number of captions served from the cache.
- `Prefetch hits`: cache hits originating from transcript prefetching.
- `N ms`: the most recent active-caption processing time.
- `No transcript is available for prefetching`: the transcript is not open, the selector does not match, or Udemy has not rendered a cue.

If you see “No subtitles found,” make sure English subtitles are enabled. Udemy may change its markup; if that happens, the selector in the content script may need adjustment.

### Privacy and data

- API keys, configuration, diagnostics, and the cache are stored in `chrome.storage.local`.
- The extension does not log API keys or caption contents.
- Captions are sent to OpenAI or the LibreTranslate endpoint you selected only when translation or prefetching is needed.
- The extension reads only captions and transcript cues that the Udemy page has rendered in the browser; it does not use Udemy internal endpoints.
- The **Clear cache** button deletes only the local translation cache.

### Development and testing

```bash
npm test
npm run build
```

`npm test` runs Vitest tests for caption normalization, cache behavior, stale generations, the priority queue, batch prefetching, and error handling. `npm run build` runs type-checking and the two Vite bundles for the popup/background and content script.

### Limitations

- Only translation into Vietnamese is supported.
- Quality and speed depend on the model, network, and OpenAI API limits.
- Prefetching increases API token usage while the transcript is open.
- If no transcript is rendered, prefetching is not possible; the overlay still works for the current caption.

---

<a id="tieng-viet"></a>

## Tiếng Việt

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
