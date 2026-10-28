import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { ImageSourcePropType } from 'react-native';

import { logoutRemote } from '@/api/client';
import { queryClient } from '@/api/query-client';
import { Store, toProduct } from '@/api/mappers';
import { ApiProduct } from '@/api/types';
import { Product } from '@/data/mock';
import {
  Card,
  getVoucher,
  initialCards,
  initialMyVouchers,
  initialNotifications,
  initialPointHistory,
  MyVoucher,
  NotificationItem,
  Order,
  PointEntry,
  VoucherDef,
} from '@/data/mock-extra';

/** raw: dữ liệu API gốc — giữ lại để tính lại giá/tồn kho khi đổi chi nhánh. */
export type CartItem = {
  product: Product;
  quantity: number;
  selected: boolean;
  variant?: string;
  raw?: ApiProduct;
  /** Giá & cửa hàng lúc thêm vào giỏ — để báo "Giá đã đổi" / "Cửa hàng đã đổi" (Figma Giỏ hàng). */
  addedPrice?: number;
  addedStoreId?: string;
};
/** id phương thức thanh toán của API (cod, vietqr_gateway...) hoặc thẻ đã lưu `card:<id>`. */
export type PaymentMethod = string;
export type Profile = { name: string; phone: string; email: string; birthday: string; gender: 'Nam' | 'Nữ' | 'Khác'; avatar?: ImageSourcePropType | { uri: string } };

const SESSION_KEY = 'tgs.auth.session';

/** expires_at có thể là timestamp (giây/ms) hoặc chuỗi ngày → ms. */
const parseExpiry = (v?: string | number) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
  const t = Date.parse(String(v).replace(' ', 'T'));
  return Number.isFinite(t) ? t : undefined;
};
/** Tỉnh mặc định khi chưa chọn cửa hàng. */
export const DEFAULT_PROVINCE = 'Hồ Chí Minh';

const EMPTY_PROFILE: Profile = { name: '', phone: '', email: '', birthday: '', gender: 'Khác' };

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return { date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, code: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` };
};


/** Giảm giá voucher cho tổng tiền hàng; trả về 0 nếu chưa đủ điều kiện. */
export function voucherDiscount(voucher: VoucherDef | undefined, merchandiseTotal: number, shippingFee: number) {
  if (!voucher || merchandiseTotal < voucher.minOrder) return { items: 0, shipping: 0 };
  if (voucher.kind === 'freeship') return { items: 0, shipping: Math.min(shippingFee, voucher.maxDiscount) };
  return { items: Math.min(Math.round((merchandiseTotal * voucher.value) / 100), voucher.maxDiscount), shipping: 0 };
}

function useAppState() {
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [cartState, setCart] = useState<CartItem[]>([]);
  const [viewed, setViewed] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState(['Sữa bột Similac', 'Sữa tăng cân', 'Bình sữa Pigeon']);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cards, setCards] = useState<Card[]>(initialCards);
  // Đánh giá đơn (số sao theo id đơn) — API chưa có endpoint đánh giá nên lưu trong app.
  const [orderReviews, setOrderReviews] = useState<Record<string, number>>({});
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>(initialMyVouchers);
  const [points, setPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState<PointEntry[]>(initialPointHistory);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  /** Cửa hàng đang chọn (từ API /stores) — quyết định giá & tồn kho theo tỉnh. */
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  /** Phiên đăng nhập từ API (token lưu SecureStore để giữ đăng nhập khi mở lại app). */
  const [token, setToken] = useState<string | null>(null);

  // Khôi phục phiên đã lưu (bỏ qua nếu token đã hết hạn).
  useEffect(() => {
    SecureStore.getItemAsync(SESSION_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as { token: string; expiresAt?: number; profile?: Partial<Profile> };
        if (saved.expiresAt && saved.expiresAt < Date.now()) {
          SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
          return;
        }
        setToken(saved.token);
        if (saved.profile) setProfile((p) => ({ ...p, ...saved.profile }));
        setLoggedIn(true);
      })
      .catch(() => {});
  }, []);
  // Nháp checkout — các màn chọn địa chỉ / thanh toán / voucher / ghi chú ghi vào đây.
  // Địa chỉ nhận chọn cho đơn hiện tại ('' = dùng địa chỉ mặc định trong sổ địa chỉ).
  const [addressId, setAddressId] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [appliedVoucherId, setAppliedVoucherId] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const province = selectedStore?.province ?? DEFAULT_PROVINCE;
  // Giá & tồn kho trong giỏ luôn theo chi nhánh đang chọn.
  const cart = useMemo(
    () => cartState.map((i) => (i.raw ? { ...i, product: toProduct(i.raw, province) } : i)),
    [cartState, province],
  );

  return useMemo(() => {
    const updateCart = (id: string, fn: (item: CartItem) => CartItem) =>
      setCart((items) => items.map((item) => (item.product.id === id ? fn(item) : item)));

    return {
      /* auth & profile */
      isLoggedIn,
      token,
      /** Lưu phiên từ API (/auth/login, /auth/otp/verify, /auth/register). */
      setSession: (newToken: string, patch?: Partial<Profile>, expiresAt?: string | number) => {
        setToken(newToken);
        setLoggedIn(true);
        if (patch) setProfile((p) => ({ ...p, ...patch }));
        const expires = parseExpiry(expiresAt);
        // Giữ hồ sơ đang có khi chỉ đổi token (vd. sau đổi mật khẩu).
        SecureStore.setItemAsync(SESSION_KEY, JSON.stringify({ token: newToken, expiresAt: expires, profile: { ...profile, ...patch } })).catch(() => {});
      },
      logout: () => {
        if (token) logoutRemote(token);
        setLoggedIn(false);
        setToken(null);
        // Không để lộ dữ liệu của người dùng trước cho người đăng nhập sau.
        setProfile(EMPTY_PROFILE);
        setPoints(0);
        queryClient.removeQueries({ queryKey: ['customer'] });
        SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
        setAppliedVoucherId(null);
        setAddressId('');
      },
      profile,
      updateProfile: (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })),

      /* cart */
      cart,
      cartCount: cart.length,
      addToCart: (product: Product, quantity = 1, variant?: string, raw?: ApiProduct) =>
        setCart((items) => {
          const existing = items.find((item) => item.product.id === product.id);
          if (existing) {
            return items.map((item) =>
              item === existing
                ? { ...item, quantity: item.quantity + quantity, selected: true, variant: variant ?? item.variant, raw: raw ?? item.raw, addedPrice: product.price, addedStoreId: selectedStore?.id }
                : item,
            );
          }
          return [...items, { product, quantity, selected: true, variant, raw, addedPrice: product.price, addedStoreId: selectedStore?.id }];
        }),
      /** Khách đã thấy thay đổi giá / cửa hàng → ghi nhận giá & cửa hàng hiện tại cho cả giỏ. */
      ackCartChanges: () =>
        setCart((items) => items.map((i) => ({ ...i, addedPrice: (i.raw ? toProduct(i.raw, province) : i.product).price, addedStoreId: selectedStore?.id }))),
      setQuantity: (id: string, quantity: number) =>
        updateCart(id, (item) => ({ ...item, quantity: Math.max(1, Math.min(quantity, item.product.stock ?? 99)) })),
      removeFromCart: (id: string) => setCart((items) => items.filter((item) => item.product.id !== id)),
      removeSelected: () => setCart((items) => items.filter((item) => !item.selected)),
      toggleSelect: (id: string) => updateCart(id, (item) => ({ ...item, selected: !item.selected })),
      toggleSelectAll: () =>
        setCart((items) => {
          const allSelected = items.every((item) => item.selected);
          return items.map((item) => ({ ...item, selected: !allSelected && item.product.stock !== 0 }));
        }),

      /* search */
      recentSearches,
      addRecentSearch: (keyword: string) =>
        setRecentSearches((list) => [keyword, ...list.filter((k) => k.toLowerCase() !== keyword.toLowerCase())].slice(0, 8)),
      removeRecentSearch: (keyword: string) => setRecentSearches((list) => list.filter((k) => k !== keyword)),
      clearRecentSearches: () => setRecentSearches([]),

      /* sản phẩm đã xem */
      viewed,
      addViewed: (product: Product) => setViewed((list) => [product, ...list.filter((p) => p.id !== product.id)].slice(0, 20)),

      /* wishlist */
      wishlist,
      toggleWishlist: (id: string) => setWishlist((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])),

      /* cards */
      cards,
      saveCard: (card: Omit<Card, 'id'> & { id?: string }) => {
        const id = card.id ?? uid();
        setCards((list) => {
          const others = card.isDefault ? list.map((c) => ({ ...c, isDefault: false })) : list;
          const next = { ...card, id } as Card;
          return others.some((c) => c.id === id) ? others.map((c) => (c.id === id ? next : c)) : [...others, next];
        });
        return id;
      },
      deleteCard: (id: string) => {
        setCards((list) => list.filter((c) => c.id !== id));
        setPayment((p) => (p === `card:${id}` ? 'cod' : p));
      },

      /* checkout draft */
      addressId,
      setAddressId,
      payment,
      setPayment,
      appliedVoucherId,
      setAppliedVoucherId,
      note,
      setNote,
      selectedStore,
      setSelectedStore,
      province,
      userLocation,
      setUserLocation,
      locationGranted,
      setLocationGranted,

      /* orders — danh sách / chi tiết lấy từ API (useOrders, useOrder) */
      /** Sau khi POST /orders thành công: bỏ các sản phẩm đã đặt khỏi giỏ, reset nháp checkout, thêm thông báo. */
      placeOrder: (code: string) => {
        setCart((items) => items.filter((item) => !item.selected));
        if (appliedVoucherId) setMyVouchers((list) => list.map((v) => (v.voucherId === appliedVoucherId ? { ...v, status: 'used' } : v)));
        setAppliedVoucherId(null);
        setNote('');
        setNotifications((n) => [{ id: uid(), type: 'Đơn hàng', title: 'Đặt hàng thành công', body: `Đơn #${code} đã được gửi tới cửa hàng và đang chờ xác nhận.`, time: 'Vừa xong', read: false }, ...n]);
      },
      orderReviews,
      rateOrder: (id: string, rating: number) => setOrderReviews((r) => ({ ...r, [id]: rating })),
      reorder: (order: Order) =>
        setCart((items) => {
          let next = items.map((i) => ({ ...i, selected: false }));
          for (const line of order.lines) {
            if (!line.productId) continue;
            const product: Product = { id: line.productId, name: line.name, image: line.image, noImage: line.noImage, price: line.price, oldPrice: line.oldPrice };
            const existing = next.find((i) => i.product.id === product.id);
            next = existing
              ? next.map((i) => (i === existing ? { ...i, quantity: i.quantity + line.quantity, selected: true } : i))
              : [...next, { product, quantity: line.quantity, selected: true }];
          }
          return next;
        }),

      /* vouchers & points */
      myVouchers,
      points,
      /** Điểm từ server (/customers/me/summary). */
      setPoints,
      pointHistory,
      redeemVoucher: (voucherId: string) => {
        const v = getVoucher(voucherId);
        if (!v.points || points < v.points) return false;
        setPoints((p) => p - v.points!);
        setPointHistory((h) => [{ id: uid(), title: `Đổi voucher ${v.title}`, date: today().date, amount: -v.points! }, ...h]);
        setMyVouchers((list) => [{ voucherId, status: 'active' }, ...list.filter((x) => !(x.voucherId === voucherId && x.status === 'active'))]);
        return true;
      },

      /* notifications */
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
      markRead: (id: string) => setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))),
      markAllRead: () => setNotifications((list) => list.map((n) => ({ ...n, read: true }))),
    };
  }, [isLoggedIn, token, profile, cart, viewed, recentSearches, wishlist, cards, orderReviews, myVouchers, points, pointHistory, notifications, selectedStore, province, userLocation, locationGranted, addressId, payment, appliedVoucherId, note]);
}

export type AppState = ReturnType<typeof useAppState>;
const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const value = useAppState();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export const SHIPPING_OPTIONS = [
  { id: 'fast', name: 'Nhanh', eta: 'Nhận từ 8 Th07 - 9 Th07', fee: 35000, free: true },
  { id: 'express', name: 'Hoả tốc', eta: 'Nhận trong 4 giờ', fee: 45000, free: false },
] as const;

/**
 * Voucher hiện là dữ liệu mẫu — website chưa có coupon (GET /vouchers, /promotions rỗng) nên đơn thật
 * gửi coupon_codes: []. Tắt để tổng tiền giỏ hàng khớp với đơn; bật lại khi gắn API voucher.
 */
export const VOUCHERS_ENABLED = false;

/** Tổng tiền / tiết kiệm của các sản phẩm đang được chọn + voucher đang áp. */
export function useCartTotals(shippingFee = 35000, freeShipping = true) {
  const { cart, appliedVoucherId } = useApp();
  return useMemo(() => {
    const selected = cart.filter((item) => item.selected);
    const subtotal = selected.reduce((sum, i) => sum + (i.product.oldPrice ?? i.product.price) * i.quantity, 0);
    const total = selected.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const voucher = VOUCHERS_ENABLED && appliedVoucherId ? getVoucher(appliedVoucherId) : undefined;
    const vd = voucherDiscount(voucher, total, freeShipping ? 0 : shippingFee);
    const shippingDiscount = freeShipping ? shippingFee : vd.shipping;
    const grandTotal = total - vd.items + shippingFee - shippingDiscount;
    return {
      selected,
      subtotal,
      total,
      discount: subtotal - total,
      voucher,
      voucherValid: !voucher || total >= voucher.minOrder,
      voucherItemsDiscount: vd.items,
      shippingFee,
      shippingDiscount,
      grandTotal,
      saving: subtotal - total + vd.items + shippingDiscount,
    };
  }, [cart, appliedVoucherId, shippingFee, freeShipping]);
}


