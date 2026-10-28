/** Kiểu dữ liệu trả về từ /wp-json/tgs/v1 (WooCommerce tuỳ biến). Giá là chuỗi số, có thể rỗng. */

export type ApiCategory = {
  id: number;
  name: string; // có thể chứa HTML entity, vd "&amp;"
  slug: string;
  parent: number;
  count: number;
};

/** Giá & tồn kho theo từng tỉnh/chi nhánh. price "0" = chi nhánh không bán. */
export type ApiVersion = {
  slug: string;
  name: string;
  sku: string;
  price: string;
  stock_quantity: number;
  backorders: boolean;
};

export type ApiProduct = {
  id: number;
  type: 'simple' | 'variable' | string;
  name: string;
  description: string; // HTML: bảng thông số .tgs-spec-table + các khối thu gọn
  short_description: string;
  url: string;
  image: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  currency: string;
  on_sale: boolean;
  stock_status: 'instock' | 'outofstock' | 'onbackorder' | string;
  manage_stock: boolean;
  stock_quantity: number;
  backorders: boolean;
  category_ids: number[];
  attributes: { name: string; options: string[] }[];
  versions: ApiVersion[];
  /** Chỉ có ở API chi tiết */
  gallery?: string[];
  variations?: unknown[];
};

export type ApiProductPage = {
  items: ApiProduct[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

/** API chi tiết trả { items: [product], total } */
export type ApiProductDetail = { items: ApiProduct[]; total: number };

export type ProductOrderBy = 'date' | 'price' | 'title';
export type ProductQuery = {
  category?: number;
  search?: string;
  orderby?: ProductOrderBy;
  order?: 'asc' | 'desc';
  per_page?: number;
  /** Lọc giá (VNĐ) — server hỗ trợ. */
  min_price?: number;
  max_price?: number;
  /** 1 = chỉ sản phẩm đang khuyến mãi. */
  on_sale?: 1;
  stock_status?: 'instock';
};

/** GET /attributes — nhóm thuộc tính cho bộ lọc (terms là object đánh số, không phải mảng). */
export type ApiAttributeTerm = { id: number; name: string; slug: string; count: number };
export type ApiAttribute = { taxonomy: string; label: string; terms: Record<string, ApiAttributeTerm> | ApiAttributeTerm[] };

/** /stores — phân trang per_page (tối đa 100), lọc province_code. Không có trường địa chỉ riêng. */
export type ApiStore = {
  id: number;
  name: string;
  /** Thường là SĐT, đôi khi là địa chỉ. */
  description: string;
  province_code: string;
  province_name: string; // "Thành phố Hồ Chí Minh", "Tỉnh Nghệ An"...
  district_code: string;
  district_name: string;
  phone: string;
  map_url: string;
  sl_lat: string;
  sl_lng: string;
};

/** Lỗi chuẩn WordPress REST: { code, message, data: { status } } */
export type ApiErrorBody = { code?: string; message?: string; data?: { status?: number } };

export type RegisterInput = { phone: string; password: string; name: string; email?: string };
/** GET /customers/me/summary — số liệu cho tab Tài khoản. */
export type CustomerSummary = {
  id: number;
  name: string;
  phone: string;
  email: string;
  avatar_url: string | null;
  points: number;
  orders: { pending: number; shipping: number; completed: number; to_review: number };
  unread_notifications: number;
};

/** PUT /customers/me */
export type CustomerUpdate = { name?: string; email?: string; gender?: ApiGender };

export type LoginInput = { method: 'password'; login: string; password: string };

/**
 * /auth/check — SĐT đã có tài khoản chưa và đăng nhập bằng cách nào.
 * status: "not_registered" khi chưa có tài khoản (các giá trị khác coi là đã đăng ký).
 */
export type AuthCheckResponse = {
  status: 'not_registered' | string;
  phone: string;
  methods: { password: boolean; otp: boolean };
  multiple_accounts: boolean;
  can_register: boolean;
  message?: string;
};

/** Khách hàng trả kèm phiên đăng nhập (các trường có thể thiếu tuỳ tài khoản). */
export type ApiGender = 'male' | 'female' | 'other';

export type ApiCustomer = {
  id?: number;
  name?: string;
  gender?: ApiGender | null;
  gender_label?: string | null;
  avatar_url?: string | null;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  billing?: { phone?: string; first_name?: string; last_name?: string };
};

/** /auth/login, /auth/otp/verify (và /auth/register nếu trả token). */
export type AuthResponse = {
  user_id?: number;
  token?: string;
  expires_at?: string | number;
  email?: string;
  customer?: ApiCustomer;
  message?: string;
};

/** /auth/otp/request — 404: số chưa có tài khoản, 429: quá giới hạn, 502 tgs_otp_send_failed: Zalo từ chối. */
export type OtpRequestResponse = { success: boolean; expires_in?: number; channel?: 'zalo' | 'sms' | string; message?: string };

/** PUT /auth/password — đổi thành công trả token mới, token cũ bị huỷ ngay. */
export type ChangePasswordResponse = { success: boolean; status?: string; user_id?: number; token?: string; expires_at?: string; message?: string };

/** Ảnh đại diện — POST (multipart, trường "avatar") / DELETE /customers/me/avatar. */
export type AvatarResponse = { status?: string; avatar_url: string | null };

/* ---------- Sổ địa chỉ /customers/me/address-book ---------- */

export type ApiAddressType = 'home' | 'office' | 'other';

export type ApiAddress = {
  id: string;
  name: string;
  phone: string;
  address: string;
  building?: string;
  type: ApiAddressType;
  type_label?: string;
  note?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

/** GET / POST / PUT / DELETE / default đều trả danh sách mới nhất. */
export type ApiAddressBook = { status?: string; items: ApiAddress[]; default_id: string | null; address?: ApiAddress };

export type AddressInput = { name: string; phone: string; address: string; building?: string; type: ApiAddressType; note?: string; is_default?: boolean };

/* ---------- Đặt hàng ---------- */

/** POST /shipping/rates → danh sách phương thức giao (id dùng làm shipping_rate_id). */
export type ApiShippingRate = { id: string; label: string; cost: string; original_cost?: string; taxes?: unknown };

/** GET /payment-methods */
export type ApiPaymentMethod = { id: string; title: string; description?: string; icon?: string | null };
export type ApiPaymentMethods = { items: ApiPaymentMethod[]; default: string | null };

/** Một dòng sản phẩm; version_slug = phiên bản tỉnh/thành của chi nhánh (vd. "ho-chi-minh"). */
export type OrderItemInput = { product_id: number; quantity: number; version_slug?: string };

export type OrderAddressInput = {
  first_name: string;
  last_name?: string;
  phone: string;
  email?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state?: string;
  country: 'VN';
};

export type CreateOrderInput = {
  items: OrderItemInput[];
  billing: OrderAddressInput;
  shipping?: OrderAddressInput;
  shipping_rate_id: string;
  payment_method: string;
  coupon_codes: string[];
  customer_note?: string;
};

/** Phản hồi tạo đơn — đọc mềm vì server có thể bọc trong { order } và đặt tên trường khác nhau. */
export type CreateOrderResponse = {
  id?: number | string;
  order_id?: number | string;
  number?: string;
  order_number?: string;
  status?: string;
  total?: string | number;
  payment_url?: string;
  checkout_payment_url?: string;
  pay_url?: string;
  message?: string;
  order?: CreateOrderResponse;
};

/* ---------- Đơn hàng: GET /orders, GET /orders/{id} ---------- */

/** Dòng sản phẩm — đọc mềm (danh sách chỉ có name/quantity; chi tiết theo chuẩn WooCommerce). */
export type ApiOrderItem = {
  id?: number | string;
  product_id?: number | string;
  name?: string;
  quantity?: number | string;
  price?: number | string;
  regular_price?: number | string;
  subtotal?: number | string;
  total?: number | string;
  image?: string | { src?: string; url?: string } | null;
  image_url?: string;
  /** Phiên bản tỉnh/thành của chi nhánh bán (vd. "nghe-an"). */
  version_slug?: string;
};

export type ApiOrderAddress = { first_name?: string; last_name?: string; phone?: string; address_1?: string; address_2?: string; city?: string; state?: string };

export type ApiOrder = {
  id: number | string;
  number?: string;
  status?: string;
  status_name?: string;
  total?: number | string;
  currency?: string;
  created?: string;
  created_text?: string;
  date_created?: string;
  date_modified?: string;
  date_completed?: string;
  items_count?: number;
  items?: ApiOrderItem[];
  line_items?: ApiOrderItem[];
  billing?: ApiOrderAddress;
  shipping?: ApiOrderAddress;
  shipping_total?: number | string;
  shipping_lines?: { method_title?: string; total?: number | string }[];
  discount_total?: number | string;
  payment_method?: string;
  payment_method_title?: string;
  customer_note?: string;
  store?: { name?: string } | string;
  branch?: { name?: string } | string;
  store_name?: string;
};

export type ApiOrderPage = ApiOrder[] | { items: ApiOrder[]; total?: number; page?: number; total_pages?: number };
