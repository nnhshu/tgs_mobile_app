import { ImageSourcePropType } from 'react-native';

import { img } from '@/assets';

/** Model sản phẩm của app (map từ API qua src/api/mappers.ts) + nội dung tĩnh theo Figma. */
export type Product = {
  id: string;
  name: string;
  image: ImageSourcePropType;
  price: number;
  oldPrice?: number;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  stock?: number;
  /** Chip góc ảnh: "-15%", "Mới"... */
  badge?: { label: string; tone: 'sale' | 'new' };
  /** Giá hiển thị màu đen (thẻ "Trà Trái Cây" trong Figma) thay vì màu cam. */
  plainPrice?: boolean;
  /** Không có ảnh — hiển thị ảnh placeholder ("02_Không có hình ảnh"). */
  noImage?: boolean;

  /* ---- Các trường lấy từ API thegioisua.com ---- */
  sku?: string;
  url?: string;
  categoryIds?: number[];
  shortDescription?: string;
  descriptionHtml?: string;
  gallery?: ImageSourcePropType[];
  /** Phiên bản tỉnh/thành của chi nhánh đang chọn — gửi khi đặt hàng (version_slug). */
  versionSlug?: string;
  /** Giá chưa công bố (API trả price rỗng) → hiển thị "Liên hệ". */
  contactPrice?: boolean;
  /** Chi nhánh/tỉnh đang chọn có bán sản phẩm này không. */
  sellsAtBranch?: boolean;
};

/** Danh mục trên Home (icon theo Figma) → id danh mục WordPress tương ứng. */
export const homeCategories = [
  { label: 'Sữa bột', icon: img.catSuaBot, size: { w: 38, h: 40 }, categoryId: 64 },
  { label: 'Sữa nước', icon: img.catSuaNuoc, size: { w: 40, h: 40 }, categoryId: 65 },
  { label: 'Sữa đặc biệt', icon: img.catSuaDacBiet, size: { w: 40, h: 40 }, categoryId: 66 },
  { label: 'Theo nhu cầu', icon: img.catNhuCau, size: { w: 40, h: 40 }, categoryId: 210 },
  { label: 'Mẹ & Bé', icon: img.catMeBe, size: { w: 41, h: 40 }, categoryId: 205 },
  { label: 'Yến sào', icon: img.catYenSao, size: { w: 38, h: 40 }, categoryId: 70 },
  { label: 'Khuyến mãi', icon: img.catKhuyenMai, size: { w: 39, h: 40 }, categoryId: undefined },
  { label: 'Thương hiệu', icon: img.catThuongHieu, size: { w: 44, h: 40 }, categoryId: undefined },
  { label: 'Cửa hàng', icon: img.catCuaHang, size: { w: 39, h: 40 }, categoryId: undefined },
];

export const collections = [
  { title: 'Tung Deal toàn sàn, Freeship 0 đ', image: img.collection1 },
  { title: 'Giảm tới 50% — sữa bột cho bé', image: img.collection0 },
  { title: 'FREESHIP với bán kính 5km cho đơn 2 triệu', image: img.collection2 },
];

export const brands = [
  { name: 'Bobby - Thương hiệu tã trẻ em số 1 Nhật Bản', bg: img.brandBg1, logo: img.brandLogo1, logoFit: 'cover' as const },
  { name: 'Vinamilk - Thương hiệu sữa hàng đầu Việt Nam', bg: img.brandBg2, logo: img.brandLogo2, logoFit: 'contain' as const },
  { name: 'Vinamilk - Thương hiệu sữa hàng đầu Việt Nam', bg: img.brandBg3, logo: img.brandLogo3, logoFit: 'cover' as const },
];

/** "Danh mục đang hot" (ảnh theo Figma) → id danh mục WordPress; không có danh mục riêng thì tìm theo từ khoá. */
const HOT: [string, number | string][] = [
  ['Sữa cho bé', 19], ['Sữa người lớn', 284], ['Sữa pha sẵn', 39], ['Sữa hạt', 51], ['Sữa tươi', 44], ['Sữa trái cây', 52],
  ['Sữa mẹ bầu', 53], ['Sữa tiểu đường', 55], ['Sữa người già', 217], ['Sữa tăng cân', 'tăng cân'], ['Váng sữa', 218], ['Đồ dùng mẹ', 205],
  ['Tã quần bé', 58], ['Tã dán bé', 74], ['Miếng lót', 76], ['Tã người lớn', 79], ['Bình sữa', 225], ['Yến sào', 70],
];

export const hotCategories = HOT.map(([label, target], i) => ({
  label,
  image: i === 10 ? img.hot[0] : img.hot[i < 10 ? i : i - 1],
  categoryId: typeof target === 'number' ? target : undefined,
  search: typeof target === 'string' ? target : undefined,
}));

export const user = {
  name: 'Tường Phạm',
  phone: '0902524588',
  points: 100,
  tier: 'Thành viên Bạc',
  memberCode: 'M1610200459',
  address: {
    receiver: 'Phạm Tường',
    phone: '(+84) 902 524 586',
    line1: 'Chung Cư Hà Đô, Nguyễn Văn Công',
    line2: 'Phường Hạnh Thông, Thành phố Hồ Chí Minh',
  },
};

/** Bỏ dấu tiếng Việt để tìm kiếm "sua bot" vẫn khớp "Sữa bột". */
export const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

export const popularSearches = ['Sữa non', 'Sữa hạt', 'Sữa Organic'];
