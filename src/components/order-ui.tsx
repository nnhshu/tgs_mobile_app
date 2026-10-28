import { router } from 'expo-router';

import { useOrder, useProduct } from '@/api/hooks';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { AppText, Button, RIcon } from '@/components/ui';
import { Order, OrderLine, OrderStatus } from '@/data/mock-extra';
import { colors, formatPrice } from '@/theme';

/** Chip trạng thái (Figma "Đơn hàng"): chữ + nền nhạt cùng tông. */
export const STATUS_META: Record<OrderStatus, { label: string; fg: string; bg: string }> = {
  'Chờ xác nhận': { label: 'Đang đợi xác nhận', fg: colors.secondaryHover, bg: '#FFF1DB' },
  'Đã xác nhận': { label: 'Đã xác nhận', fg: colors.success, bg: '#E6F6ED' },
  'Đang giao': { label: 'Đang giao', fg: colors.secondaryHover, bg: '#FFF1DB' },
  'Hoàn thành': { label: 'Hoàn thành', fg: colors.success, bg: '#E6F6ED' },
  'Đánh giá': { label: 'Hoàn thành', fg: colors.success, bg: '#E6F6ED' },
  Huỷ: { label: 'Huỷ', fg: colors.error, bg: colors.errorSurface },
};

export const orderTotal = (o: Order) => o.total ?? o.lines.reduce((s, l) => s + l.price * l.quantity, 0) + o.shippingFee - o.shippingDiscount - o.voucherDiscount;
export const orderItemsTotal = (o: Order) => o.lines.reduce((s, l) => s + l.price * l.quantity, 0);

/* ---------- Ngày giờ: createdAt dạng "dd/mm/yyyy hh:mm" ---------- */

export function parseOrderDate(v?: string) {
  const m = v?.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!m) return undefined;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] ?? 0), Number(m[5] ?? 0));
}
const pad = (n: number) => String(n).padStart(2, '0');
/** "11:30 ngày 14/1/2026" */
export const timeAndDay = (v?: string) => {
  const d = parseOrderDate(v);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` : (v ?? '');
};
/** "28-08-2026 11:40" */
export const dashDateTime = (v?: string) => {
  const d = parseOrderDate(v);
  return d ? `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}` : (v ?? '');
};
/** Khoảng giao dự kiến 2–5 ngày sau khi đặt: "30-8 đến 2-9-2026". */
export const deliveryWindow = (v?: string) => {
  const d = parseOrderDate(v);
  if (!d) return '';
  const from = new Date(d.getTime() + 2 * 86400000);
  const to = new Date(d.getTime() + 5 * 86400000);
  return `${from.getDate()}-${from.getMonth() + 1} đến ${to.getDate()}-${to.getMonth() + 1}-${to.getFullYear()}`;
};

/** "dd/mm/yyyy hh:mm" của thời điểm hiện tại. */
export function nowString() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function StatusChip({ status, label }: { status: OrderStatus; label?: string }) {
  const st = STATUS_META[status];
  return (
    <View style={[styles.chip, { backgroundColor: st.bg }]}>
      <AppText size={11} weight="medium" color={st.fg}>
        {label ?? st.label}
      </AppText>
    </View>
  );
}

/** Dòng sản phẩm trong đơn: ảnh + tên + giá (giá gạch) + "× N". */
export function OrderLineRow({ productId, name, image, noImage, quantity, price, oldPrice }: OrderLine) {
  // API đơn hàng không trả ảnh → lấy ảnh từ sản phẩm (có cache).
  const { product } = useProduct(noImage ? productId : '');
  const img = noImage && product && !product.noImage ? product.image : image;
  const missing = noImage && (!product || product.noImage);
  return (
    <View style={styles.line}>
      <ProductImage product={{ id: productId, name, image: img, price, noImage: missing }} size={56} radius={6} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText size={13} numberOfLines={1}>
          {name}
        </AppText>
        {price > 0 && (
          <AppText variant="bodySmallSemibold" color={colors.error}>
            {formatPrice(price)}
          </AppText>
        )}
        {oldPrice && (
          <AppText size={11} color={colors.neutral60} strike>
            {formatPrice(oldPrice)}
          </AppText>
        )}
      </View>
      <AppText size={13}>× {quantity}</AppText>
    </View>
  );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <RIcon key={n} name="starFill" size={size} color={n <= value ? colors.secondary : colors.neutral40} />
      ))}
    </View>
  );
}

/** Dải thông báo theo trạng thái: đợi xác nhận (cam) / đã xác nhận (xanh). */
export function StatusNotice({ status }: { status: OrderStatus }) {
  if (status !== 'Chờ xác nhận' && status !== 'Đã xác nhận') return null;
  const waiting = status === 'Chờ xác nhận';
  return (
    <View style={[styles.notice, { backgroundColor: waiting ? '#FFF1DB' : '#E6F6ED' }]}>
      <RIcon name={waiting ? 'timeFill' : 'checkboxCircleFill'} size={14} color={waiting ? colors.secondaryHover : colors.success} />
      <AppText size={11} color={waiting ? colors.secondaryHover : colors.success}>
        {waiting ? 'Đơn hàng đang đợi cửa hàng xác nhận' : 'Đơn hàng đã được cửa hàng xác nhận'}
      </AppText>
    </View>
  );
}

const small = { height: 28, paddingHorizontal: 14 };

/** Thẻ đơn trong danh sách (Figma "Tất cả", "Xác nhận", "Đang giao", "Hoàn thành", "Huỷ", "Đánh giá"). */
export function OrderCard({ order: summary, onCancel, onBuyAgain }: { order: Order; onCancel?: () => void; onBuyAgain: (o: Order) => void }) {
  // GET /orders không kèm sản phẩm → lấy chi tiết đơn (có cache, dùng lại khi mở màn chi tiết).
  const detail = useOrder(summary.lines.length ? undefined : summary.id);
  const order = detail.order ? { ...detail.order, reviewed: summary.reviewed, rating: summary.rating } : summary;
  const open = () => router.push({ pathname: '/orders/[id]', params: { id: order.id } });
  const s = order.status;
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <AppText size={12}>
          Mã đơn <AppText size={12} color={colors.primary}>#{order.code}</AppText>
        </AppText>
        <StatusChip status={s} label={order.statusLabel} />
      </View>
      <Pressable style={styles.rowBetween} onPress={open}>
        <AppText size={13} weight="semibold">
          Sản phẩm đã chọn ({order.itemsCount ?? order.lines.length})
        </AppText>
        <RIcon name="arrowRightSLine" size={18} color={colors.neutral70} />
      </Pressable>
      {order.lines[0] && (
        <Pressable onPress={open}>
          <OrderLineRow {...order.lines[0]} />
        </Pressable>
      )}

      <View style={styles.rowBetween}>
        <AppText variant="bodySmallSemibold">{formatPrice(orderTotal(order))}</AppText>
        <View style={styles.buttons}>
          {s === 'Chờ xác nhận' && onCancel && (
            <Button title="Huỷ" size="sm" variant="outline" textColor={colors.error} onPress={onCancel} style={[small, { borderColor: colors.error }]} />
          )}
          {(s === 'Hoàn thành' || s === 'Đánh giá') && order.reviewed && <Stars value={order.rating ?? 5} size={14} />}
          {(s === 'Hoàn thành' || s === 'Đánh giá') && !order.reviewed && (
            <Button
              title="Đánh giá"
              size="sm"
              variant="outline"
              onPress={() => router.push({ pathname: '/orders/review', params: { id: order.id } })}
              style={small}
            />
          )}
          {s === 'Hoàn thành' || s === 'Đánh giá' || s === 'Huỷ' ? (
            <Button title="Mua lại" size="sm" onPress={() => onBuyAgain(order)} style={small} />
          ) : (
            <Button title="Xem chi tiết" size="sm" onPress={open} style={small} />
          )}
        </View>
      </View>

      <StatusNotice status={s} />
      {s === 'Huỷ' ? (
        <AppText size={11} color={colors.error} align="right">
          Yêu cầu Huỷ lúc {dashDateTime(order.cancelledAt ?? order.createdAt).replace(/-/g, '/')}
        </AppText>
      ) : (
        <AppText size={11} color={colors.neutral60} align="right">
          Thời gian tạo đơn {timeAndDay(order.createdAt)}
        </AppText>
      )}
    </View>
  );
}

/** Cancel Order — Confirm dialog: "Huỷ đơn này?". */
export function CancelOrderDialog({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog
      visible={visible}
      title="Huỷ đơn này?"
      message="Đơn hàng sẽ bị huỷ và không thể khôi phục"
      confirmLabel="Huỷ đơn"
      cancelLabel="Không huỷ"
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4 },
});
