import { useMemo } from 'react';

import { useSelectedAddress } from '@/api/hooks';
import { toOrderAddress } from '@/api/mappers';
import { OrderItemInput } from '@/api/types';
import { CartItem, DEFAULT_PROVINCE, useApp } from '@/store/app-store';

/** Lý do một sản phẩm trong giỏ không đặt được tại chi nhánh đang chọn. */
function blockReason(item: CartItem) {
  const { product, raw } = item;
  if (product.contactPrice || product.sellsAtBranch === false) return 'Không bán tại chi nhánh này';
  if (product.stock === 0) return 'Hết hàng tại chi nhánh này';
  if (raw?.versions?.length && !product.versionSlug) return 'Chưa có giá tại chi nhánh này';
  return undefined;
}

/**
 * Dữ liệu đơn đang soạn từ giỏ hàng + địa chỉ + chi nhánh: payload `items` / `shipping` cho
 * POST /shipping/rates và POST /orders, cùng danh sách sản phẩm không đặt được.
 */
export function useOrderDraft() {
  const { cart, selectedStore, profile } = useApp();
  const address = useSelectedAddress();
  const province = selectedStore?.province ?? DEFAULT_PROVINCE;

  return useMemo(() => {
    const selected = cart.filter((i) => i.selected);
    const blocked = selected.map((item) => ({ item, reason: blockReason(item) })).filter((b) => b.reason) as { item: CartItem; reason: string }[];
    const items: OrderItemInput[] = selected.map(({ product, quantity }) => ({
      product_id: Number(product.id),
      quantity,
      ...(product.versionSlug ? { version_slug: product.versionSlug } : {}),
    }));
    const shipping = address ? toOrderAddress(address, province, profile.email || undefined) : undefined;
    const itemsTotal = selected.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
    const subtotal = selected.reduce((sum, i) => sum + (i.product.oldPrice ?? i.product.price) * i.quantity, 0);
    return { selected, blocked, items, address, shipping, itemsTotal, subtotal, discount: subtotal - itemsTotal };
  }, [cart, address, province, profile.email]);
}
