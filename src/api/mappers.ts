import { ImageSourcePropType } from 'react-native';

import { AddressInput, ApiAddress, ApiOrder, ApiOrderAddress, ApiOrderItem, ApiShippingRate, CreateOrderResponse, OrderAddressInput, ApiAddressType, ApiCategory, ApiCustomer, ApiGender, ApiProduct, ApiStore } from '@/api/types';
import { decodeEntities, htmlToText, parseSpecTable } from '@/api/html';
import { img } from '@/assets';
import { normalize, Product } from '@/data/mock';
import type { Order, OrderStatus } from '@/data/mock-extra';

const toNumber = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * ApiProduct → Product của app, theo tỉnh/chi nhánh đang chọn (versions[].name, vd "Hồ Chí Minh").
 * - Giá: ưu tiên giá của chi nhánh (> 0), không có thì dùng giá chung.
 * - Tồn kho: theo chi nhánh nếu API có dữ liệu chi nhánh đó, ngược lại theo stock_status chung.
 */
export function toProduct(api: ApiProduct, province?: string): Product {
  // So khớp không dấu: cửa hàng ghi "Hoà Bình", giá sản phẩm ghi "Hòa Bình".
  const key = province ? normalize(province) : '';
  const branch = key ? api.versions?.find((v) => normalize(v.name) === key) : undefined;
  const basePrice = toNumber(api.sale_price) || toNumber(api.price);
  const branchPrice = toNumber(branch?.price);
  const price = branchPrice || basePrice;
  const regular = toNumber(api.regular_price);
  const oldPrice = regular > price ? regular : undefined;

  let stock: number | undefined;
  let sellsAtBranch = true;
  if (branch) {
    sellsAtBranch = branchPrice > 0;
    stock = sellsAtBranch && (branch.stock_quantity > 0 || branch.backorders) ? Math.max(branch.stock_quantity, 1) : 0;
  } else if (api.stock_status === 'outofstock') {
    stock = 0;
  } else if (api.manage_stock && api.stock_quantity > 0) {
    stock = api.stock_quantity;
  }

  const specs = parseSpecTable(api.description ?? '');
  const brand = specs.find((r) => /thương hiệu/i.test(r.label))?.value;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;

  return {
    id: String(api.id),
    name: decodeEntities(api.name),
    image: api.image ? { uri: api.image } : 0,
    noImage: !api.image,
    price,
    oldPrice,
    contactPrice: price === 0,
    brand,
    stock,
    sellsAtBranch,
    badge: discount >= 5 ? { label: `-${discount}%`, tone: 'sale' } : undefined,
    sku: branch?.sku || api.sku,
    versionSlug: branch?.slug,
    provinces: api.versions?.filter((v) => toNumber(v.price) > 0).map((v) => normalize(v.name)),
    url: api.url,
    categoryIds: api.category_ids,
    shortDescription: api.short_description ? htmlToText(api.short_description) : undefined,
    descriptionHtml: api.description,
    gallery: [api.image, ...(api.gallery ?? [])].filter(Boolean).map((uri) => ({ uri })),
  };
}

export type Category = { id: number; name: string; slug: string; parent: number; count: number; children: Category[] };

/** Danh sách phẳng → cây danh mục (bỏ danh mục rỗng và "Chưa phân loại"). */
export function toCategoryTree(list: ApiCategory[]): Category[] {
  const nodes = list
    .filter((c) => c.slug !== 'chua-phan-loai')
    .map((c) => ({ id: c.id, name: prettyName(c.name), slug: c.slug, parent: c.parent, count: c.count, children: [] as Category[] }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots: Category[] = [];
  for (const n of nodes) {
    const parent = n.parent ? byId.get(n.parent) : undefined;
    if (parent) parent.children.push(n);
    else roots.push(n);
  }
  const total = (c: Category): number => c.count + c.children.reduce((s, x) => s + total(x), 0);
  return roots.filter((c) => total(c) > 0).sort((a, b) => total(b) - total(a));
}

/** "BÌNH SỮA" → "Bình sữa"; giữ nguyên tên đã viết thường/hoa đúng. */
const prettyName = (raw: string) => {
  const name = decodeEntities(raw).trim();
  if (name !== name.toUpperCase()) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/* ---------- Cửa hàng ---------- */

export type Store = {
  id: string;
  name: string;
  address: string;
  phone: string;
  /** Tên tỉnh đã chuẩn hoá ("Hồ Chí Minh") — khớp versions[].name của sản phẩm để lấy giá theo chi nhánh. */
  province: string;
  provinceCode: string;
  lat?: number;
  lng?: number;
  mapUrl?: string;
  image: ImageSourcePropType;
  /** Khoảng cách tới vị trí người dùng (km), chỉ có khi đã cấp quyền vị trí. */
  distanceKm?: number;
};

/** "Thành phố Hồ Chí Minh" / "Tỉnh Nghệ An" → "Hồ Chí Minh" / "Nghệ An". */
export const normalizeProvince = (name: string) => name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();

const isPhoneLike = (s: string) => /^[\d\s.+()-]{8,}$/.test(s.trim());

/** Địa chỉ: description (nếu không phải SĐT) → tham số q của link bản đồ → quận + tỉnh. */
function storeAddress(api: ApiStore) {
  const desc = decodeEntities(api.description ?? '').replace(/\|\s*$/, '').trim();
  if (desc && !isPhoneLike(desc) && desc.length > 8) return desc;
  const q = api.map_url?.match(/[?&]q=([^&]+)/)?.[1];
  if (q) {
    try {
      return decodeURIComponent(q.replace(/\+/g, ' '));
    } catch {
      // bỏ qua q lỗi mã hoá
    }
  }
  return [api.district_name, api.province_name].filter(Boolean).join(', ');
}

export function toStore(api: ApiStore): Store {
  const lat = parseFloat(api.sl_lat);
  const lng = parseFloat(api.sl_lng);
  return {
    id: String(api.id),
    name: decodeEntities(api.name).trim(),
    address: storeAddress(api),
    phone: (api.phone || (isPhoneLike(api.description) ? api.description : '')).replace(/\s/g, ''),
    province: normalizeProvince(api.province_name),
    provinceCode: api.province_code,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    mapUrl: api.map_url || undefined,
    // API chưa có ảnh cửa hàng → dùng ảnh mặt tiền trong Figma.
    image: api.id % 2 ? img.store1 : img.store2,
  };
}

/** Khoảng cách đường chim bay (Haversine), km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "0.3 km" / "1,2 km" / "" khi chưa có vị trí. */
export const formatDistance = (km?: number) =>
  km === undefined ? '' : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;

/* ---------- Khách hàng ---------- */

/** Thông tin hồ sơ từ customer của API (bỏ trường rỗng để không ghi đè dữ liệu đang có). */
const GENDER_LABEL: Record<ApiGender, 'Nam' | 'Nữ' | 'Khác'> = { male: 'Nam', female: 'Nữ', other: 'Khác' };
export const genderFromApi = (g?: ApiGender | null) => (g ? GENDER_LABEL[g] : undefined);
export const genderToApi = (label?: string): ApiGender | undefined =>
  (Object.entries(GENDER_LABEL).find(([, v]) => v === label)?.[0] as ApiGender | undefined) ?? undefined;

export function profileFromCustomer(customer?: ApiCustomer, email?: string) {
  const fullName = [customer?.first_name || customer?.billing?.first_name, customer?.last_name || customer?.billing?.last_name].filter(Boolean).join(' ');
  const name = customer?.name || customer?.display_name || fullName;
  const phone = customer?.phone || customer?.billing?.phone;
  const mail = customer?.email || email;
  const gender = genderFromApi(customer?.gender);
  return {
    ...(name ? { name } : {}),
    ...(gender ? { gender } : {}),
    ...(customer?.avatar_url ? { avatar: { uri: customer.avatar_url } } : {}),
    ...(phone ? { phone } : {}),
    ...(mail ? { email: mail } : {}),
  };
}

/* ---------- Sổ địa chỉ ---------- */

export type AddressType = ApiAddressType;

export const ADDRESS_TYPES: { value: AddressType; label: string }[] = [
  { value: 'home', label: 'Nhà riêng' },
  { value: 'office', label: 'Văn phòng' },
  { value: 'other', label: 'Khác' },
];

export type Address = {
  id: string;
  receiver: string;
  phone: string;
  /** Địa chỉ đầy đủ (số nhà, đường, phường, quận, tỉnh) — API lưu dạng một chuỗi. */
  address: string;
  /** Toà nhà / tầng / căn hộ. */
  building?: string;
  type: AddressType;
  typeLabel: string;
  note?: string;
  isDefault: boolean;
};

export const addressTypeLabel = (type: AddressType) => ADDRESS_TYPES.find((t) => t.value === type)?.label ?? 'Khác';

export const toAddress = (api: ApiAddress): Address => ({
  id: String(api.id),
  receiver: decodeEntities(api.name ?? ''),
  phone: api.phone ?? '',
  address: decodeEntities(api.address ?? ''),
  building: api.building ? decodeEntities(api.building) : undefined,
  type: api.type ?? 'other',
  typeLabel: addressTypeLabel(api.type ?? 'other'),
  note: api.note || undefined,
  isDefault: !!api.is_default,
});

export const toAddressInput = (a: Omit<Address, 'id' | 'typeLabel'>): AddressInput => ({
  name: a.receiver.trim(),
  phone: a.phone.replace(/\s/g, ''),
  address: a.address.trim(),
  building: a.building?.trim() ?? '',
  type: a.type,
  note: a.note?.trim() ?? '',
  is_default: a.isDefault,
});

/** "Tầng 5, Lô A chung cư Hà Đô, ..." */
export const formatAddress = (a: Pick<Address, 'address' | 'building'>) => [a.building, a.address].filter(Boolean).join(', ');

/* ---------- Đặt hàng ---------- */

/**
 * Địa chỉ sổ địa chỉ → billing/shipping của đơn. API lưu địa chỉ một chuỗi nên lấy đoạn cuối làm
 * tỉnh/thành ("..., Quận 3, TP Hồ Chí Minh" → "Hồ Chí Minh"); không tách được thì dùng tỉnh của chi nhánh.
 */
export function toOrderAddress(a: Address, fallbackCity: string, email?: string): OrderAddressInput {
  const parts = a.address.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const city = last ? normalizeProvince(last.replace(/^(TP\.?|Tp\.?|Thành phố|Tỉnh)\s+/i, '')) : fallbackCity;
  return {
    first_name: a.receiver.trim(),
    phone: a.phone.replace(/\s/g, ''),
    ...(email ? { email } : {}),
    address_1: a.address.trim(),
    ...(a.building ? { address_2: a.building } : {}),
    city: city || fallbackCity,
    country: 'VN',
  };
}

export type ShippingRate = { id: string; label: string; cost: number; originalCost: number };

export const toShippingRate = (api: ApiShippingRate): ShippingRate => ({
  id: api.id,
  label: decodeEntities(api.label ?? ''),
  cost: Number(api.cost) || 0,
  originalCost: Number(api.original_cost ?? api.cost) || 0,
});

/** Đọc id / mã đơn / link thanh toán từ phản hồi tạo đơn (chấp nhận { order: {...} }). */
export function readCreatedOrder(res: CreateOrderResponse) {
  const o = { ...res, ...(res.order ?? {}) };
  const id = o.id ?? o.order_id;
  return {
    id: id !== undefined ? String(id) : undefined,
    number: o.number ?? o.order_number ?? (id !== undefined ? String(id) : undefined),
    total: o.total !== undefined ? Number(o.total) : undefined,
    paymentUrl: o.payment_url ?? o.checkout_payment_url ?? o.pay_url,
    status: o.status,
  };
}

/* ---------- Đơn hàng ---------- */

/** Trạng thái WooCommerce (GET /orders/statuses) → tab / chip của app. */
const ORDER_STATUS: Record<string, OrderStatus> = {
  pending: 'Chờ xác nhận',
  'on-hold': 'Chờ xác nhận',
  'checkout-draft': 'Chờ xác nhận',
  'branch-oos': 'Chờ xác nhận',
  'ship-fee-declined': 'Chờ xác nhận',
  'come-to-shop': 'Chờ xác nhận',
  processing: 'Đã xác nhận',
  shipping: 'Đang giao',
  delivering: 'Đang giao',
  completed: 'Hoàn thành',
  cancelled: 'Huỷ',
  refunded: 'Huỷ',
  failed: 'Huỷ',
};
/** Trạng thái hiển thị đúng tên gốc của website thay cho nhãn chuẩn. */
const KEEP_LABEL = new Set(['branch-oos', 'ship-fee-declined', 'come-to-shop', 'refunded', 'failed', 'pending']);

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** ISO / "20:56 26/10/2026" → "dd/mm/yyyy hh:mm" (định dạng dùng trong app). */
function toOrderDate(iso?: string, text?: string) {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = iso ? new Date(iso) : undefined;
  if (d && !Number.isNaN(d.getTime())) return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  const m = text?.match(/(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${p(+m[3])}/${p(+m[4])}/${m[5]} ${p(+m[1])}:${m[2]}` : (text ?? '');
}

function toOrderLine(li: ApiOrderItem) {
  const quantity = num(li.quantity) || 1;
  const price = num(li.price) || num(li.total) / quantity || num(li.subtotal) / quantity;
  const regular = num(li.regular_price) || num(li.subtotal) / quantity;
  const src = typeof li.image === 'string' ? li.image : (li.image?.src ?? li.image?.url ?? li.image_url);
  return {
    productId: String(li.product_id ?? ''),
    name: decodeEntities(li.name ?? 'Sản phẩm'),
    image: src ? { uri: src } : 0,
    noImage: !src,
    quantity,
    price: Math.round(price),
    oldPrice: regular > price ? Math.round(regular) : undefined,
    versionSlug: li.version_slug,
  };
}

function toOrderAddressModel(a?: ApiOrderAddress): Address | undefined {
  if (!a || (!a.address_1 && !a.phone)) return undefined;
  const receiver = [a.first_name, a.last_name].filter(Boolean).join(' ');
  return {
    id: 'order',
    receiver: decodeEntities(receiver),
    phone: a.phone ?? '',
    // address_1 thường đã gồm cả tỉnh ("540 Thanh Tân, Lục Nam, Bắc Ninh") → chỉ ghép city khi chưa có.
    address: decodeEntities(a.city && !a.address_1?.includes(a.city) ? [a.address_1, a.city].filter(Boolean).join(', ') : (a.address_1 ?? '')),
    building: a.address_2 ? decodeEntities(a.address_2) : undefined,
    type: 'other',
    typeLabel: 'Khác',
    isDefault: false,
  };
}

const nameOf = (v?: { name?: string } | string) => (typeof v === 'string' ? v : v?.name);

/** ApiOrder (danh sách hoặc chi tiết) → Order của app. */
export function toOrder(api: ApiOrder): Order {
  const raw = String(api.status ?? '').replace(/^wc-/, '');
  const status = ORDER_STATUS[raw] ?? 'Chờ xác nhận';
  const lines = (api.line_items ?? api.items ?? []).map(toOrderLine);
  const shippingFee = num(api.shipping_total) || (api.shipping_lines ?? []).reduce((s, l) => s + num(l.total), 0);
  return {
    id: String(api.id),
    serverId: String(api.id),
    // Website đánh số "453_Nguyễn Nhật Hảo" → hiển thị "453".
    code: (api.number ?? String(api.id)).split('_')[0],
    createdAt: toOrderDate(api.date_created ?? api.created, api.created_text),
    status,
    statusLabel: KEEP_LABEL.has(raw) && api.status_name ? decodeEntities(api.status_name) : undefined,
    lines,
    shippingFee,
    shippingDiscount: 0,
    voucherDiscount: num(api.discount_total),
    payment: api.payment_method_title || (api.payment_method === 'cod' ? 'Tiền mặt khi nhận hàng' : (api.payment_method ?? '')),
    address: toOrderAddressModel(api.shipping) ?? toOrderAddressModel(api.billing),
    storeName: decodeEntities(api.store_name ?? nameOf(api.store) ?? nameOf(api.branch) ?? ''),
    note: api.customer_note || undefined,
    cancelledAt: status === 'Huỷ' ? toOrderDate(api.date_modified) : undefined,
    completedAt: api.date_completed ? toOrderDate(api.date_completed) : undefined,
    total: api.total !== undefined ? num(api.total) : undefined,
    itemsCount: api.items_count,
  };
}
