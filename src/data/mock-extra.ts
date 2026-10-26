import { ImageSourcePropType } from 'react-native';

import type { Address } from '@/api/mappers';
import { img } from '@/assets';

/* ---------- Thông báo ---------- */

export type NotificationItem = {
  id: string;
  type: 'Đơn hàng' | 'Khuyến mãi' | 'Hệ thống';
  title: string;
  body: string;
  time: string;
  read: boolean;
};

export const initialNotifications: NotificationItem[] = [
  { id: 'n1', type: 'Đơn hàng', title: 'Đơn hàng đang được giao', body: 'Đơn #TO2025070601 đang trên đường giao đến bạn. Dự kiến 30 - 45 phút.', time: '5 phút trước', read: false },
  { id: 'n2', type: 'Khuyến mãi', title: 'Flash Sale 12h — giảm đến 50%', body: 'Sữa bột Abbott, Enfamil, Similac giảm sâu chỉ trong hôm nay. Mua ngay!', time: '2 giờ trước', read: false },
  { id: 'n3', type: 'Khuyến mãi', title: 'Bạn nhận được voucher Freeship', body: 'Voucher miễn phí vận chuyển đã được thêm vào ví ưu đãi của bạn.', time: 'Hôm qua', read: true },
  { id: 'n4', type: 'Hệ thống', title: 'Cập nhật phiên bản mới', body: 'Phiên bản 1.0.0 với nhiều cải tiến trải nghiệm mua sắm.', time: '25/08/2026', read: true },
];

/* ---------- Voucher & điểm ---------- */

export type VoucherKind = 'freeship' | 'percent';

export type VoucherDef = {
  id: string;
  code: string;
  title: string;
  kind: VoucherKind;
  /** % giảm hoặc số tiền giảm phí ship */
  value: number;
  maxDiscount: number;
  minOrder: number;
  expiry: string;
  expiryUrgent?: boolean;
  points?: number;
  art: number;
  fullArt?: boolean;
  conditions: string[];
};

export const voucherCatalog: VoucherDef[] = [
  {
    id: 'freeship', code: 'FREESHIP', title: 'Miễn phí vận chuyển', kind: 'freeship', value: 35000, maxDiscount: 35000, minOrder: 0,
    expiry: 'Hết hạn ngày 12/1', art: img.voucherFreeship, fullArt: true,
    conditions: ['Áp dụng cho mọi đơn hàng giao tận nơi.', 'Giảm tối đa 35.000 đ phí vận chuyển.', 'Mỗi khách hàng dùng 1 lần.'],
  },
  {
    id: 'giam10', code: 'TGS10', title: 'Giảm 10%, giảm tối đa 120k', kind: 'percent', value: 10, maxDiscount: 120000, minOrder: 300000,
    expiry: 'Hết hạn ngày 12/1', points: 100, art: img.voucherGiam10,
    conditions: ['Áp dụng cho đơn từ 300.000 đ.', 'Giảm 10%, tối đa 120.000 đ.', 'Không áp dụng cùng chương trình khác.'],
  },
  {
    id: 'giam15', code: 'TGS15', title: 'Giảm 15%, giảm tối đa 180k', kind: 'percent', value: 15, maxDiscount: 180000, minOrder: 500000,
    expiry: 'Hết hạn trong 8 giờ', expiryUrgent: true, points: 150, art: img.voucherGiam15,
    conditions: ['Áp dụng cho đơn từ 500.000 đ.', 'Giảm 15%, tối đa 180.000 đ.', 'Không áp dụng cùng chương trình khác.'],
  },
  {
    id: 'giam20', code: 'TGS20', title: 'Giảm 20%, giảm tối đa 150k', kind: 'percent', value: 20, maxDiscount: 150000, minOrder: 1000000,
    expiry: 'Hết hạn ngày 12/1', points: 200, art: img.voucherGiam20,
    conditions: ['Áp dụng cho đơn từ 1.000.000 đ.', 'Giảm 20%, tối đa 150.000 đ.', 'Không áp dụng cùng chương trình khác.'],
  },
];

export const getVoucher = (id: string) => voucherCatalog.find((v) => v.id === id) ?? voucherCatalog[0];

export type MyVoucher = { voucherId: string; status: 'active' | 'used' | 'expired' };

export const initialMyVouchers: MyVoucher[] = [
  { voucherId: 'freeship', status: 'active' },
  { voucherId: 'giam10', status: 'used' },
  { voucherId: 'giam20', status: 'expired' },
];

export type PointEntry = { id: string; title: string; date: string; amount: number };

export const initialPointHistory: PointEntry[] = [
  { id: 'p1', title: 'Tích điểm đơn hàng #TO2025070601', date: '06/07/2025', amount: 60 },
  { id: 'p2', title: 'Thưởng đăng ký thành viên', date: '01/07/2025', amount: 50 },
  { id: 'p3', title: 'Đổi voucher Giảm 10%', date: '28/06/2025', amount: -100 },
  { id: 'p4', title: 'Tích điểm đơn hàng #TO2025062201', date: '22/06/2025', amount: 90 },
];

export const tiers = [
  { name: 'Mới', min: 0, icon: img.loyaltyMoi, perks: ['Tích 1 điểm cho mỗi 10.000 đ', 'Quà chào mừng thành viên mới'] },
  { name: 'Đồng', min: 100, icon: img.loyaltyDong, perks: ['Tích 1,2 điểm cho mỗi 10.000 đ', 'Voucher sinh nhật 50.000 đ'] },
  { name: 'Bạc', min: 200, icon: img.loyaltyBac, perks: ['Tích 1,5 điểm cho mỗi 10.000 đ', 'Freeship 2 đơn/tháng', 'Voucher sinh nhật 100.000 đ'] },
  { name: 'Vàng', min: 500, icon: img.loyaltyVang, perks: ['Tích 2 điểm cho mỗi 10.000 đ', 'Freeship không giới hạn', 'Ưu tiên giao hàng'] },
  { name: 'Kim cương', min: 1000, icon: img.loyaltyKimCuong, perks: ['Tích 3 điểm cho mỗi 10.000 đ', 'Quà tặng độc quyền', 'Tư vấn dinh dưỡng riêng'] },
];

/* ---------- Địa chỉ & thanh toán ---------- */

/** Địa chỉ mẫu cho các đơn hàng demo (đơn thật lưu bản chụp địa chỉ lúc đặt). */
const demoAddresses: Address[] = [
  { id: 'a1', receiver: 'Phạm Tường', phone: '0902524586', address: 'Chung Cư Hà Đô, Nguyễn Văn Công, Phường Hạnh Thông, Quận Gò Vấp, Thành phố Hồ Chí Minh', type: 'home', typeLabel: 'Nhà riêng', isDefault: true },
  { id: 'a2', receiver: 'Phạm Tường', phone: '0902524586', address: '736 Nguyễn Kiệm, Phường Đức Nhuận, Quận Phú Nhuận, Thành phố Hồ Chí Minh', type: 'office', typeLabel: 'Văn phòng', isDefault: false },
];

export type Card = { id: string; brand: 'visa' | 'mastercard'; holder: string; number: string; expiry: string; isDefault: boolean };

export const initialCards: Card[] = [{ id: 'c1', brand: 'visa', holder: 'PHAM TUONG', number: '4111111111114242', expiry: '12/28', isDefault: true }];

export const maskCard = (n: string) => `**** **** **** ${n.slice(-4)}`;

/* ---------- Đơn hàng ---------- */

export type OrderStatus = 'Chờ xác nhận' | 'Đang giao' | 'Hoàn thành' | 'Đánh giá' | 'Huỷ';
/** Lưu tên & ảnh tại thời điểm đặt để đơn cũ vẫn hiển thị đúng khi sản phẩm thay đổi. */
export type OrderLine = { productId: string; name: string; image: ImageSourcePropType; quantity: number; price: number; oldPrice?: number };

export type Order = {
  id: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  lines: OrderLine[];
  shippingFee: number;
  shippingDiscount: number;
  voucherDiscount: number;
  payment: string;
  /** id đơn trên website (đơn tạo qua POST /orders). */
  serverId?: string;
  /** Bản chụp địa chỉ nhận lúc đặt (địa chỉ trong sổ có thể bị sửa / xoá sau đó). */
  address?: Address;
  /** Tên cửa hàng xử lý đơn (lưu lúc đặt). */
  storeName: string;
  note?: string;
  reviewed?: boolean;
  cancelReason?: string;
};

export const initialOrders: Order[] = [
  {
    id: 'o1', code: 'TO2025070601', createdAt: '06/07/2025 09:41', status: 'Đang giao',
    lines: [
      { productId: '20271', name: 'Sữa bột Nutricare GluGold 850g', image: { uri: 'https://thegioisua.com/wp-content/uploads/2026/09/11111111111.png' }, quantity: 1, price: 529000 },
      { productId: '19878', name: 'Sữa bột Coloscare 24h 2+ 800g', image: { uri: 'https://thegioisua.com/wp-content/uploads/2026/09/zzzzzzzzz.png' }, quantity: 1, price: 470000 },
    ],
    shippingFee: 35000, shippingDiscount: 35000, voucherDiscount: 0, payment: 'Ví điện tử', address: demoAddresses[0], storeName: 'Thế Giới Sữa Huỳnh Văn Bánh',
  },
  {
    id: 'o2', code: 'TO2025062201', createdAt: '22/06/2025 18:20', status: 'Hoàn thành',
    lines: [{ productId: '11687', name: 'Sữa bột Similac Mom hương vani 900g', image: { uri: 'https://thegioisua.com/wp-content/uploads/2026/08/sua-bot-similac-mom-huong-vani-900g-1.webp' }, quantity: 2, price: 489000 }],
    shippingFee: 35000, shippingDiscount: 35000, voucherDiscount: 0, payment: 'Tiền mặt khi nhận hàng', address: demoAddresses[0], storeName: 'Thế Giới Sữa Hoa Lan',
  },
  {
    id: 'o3', code: 'TO2025061502', createdAt: '15/06/2025 10:05', status: 'Huỷ',
    lines: [{ productId: '13139', name: 'Khăn ướt Goo:by cao cấp 100 tờ', image: { uri: 'https://thegioisua.com/wp-content/uploads/2026/10/xxxxxxxxx.png' }, quantity: 3, price: 40000 }],
    shippingFee: 35000, shippingDiscount: 0, voucherDiscount: 0, payment: 'Tiền mặt khi nhận hàng', address: demoAddresses[1], storeName: 'Thế Giới Sữa Hoa Lan',
    cancelReason: 'Thay đổi địa chỉ giao hàng',
  },
];

export const cancelReasons = [
  'Muốn thay đổi sản phẩm',
  'Thay đổi địa chỉ giao hàng',
  'Tìm thấy giá rẻ hơn',
  'Đặt nhầm',
  'Lý do khác',
] as const;

export const reviewTags = ['Sản phẩm chính hãng', 'Giao hàng nhanh', 'Đóng gói cẩn thận', 'Giá tốt', 'Nhân viên thân thiện'] as const;

export const quickNotes = ['Giao giờ hành chính', 'Gọi trước khi giao', 'Để hàng ở lễ tân', 'Không bấm chuông'] as const;

/* ---------- Hỗ trợ ---------- */

export const faqs = [
  { q: 'Làm sao để đặt hàng trên ứng dụng?', a: 'Chọn sản phẩm → Thêm vào giỏ → Bấm "Đặt hàng", chọn địa chỉ, phương thức thanh toán và xác nhận đơn.' },
  { q: 'Thời gian giao hàng bao lâu?', a: 'Giao Nhanh trong 1-2 ngày; Hoả tốc trong 4 giờ với các khu vực nội thành có cửa hàng gần bạn.' },
  { q: 'Tôi có thể đổi trả sản phẩm không?', a: 'Bạn được đổi trả miễn phí trong 30 ngày nếu sản phẩm còn nguyên tem, hộp. Hoàn tiền 200% nếu phát hiện hàng giả.' },
  { q: 'Điểm thưởng được tích như thế nào?', a: 'Mỗi 10.000 đ chi tiêu được tích 1 điểm (tuỳ hạng thành viên). Điểm dùng để đổi voucher trong mục Ưu đãi.' },
  { q: 'Làm sao để huỷ đơn hàng?', a: 'Vào Tài khoản → Đơn hàng của tôi → chọn đơn ở trạng thái "Chờ xác nhận" và bấm "Huỷ đơn".' },
];

export const termsSections = [
  { title: '1. Phạm vi áp dụng', body: 'Điều khoản này áp dụng cho mọi khách hàng sử dụng ứng dụng Thế Giới Sữa để mua sắm sản phẩm sữa, mẹ & bé và các sản phẩm dinh dưỡng.' },
  { title: '2. Tài khoản', body: 'Khách hàng chịu trách nhiệm bảo mật thông tin đăng nhập. Thế Giới Sữa không yêu cầu cung cấp mã OTP qua bất kỳ kênh nào khác ngoài ứng dụng.' },
  { title: '3. Đặt hàng & thanh toán', body: 'Giá sản phẩm hiển thị đã bao gồm VAT. Đơn hàng được xác nhận khi cửa hàng tiếp nhận. Khách hàng có thể thanh toán bằng tiền mặt, ví điện tử hoặc thẻ.' },
  { title: '4. Giao hàng & đổi trả', body: 'Thời gian giao hàng phụ thuộc vào phương thức vận chuyển. Sản phẩm được đổi trả trong 30 ngày theo chính sách đổi trả.' },
  { title: '5. Bảo mật thông tin', body: 'Thông tin cá nhân của khách hàng chỉ được sử dụng để xử lý đơn hàng và chăm sóc khách hàng, không chia sẻ cho bên thứ ba.' },
];
