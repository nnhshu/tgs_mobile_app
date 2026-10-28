# Thế Giới Sữa — Mobile App

Ứng dụng React Native (Expo SDK 57 + TypeScript + Expo Router) dựng theo Figma
[Thế Giới Sữa App](https://www.figma.com/design/SZEpzo31ljlw0lu0p5FGjO/Th%E1%BA%BF-Gi%E1%BB%9Bi-S%E1%BB%AFa-App?node-id=2634-34864).

## Chạy dự án

```bash
npm install
npx expo start        # bấm i (iOS Simulator) / a (Android) hoặc quét QR bằng Expo Go
```

Yêu cầu Node `^20.19.4` hoặc `>=22.13`.

Nếu sửa code mà app không cập nhật (watchman bị hỏng, `watchman --version` báo lỗi thư viện), chạy:

```bash
METRO_NO_WATCHMAN=1 npx expo start --clear
```
hoặc sửa watchman: `brew reinstall watchman`.

## Cấu trúc

```
src/
  app/                 # màn hình (Expo Router)
    index.tsx          # Splash
    (tabs)/            # Trang chủ, Sản phẩm, Ưu đãi, Tài khoản + tab bar
    product/[id].tsx   # Chi tiết sản phẩm
    cart.tsx, checkout.tsx, order-success.tsx
    login.tsx, otp.tsx
  components/          # UI dùng chung (Button, ProductCard, TabBar, VoucherCard...)
  theme/               # màu, font, typography từ Figma
  data/mock.ts         # dữ liệu mẫu — thay bằng API thật
  store/app-store.tsx  # trạng thái giỏ hàng + đăng nhập (React Context)
  assets.ts            # map toàn bộ ảnh/icon export từ Figma
assets/figma/          # ảnh & SVG tải từ Figma
```

## Các màn hình (`src/app`)

| Nhóm | Route |
|---|---|
| Splash, Đăng nhập, OTP | `index`, `login`, `otp` |
| Tab | `(tabs)/index` (Trang chủ), `products`, `offers`, `account` |
| Sản phẩm | `product/[id]`, `product-list` (lọc + sắp xếp), `search` |
| Cửa hàng | `stores`, `stores/[id]` |
| Mua hàng | `cart`, `vouchers`, `checkout`, `payment-processing`, `order-success`, `order-failed` |
| Địa chỉ & thanh toán | `addresses`, `addresses/form`, `payment-methods`, `cards/form` |
| Đơn hàng | `orders`, `orders/[id]`, `orders/review` |
| Ưu đãi & điểm | `voucher/[id]`, `my-vouchers`, `membership`, `points-history` |
| Tài khoản | `profile-edit`, `account-security`, `notifications`, `help`, `terms`, `about` |

## API (WordPress)

App lấy dữ liệu sản phẩm từ `https://thegioisua.com/wp-json/tgs/v1` (đổi bằng `EXPO_PUBLIC_API_URL`, xem `.env.example`):

| Endpoint | Dùng ở |
|---|---|
| `GET /categories` | Tab Sản phẩm (menu trái, danh mục con), chip danh mục trong danh sách |
| `GET /products?per_page&page&category&search&orderby&order` | Home, danh sách, tìm kiếm, sản phẩm tương tự — phân trang vô hạn |
| `GET /products/{id}` | Chi tiết sản phẩm (gallery, mô tả, bảng thông số) |
| `GET /stores?per_page=100&page` | Danh sách / chi tiết cửa hàng, chọn cửa hàng, "Cửa hàng gần bạn" — tải đủ các trang, sắp theo khoảng cách GPS |
| `POST /auth/register` `{ phone, password, name, email? }` | Màn Đăng ký — có token thì đăng nhập luôn, không có thì tự gọi `/auth/login` |
| `POST /auth/check` `{ phone }` | Bước 1 của Đăng nhập: `not_registered` → Đăng ký; `methods.password` → nhập mật khẩu; chỉ `methods.otp` → gửi OTP |
| `POST /auth/otp/request` `{ phone }` | Gửi mã OTP: 404 → Đăng ký, 429/502 → hiện thông báo server |
| `POST /auth/otp/verify` `{ phone, code }` | Màn OTP (6 số, đếm ngược hạn mã & gửi lại) |
| `POST /auth/login` `{ method: "password", login, password }` | Đăng nhập bằng mật khẩu (401 `tgs_invalid_credentials`) |
| `POST /auth/register/otp` `{ phone }` → `POST /auth/register/verify` `{ phone, code }` | Lần đầu đăng nhập: SĐT chưa có tài khoản nhận OTP, xác thực xong là có tài khoản + đăng nhập (409 `tgs_phone_taken` → chuyển sang OTP đăng nhập) |
| `POST /auth/logout` | Gọi khi đăng xuất (Bearer token) |
| `PUT /auth/password` `{ current_password, new_password }` | Tài khoản & Mật khẩu → Đổi mật khẩu (tối thiểu 8 ký tự). Trả token mới, token cũ bị huỷ → app lưu token mới |
| `GET /customers/me/summary` | Tab Tài khoản — tên, SĐT, điểm, số đơn theo trạng thái (kéo xuống để làm mới) |
| `GET /customers/me` | Màn Thông tin cá nhân |
| `PUT /customers/me` `{ name, email, gender }` | Lưu Thông tin cá nhân — chỉ gửi trường đã đổi; gender: `male` / `female` / `other` |
| `POST /customers/me/avatar` (multipart, trường `avatar`) | Đổi ảnh đại diện ở tab Tài khoản (chụp / chọn ảnh) |
| `DELETE /customers/me/avatar` | Xoá ảnh đại diện |
| `GET /customers/me/address-book` | Sổ địa chỉ; địa chỉ đang chọn dùng ở Trang chủ, Chi tiết sản phẩm, Checkout |
| `POST /customers/me/address-book` `{ name, phone, address, building, type, note, is_default }` | Thêm địa chỉ; type: `home` / `office` / `other` |
| `PUT /customers/me/address-book/{id}` | Sửa địa chỉ |
| `DELETE /customers/me/address-book/{id}` | Xoá địa chỉ |
| `POST /customers/me/address-book/{id}/default` | Đặt địa chỉ mặc định |
| `GET /orders?per_page=20&page=n` | Đơn hàng của tôi (tải thêm khi cuộn). Danh sách chỉ có id/number/status/total/created → mỗi thẻ tự lấy chi tiết để hiện sản phẩm |
| `GET /orders/{id}` | Chi tiết đơn: billing/shipping, items (product_id, name, quantity, total, version_slug). Ảnh sản phẩm lấy từ `/products/{id}`; chi nhánh suy từ `version_slug` |
| `GET /orders/statuses` | Trạng thái WooCommerce → tab: pending/on-hold → Chờ xác nhận, processing → Đã xác nhận, completed → Hoàn thành, cancelled/refunded/failed → Huỷ |
| `GET /attributes` | Bộ lọc sản phẩm — Thương hiệu (`product_brand`), Danh mục (`product_cat`); nhóm khác hiện chưa có giá trị |
| `GET /products?category=&min_price=&max_price=&on_sale=1&stock_status=instock` | Lọc phía server (danh mục 1 id/lần, giá, khuyến mãi, còn hàng). Thương hiệu & Nơi bán lọc trên máy vì API chưa có tham số |
| `POST /shipping/rates` `{ items, shipping }` | Checkout — danh sách phương thức giao + phí (id dùng làm `shipping_rate_id`) |
| `GET /payment-methods` | Checkout — phương thức thanh toán (COD, VietQR) |
| `POST /orders` `{ items[{product_id, quantity, version_slug}], billing, shipping, shipping_rate_id, payment_method, coupon_codes, customer_note }` | Đặt hàng (màn "Đang xử lý"). `version_slug` = phiên bản tỉnh của chi nhánh đang chọn; server trả link thanh toán thì app mở trình duyệt |

Voucher trong app đang là dữ liệu mẫu và bị tắt (`VOUCHERS_ENABLED` trong `src/store/app-store.tsx`) vì website chưa có coupon — đơn gửi `coupon_codes: []`.

Các API cần đăng nhập gửi `Authorization: Bearer {token}`. Nếu server trả 401 (token hết hạn / đã bị thu hồi), app tự đăng xuất và báo "Phiên đăng nhập đã hết hạn". Lưu ý: server chỉ giữ **một phiên cho mỗi tài khoản** — đăng nhập ở máy khác sẽ đăng xuất máy cũ. Lỗi 4xx không được thử lại. Màn Nhật ký API lọc sẵn qua deep link `/api-logs?filter=error`.

Code: `src/api/` (`client.ts` gọi HTTP, `types.ts` kiểu dữ liệu, `mappers.ts` chuyển sang model app, `html.ts` tách bảng thông số/mô tả, `hooks.ts` React Query).

- **Giá & tồn kho theo chi nhánh**: lấy từ `versions[]` theo tỉnh của cửa hàng đang chọn (so khớp không dấu với `province_name` của `/stores`, mặc định Hồ Chí Minh). Đổi cửa hàng → giá trong giỏ cập nhật theo.
- Giá rỗng → hiển thị "Liên hệ". Thương hiệu, xuất xứ... đọc từ bảng `tgs-spec-table` trong `description`.
- Phiên đăng nhập (token + `expires_at`) lưu bằng expo-secure-store, hết hạn thì tự đăng xuất khi mở app.
- Chưa gắn: khách hàng (`/customers/me`), địa chỉ, đặt hàng, đơn hàng, khuyến mãi (server đã có route `/customers/me`, `/orders`, `/shipping/rates`, `/promotions`...). Voucher, điểm, đánh giá vẫn dùng dữ liệu mẫu.

### Theo dõi API (log)

Bật sẵn ở bản dev (hoặc đặt `EXPO_PUBLIC_API_LOG=1`). Mật khẩu, token, mã OTP được che (vd. `pa••••••rd`).

- **Terminal chạy `npx expo start`**: mỗi request in 2 dòng
  - `[API] → POST /auth/login {"login":"0901234567","password":"12••••78"}`
  - `[API] ← 200 POST /auth/login (312ms) có token` hoặc `[API] ✕ 401 POST /auth/login (280ms) [tgs_invalid] Thông tin đăng nhập không đúng.`
- **Trong app**: Tài khoản → Hỗ trợ → **Nhật ký API (dev)** (route `/api-logs`): 200 request gần nhất, lọc Lỗi / Đang chạy / Thành công, bấm để xem body & response, giữ để sao chép.
- Code: `src/api/logger.ts`; mọi lời gọi đi qua `request()` trong `src/api/client.ts`.

## Dữ liệu demo

- Thẻ có số kết thúc bằng `0000` sẽ bị từ chối thanh toán → màn "Đặt hàng thất bại".
- Sản phẩm lấy từ API thật; trạng thái hết hàng theo tồn kho chi nhánh đang chọn.
- Dữ liệu mẫu (cửa hàng, đơn hàng, voucher...) nằm trong `src/data`, state trong `src/store/app-store.tsx` (chưa lưu khi tắt app).

## Ghi chú

- Font trong Figma là **Inter Display** (không có trên Google Fonts) — app dùng **Inter** thay thế.
- Đăng nhập/OTP là giả lập: nhập SĐT 10 số bắt đầu bằng 0, OTP bất kỳ 4 số.
