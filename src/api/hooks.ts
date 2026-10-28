import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo } from 'react';

import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '@/api/client';
import { decodeEntities } from '@/api/html';
import { Address, distanceKm, profileFromCustomer, toAddress, toAddressInput, toCategoryTree, toProduct, toOrder, toShippingRate, toStore } from '@/api/mappers';
import {
  ApiAddressBook,
  ApiAttribute,
  ApiOrder,
  ApiOrderPage,
  ApiCategory,
  ApiProduct,
  ApiProductDetail,
  ApiProductPage,
  ApiStore,
  AuthCheckResponse,
  AuthResponse,
  AvatarResponse,
  ChangePasswordResponse,
  CustomerSummary,
  CustomerUpdate,
  ApiCustomer,
  ApiPaymentMethods,
  ApiShippingRate,
  CreateOrderInput,
  CreateOrderResponse,
  OrderAddressInput,
  OrderItemInput,
  LoginInput,
  OtpRequestResponse,
  ProductQuery,
  RegisterInput,
} from '@/api/types';
import type { Order } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';

export { queryClient } from '@/api/query-client';

/** Tỉnh của cửa hàng đang chọn — dùng để lấy giá/tồn kho theo chi nhánh. */
export function useProvince() {
  return useApp().province;
}

/* ---------- Danh mục ---------- */

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => apiGet<ApiCategory[]>('/categories', undefined, signal),
    select: toCategoryTree,
    staleTime: 60 * 60 * 1000,
  });
}

/* ---------- Danh sách sản phẩm (phân trang vô hạn) ---------- */

export function useProducts(query: ProductQuery = {}, options: { enabled?: boolean } = {}) {
  const province = useProvince();
  const perPage = query.per_page ?? 20;
  const result = useInfiniteQuery({
    queryKey: ['products', { ...query, per_page: perPage }],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      apiGet<ApiProductPage>('/products', { ...query, per_page: perPage, page: pageParam }, signal),
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
    enabled: options.enabled ?? true,
  });

  const products = useMemo(
    () => result.data?.pages.flatMap((p) => p.items.map((item) => toProduct(item, province))) ?? [],
    [result.data, province],
  );
  return { ...result, products, total: result.data?.pages[0]?.total ?? 0 };
}

/* ---------- Chi tiết sản phẩm ---------- */

/** Tìm sản phẩm trong cache danh sách để hiển thị ngay trong lúc tải chi tiết. */
function findInListCache(client: ReturnType<typeof useQueryClient>, id: string): ApiProduct | undefined {
  for (const [, data] of client.getQueriesData<{ pages: ApiProductPage[] }>({ queryKey: ['products'] })) {
    const hit = data?.pages.flatMap((p) => p.items).find((p) => String(p.id) === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useProduct(id: string) {
  const client = useQueryClient();
  const province = useProvince();
  const cached = findInListCache(client, id);
  const result = useQuery<ApiProduct>({
    queryKey: ['product', id],
    queryFn: async ({ signal }) => {
      const res = await apiGet<ApiProductDetail>(`/products/${encodeURIComponent(id)}`, undefined, signal);
      const item = res.items?.[0];
      if (!item) throw new Error('Không tìm thấy sản phẩm');
      return item;
    },
    placeholderData: cached,
    enabled: !!id,
  });
  const raw = result.data;
  const product = useMemo(() => (raw ? toProduct(raw, province) : undefined), [raw, province]);
  return { ...result, raw, product };
}

/* ---------- Cửa hàng ---------- */

const STORE_PAGE_SIZE = 100;

/** Tải toàn bộ cửa hàng (~400, 4 trang × 100) — API không trả tổng số nên đọc tới trang thiếu. */
async function fetchAllStores(signal?: AbortSignal) {
  const all: ApiStore[] = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await apiGet<ApiStore[]>('/stores', { per_page: STORE_PAGE_SIZE, page }, signal);
    all.push(...batch);
    if (batch.length < STORE_PAGE_SIZE) break;
  }
  return all;
}

/** Danh sách cửa hàng, sắp theo khoảng cách nếu đã có vị trí người dùng. */
export function useStores() {
  const { userLocation } = useApp();
  const result = useQuery({
    queryKey: ['stores'],
    queryFn: ({ signal }) => fetchAllStores(signal),
    staleTime: 60 * 60 * 1000,
  });
  const stores = useMemo(() => {
    const list = (result.data ?? []).map(toStore);
    if (!userLocation) return list;
    return list
      .map((s) => ({ ...s, distanceKm: s.lat !== undefined && s.lng !== undefined ? distanceKm(userLocation, { lat: s.lat, lng: s.lng }) : undefined }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [result.data, userLocation]);
  return { ...result, stores };
}

/** Xin quyền vị trí + lấy toạ độ hiện tại (dùng tính khoảng cách cửa hàng). */
export function useRequestLocation() {
  const { setUserLocation, setLocationGranted } = useApp();
  return async () => {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(granted);
    if (!granted) return false;
    const pos = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    return true;
  };
}

/* ---------- Tài khoản ---------- */

export function useRegister() {
  return useMutation({ mutationFn: (input: RegisterInput) => apiPost<AuthResponse>('/auth/register', input) });
}

export function useAuthCheck() {
  return useMutation({ mutationFn: (phone: string) => apiPost<AuthCheckResponse>('/auth/check', { phone }) });
}

export function useLogin() {
  return useMutation({ mutationFn: (input: LoginInput) => apiPost<AuthResponse>('/auth/login', input) });
}

export function useOtpRequest() {
  return useMutation({ mutationFn: (phone: string) => apiPost<OtpRequestResponse>('/auth/otp/request', { phone }) });
}

export function useOtpVerify() {
  return useMutation({ mutationFn: (input: { phone: string; code: string }) => apiPost<AuthResponse>('/auth/otp/verify', input) });
}

/** Đăng ký lần đầu bằng OTP: gửi mã tới SĐT chưa có tài khoản (409 tgs_phone_taken nếu đã có). */
export function useRegisterOtpRequest() {
  return useMutation({ mutationFn: (phone: string) => apiPost<OtpRequestResponse>('/auth/register/otp', { phone }) });
}

/** Xác thực mã đăng ký → tạo tài khoản + trả phiên đăng nhập. */
export function useRegisterOtpVerify() {
  return useMutation({ mutationFn: (input: { phone: string; code: string }) => apiPost<AuthResponse>('/auth/register/verify', input) });
}

/* ---------- Khách hàng (cần token) ---------- */

/**
 * Tổng quan tài khoản (điểm, số đơn theo trạng thái, thông báo chưa đọc).
 * Đồng bộ tên / SĐT / email / avatar / điểm vào store để các màn khác dùng.
 */
export function useCustomerSummary() {
  const { token, updateProfile, setPoints } = useApp();
  const result = useQuery({
    queryKey: ['customer', 'summary', token],
    queryFn: ({ signal }) => apiGet<CustomerSummary>('/customers/me/summary', undefined, signal, token),
    enabled: !!token,
    staleTime: 60 * 1000,
  });
  const data = result.data;
  useEffect(() => {
    if (!data) return;
    updateProfile({
      ...profileFromCustomer({ name: data.name, phone: data.phone, email: data.email }),
      // Đồng bộ cả khi ảnh đã bị xoá trên server (avatar_url = null).
      avatar: data.avatar_url ? { uri: data.avatar_url } : undefined,
    });
    setPoints(data.points);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return result;
}

/** Thông tin cá nhân đầy đủ (giới tính, địa chỉ billing/shipping). */
export function useCustomerMe() {
  const { token } = useApp();
  return useQuery({
    queryKey: ['customer', 'me', token],
    queryFn: ({ signal }) => apiGet<ApiCustomer>('/customers/me', undefined, signal, token),
    enabled: !!token,
  });
}

export function useUpdateCustomer() {
  const { token, updateProfile } = useApp();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerUpdate) => apiPut<ApiCustomer>('/customers/me', input, token),
    onSuccess: (customer, input) => {
      // Server có thể trả customer đầy đủ hoặc chỉ { success } → ưu tiên dữ liệu server, thiếu thì dùng input.
      updateProfile({
        ...profileFromCustomer({ name: input.name, email: input.email, gender: input.gender }),
        ...profileFromCustomer(customer),
      });
      // Cập nhật cache ngay (form không nháy về giá trị cũ), sau đó tải lại từ server.
      client.setQueryData<ApiCustomer>(['customer', 'me', token], (old) => ({ ...old, ...input, ...(customer?.id ? customer : {}) }));
      client.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

/* ---------- Ảnh đại diện ---------- */

/** Upload ảnh đại diện (multipart, trường "avatar") — uri lấy từ expo-image-picker. */
export function useUploadAvatar() {
  const { token, updateProfile } = useApp();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name?: string | null; type?: string | null }) => {
      const form = new FormData();
      const type = file.type || 'image/jpeg';
      const name = file.name || `avatar.${type.split('/')[1] ?? 'jpg'}`;
      // React Native gửi file từ { uri, name, type } (không phải Blob).
      form.append('avatar', { uri: file.uri, name, type } as unknown as Blob);
      return apiUpload<AvatarResponse>('/customers/me/avatar', form, token);
    },
    onSuccess: (res, file) => {
      updateProfile({ avatar: { uri: res.avatar_url ?? file.uri } });
      client.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

export function useDeleteAvatar() {
  const { token, updateProfile } = useApp();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete<AvatarResponse>('/customers/me/avatar', token),
    onSuccess: () => {
      updateProfile({ avatar: undefined });
      client.invalidateQueries({ queryKey: ['customer'] });
    },
  });
}

/* ---------- Sổ địa chỉ ---------- */

const addressBookKey = (token: string | null) => ['customer', 'address-book', token];

/** Danh sách địa chỉ nhận hàng của khách (rỗng khi chưa đăng nhập). */
export function useAddressBook() {
  const { token } = useApp();
  const query = useQuery({
    queryKey: addressBookKey(token),
    queryFn: ({ signal }) => apiGet<ApiAddressBook>('/customers/me/address-book', undefined, signal, token),
    enabled: !!token,
  });
  const addresses = useMemo(() => (query.data?.items ?? []).map(toAddress), [query.data]);
  return { ...query, addresses, defaultId: query.data?.default_id ?? null };
}

/** Địa chỉ dùng cho đơn hiện tại: địa chỉ khách đã chọn → mặc định → địa chỉ đầu tiên. */
export function useSelectedAddress(): Address | undefined {
  const { addressId } = useApp();
  const { addresses, defaultId } = useAddressBook();
  return addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.id === defaultId) ?? addresses[0];
}

/** Mọi API sổ địa chỉ đều trả danh sách mới → ghi thẳng vào cache, không cần tải lại. */
function useAddressMutation<V>(fn: (vars: V, token: string | null) => Promise<ApiAddressBook>) {
  const { token } = useApp();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: V) => fn(vars, token),
    onSuccess: (book) => {
      if (Array.isArray(book?.items)) client.setQueryData<ApiAddressBook>(addressBookKey(token), { items: book.items, default_id: book.default_id ?? null });
      else client.invalidateQueries({ queryKey: addressBookKey(token) });
    },
  });
}

/** Thêm (không có id) hoặc cập nhật địa chỉ. */
export const useSaveAddress = () =>
  useAddressMutation(({ id, ...address }: Omit<Address, 'id' | 'typeLabel'> & { id?: string }, token) =>
    id
      ? apiPut<ApiAddressBook>(`/customers/me/address-book/${encodeURIComponent(id)}`, toAddressInput(address), token)
      : apiPost<ApiAddressBook>('/customers/me/address-book', toAddressInput(address), token),
  );

export const useDeleteAddress = () =>
  useAddressMutation((id: string, token) => apiDelete<ApiAddressBook>(`/customers/me/address-book/${encodeURIComponent(id)}`, token));

export const useSetDefaultAddress = () =>
  useAddressMutation((id: string, token) => apiPost<ApiAddressBook>(`/customers/me/address-book/${encodeURIComponent(id)}/default`, {}, token));

/* ---------- Đặt hàng ---------- */

/** Phương thức thanh toán đang bật trên website (COD, VietQR...). */
export function usePaymentMethods() {
  const { token } = useApp();
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: ({ signal }) => apiGet<ApiPaymentMethods>('/payment-methods', undefined, signal, token),
    staleTime: 30 * 60 * 1000,
  });
}

/** Phí giao theo giỏ + địa chỉ nhận — POST /shipping/rates (cần đăng nhập). */
export function useShippingRates(items: OrderItemInput[], shipping?: OrderAddressInput) {
  const { token } = useApp();
  const query = useQuery({
    queryKey: ['customer', 'shipping-rates', token, items, shipping],
    queryFn: () => apiPost<ApiShippingRate[]>('/shipping/rates', { items, shipping }, token),
    enabled: !!token && items.length > 0 && !!shipping,
    staleTime: 60 * 1000,
  });
  const rates = useMemo(() => (Array.isArray(query.data) ? query.data.map(toShippingRate) : []), [query.data]);
  return { ...query, rates };
}

/** Tạo đơn — POST /orders. Thành công thì làm mới tổng quan tài khoản (số đơn, điểm). */
export function useCreateOrder() {
  const { token } = useApp();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => apiPost<CreateOrderResponse>('/orders', input, token),
    onSuccess: () => client.invalidateQueries({ queryKey: ['customer'] }),
  });
}

/* ---------- Bảo mật ---------- */

/**
 * Đổi mật khẩu — PUT /auth/password { current_password, new_password }.
 * Server huỷ token cũ và trả token mới → lưu lại ngay để không bị đăng xuất.
 */
export function useChangePassword() {
  const { token, setSession } = useApp();
  return useMutation({
    mutationFn: (input: { current_password: string; new_password: string }) => apiPut<ChangePasswordResponse>('/auth/password', input, token),
    onSuccess: (res) => {
      if (res.token) setSession(res.token, undefined, res.expires_at);
    },
  });
}

/* ---------- Bộ lọc ---------- */

export type FilterTerm = { id: number; name: string; count: number };

/**
 * Thuộc tính cho bộ lọc — GET /attributes. Chỉ lấy nhóm có dữ liệu: Thương hiệu, Danh mục
 * (các nhóm Độ tuổi, Dung tích... trên website hiện chưa có giá trị).
 */
export function useFilterAttributes() {
  const query = useQuery({
    queryKey: ['attributes'],
    queryFn: ({ signal }) => apiGet<ApiAttribute[]>('/attributes', undefined, signal),
    staleTime: 60 * 60 * 1000,
  });
  return useMemo(() => {
    const termsOf = (taxonomy: string): FilterTerm[] => {
      const attr = query.data?.find((a) => a.taxonomy === taxonomy);
      const terms = attr ? (Array.isArray(attr.terms) ? attr.terms : Object.values(attr.terms)) : [];
      return terms
        .filter((t) => t.count > 0)
        .map((t) => ({ id: t.id, name: decodeEntities(t.name), count: t.count }))
        .sort((a, b) => b.count - a.count);
    };
    return {
      ...query,
      brands: termsOf('product_brand'),
      categories: termsOf('product_cat').filter((c) => !/chưa phân loại/i.test(c.name)),
    };
  }, [query]);
}

/* ---------- Đơn hàng của khách ---------- */

const ORDERS_PER_PAGE = 20;
const pageItems = (p: ApiOrderPage) => (Array.isArray(p) ? p : (p?.items ?? []));

/** Gắn số sao khách đã đánh giá (lưu trong app) vào đơn. */
function useWithReviews() {
  const { orderReviews } = useApp();
  return useCallback((o: Order): Order => (orderReviews[o.id] ? { ...o, reviewed: true, rating: orderReviews[o.id] } : o), [orderReviews]);
}

/** Danh sách đơn — GET /orders?per_page=20&page=n (tải thêm khi cuộn). */
export function useOrders() {
  const { token } = useApp();
  const withReviews = useWithReviews();
  const query = useInfiniteQuery({
    queryKey: ['customer', 'orders', token],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => apiGet<ApiOrderPage>('/orders', { per_page: ORDERS_PER_PAGE, page: pageParam }, signal, token),
    getNextPageParam: (last, all) => {
      if (!Array.isArray(last) && last?.total_pages) return (last.page ?? all.length) < last.total_pages ? all.length + 1 : undefined;
      return pageItems(last).length === ORDERS_PER_PAGE ? all.length + 1 : undefined;
    },
    enabled: !!token,
    staleTime: 30 * 1000,
  });
  const orders = useMemo(() => (query.data?.pages ?? []).flatMap(pageItems).map(toOrder).map(withReviews), [query.data, withReviews]);
  return { ...query, orders };
}

/** Chi tiết đơn — GET /orders/{id}; hiện ngay dữ liệu tóm tắt từ danh sách trong lúc tải. */
export function useOrder(id?: string) {
  const { token } = useApp();
  const client = useQueryClient();
  const withReviews = useWithReviews();
  const query = useQuery<ApiOrder>({
    queryKey: ['customer', 'order', token, id],
    queryFn: async ({ signal }) => {
      const res = await apiGet<ApiOrder | { order: ApiOrder }>(`/orders/${id}`, undefined, signal, token);
      return 'order' in res && res.order ? res.order : (res as ApiOrder);
    },
    enabled: !!token && !!id,
    placeholderData: () => {
      for (const [, data] of client.getQueriesData<{ pages: ApiOrderPage[] }>({ queryKey: ['customer', 'orders'] })) {
        const hit = data?.pages.flatMap(pageItems).find((o) => String(o.id) === id);
        if (hit) return hit;
      }
      return undefined;
    },
  });
  const order = useMemo(() => (query.data ? withReviews(toOrder(query.data)) : undefined), [query.data, withReviews]);
  return { ...query, order };
}
