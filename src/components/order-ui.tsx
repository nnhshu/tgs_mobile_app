import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { AppText, Button, Radio } from '@/components/ui';
import { cancelReasons, Order, OrderLine, OrderStatus } from '@/data/mock-extra';
import { colors, formatPrice } from '@/theme';

export const STATUS_STYLE: Record<OrderStatus, { fg: string; bg: string }> = {
  'Chờ xác nhận': { fg: colors.warning, bg: '#FFF4EC' },
  'Đang giao': { fg: colors.primary, bg: colors.primarySurface },
  'Hoàn thành': { fg: colors.success, bg: '#E6F6ED' },
  'Đánh giá': { fg: colors.secondary, bg: colors.secondarySurface },
  Huỷ: { fg: colors.error, bg: colors.errorSurface },
};

export const orderTotal = (o: Order) =>
  o.lines.reduce((s, l) => s + l.price * l.quantity, 0) + o.shippingFee - o.shippingDiscount - o.voucherDiscount;

export function StatusChip({ status }: { status: OrderStatus }) {
  const st = STATUS_STYLE[status];
  return (
    <View style={[styles.chip, { backgroundColor: st.bg }]}>
      <AppText size={12} weight="semibold" color={st.fg}>
        {status === 'Huỷ' ? 'Đã huỷ' : status === 'Đánh giá' ? 'Chờ đánh giá' : status}
      </AppText>
    </View>
  );
}

/** Dòng sản phẩm trong đơn (80x80 + tên + giá + số lượng). */
export function OrderLineRow({ productId, name, image, quantity, price, oldPrice }: OrderLine) {
  return (
    <View style={styles.line}>
      <ProductImage product={{ id: productId, name, image, price }} size={64} radius={6} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText numberOfLines={2}>{name}</AppText>
        <View style={styles.lineBottom}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <AppText weight="semibold" color={colors.error}>
              {formatPrice(price)}
            </AppText>
            {oldPrice && (
              <AppText size={12} color={colors.neutral60} strike>
                {formatPrice(oldPrice)}
              </AppText>
            )}
          </View>
          <AppText color={colors.neutral70}>x{quantity}</AppText>
        </View>
      </View>
    </View>
  );
}

/** Cancel Order — Confirm dialog (chọn lý do huỷ). */
export function CancelOrderDialog({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState<string>(cancelReasons[0]);
  return (
    <ConfirmDialog
      visible={visible}
      title="Huỷ đơn hàng?"
      message="Vui lòng cho chúng tôi biết lý do bạn muốn huỷ đơn."
      confirmLabel="Huỷ đơn"
      cancelLabel="Không"
      destructive
      onCancel={onCancel}
      onConfirm={() => onConfirm(reason)}>
      <View style={{ alignSelf: 'stretch', gap: 4 }}>
        {cancelReasons.map((r) => (
          <Pressable key={r} onPress={() => setReason(r)} style={styles.reason}>
            <Radio selected={reason === r} onPress={() => setReason(r)} />
            <AppText style={{ flex: 1 }}>{r}</AppText>
          </Pressable>
        ))}
      </View>
    </ConfirmDialog>
  );
}

export function OrderActions({
  status,
  reviewed,
  onCancel,
  onBuyAgain,
  onReview,
  onTrack,
  onReceived,
}: {
  status: OrderStatus;
  reviewed?: boolean;
  onCancel: () => void;
  onBuyAgain: () => void;
  onReview: () => void;
  onTrack: () => void;
  onReceived: () => void;
}) {
  const small = { height: 36, paddingHorizontal: 16 };
  return (
    <View style={styles.actions}>
      {status === 'Chờ xác nhận' && <Button title="Huỷ đơn" size="sm" variant="outline" onPress={onCancel} style={[small, { borderColor: colors.neutral40 }]} />}
      {status === 'Đang giao' && (
        <>
          <Button title="Theo dõi" size="sm" variant="outline" onPress={onTrack} style={[small, { borderColor: colors.neutral40 }]} />
          <Button title="Đã nhận hàng" size="sm" onPress={onReceived} style={small} />
        </>
      )}
      {status === 'Hoàn thành' && !reviewed && <Button title="Đánh giá" size="sm" variant="outline" onPress={onReview} style={small} />}
      {(status === 'Hoàn thành' || status === 'Huỷ') && <Button title="Mua lại" size="sm" onPress={onBuyAgain} style={small} />}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  chip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  line: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  lineBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
});
