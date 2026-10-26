import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatAddress } from '@/api/mappers';
import { ScreenHeader } from '@/components/headers';
import { CancelOrderDialog, OrderActions, OrderLineRow, orderTotal, StatusChip } from '@/components/order-ui';
import { useToast } from '@/components/overlays';
import { AppText, Divider, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { useOpenLink } from '@/hooks/use-open-link';
import { colors, formatPrice } from '@/theme';

const STEPS = ['Đặt hàng', 'Xác nhận', 'Đang giao', 'Hoàn thành'] as const;

/** Chi tiết đơn hàng_Đang giao / _Hoàn thành + Sản phẩm Dropdown. */
export default function OrderDetailScreen() {
  const openLink = useOpenLink();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { orders, setOrderStatus, reorder } = useApp();
  const order = orders.find((o) => o.id === id) ?? orders[0];
  const [showAll, setShowAll] = useState(false);
  const [cancel, setCancel] = useState(false);

  if (!order) return null;
  const address = order.address;
  const merchandise = order.lines.reduce((s, l) => s + (l.oldPrice ?? l.price) * l.quantity, 0);
  const itemsTotal = order.lines.reduce((s, l) => s + l.price * l.quantity, 0);
  const stepIndex = order.status === 'Chờ xác nhận' ? 1 : order.status === 'Đang giao' ? 2 : order.status === 'Huỷ' ? -1 : 3;
  const lines = showAll ? order.lines : order.lines.slice(0, 1);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Chi tiết đơn hàng"
        right={
          <Pressable onPress={() => router.push('/help')} hitSlop={8}>
            <RIcon name="questionLine" size={24} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingBottom: insets.bottom + 100 }}>
        {/* Trạng thái */}
        <View style={[styles.card, { backgroundColor: order.status === 'Huỷ' ? colors.errorSurface : colors.primarySurface }]}>
          <View style={styles.row}>
            <RIcon
              name={order.status === 'Huỷ' ? 'closeCircleFill' : order.status === 'Hoàn thành' ? 'checkboxCircleLine' : 'truckLine'}
              size={28}
              color={order.status === 'Huỷ' ? colors.error : colors.primary}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyMediumSemibold">
                {order.status === 'Huỷ' ? 'Đơn hàng đã huỷ' : order.status === 'Đang giao' ? 'Đơn hàng đang được giao' : order.status === 'Chờ xác nhận' ? 'Chờ cửa hàng xác nhận' : 'Giao hàng thành công'}
              </AppText>
              <AppText size={12} color={colors.neutral70}>
                {order.status === 'Huỷ' ? `Lý do: ${order.cancelReason ?? 'Khác'}` : order.status === 'Đang giao' ? 'Dự kiến giao trong 30 - 45 phút' : `Mã đơn #${order.code}`}
              </AppText>
            </View>
            <StatusChip status={order.status} />
          </View>
          {stepIndex >= 0 && (
            <View style={styles.steps}>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.step}>
                  <View style={styles.stepTrack}>
                    <View style={[styles.stepLine, { opacity: i === 0 ? 0 : 1 }, i <= stepIndex && styles.done]} />
                    <View style={[styles.stepDot, i <= stepIndex && styles.done]} />
                    <View style={[styles.stepLine, { opacity: i === STEPS.length - 1 ? 0 : 1 }, i < stepIndex && styles.done]} />
                  </View>
                  <AppText size={11} weight={i === stepIndex ? 'semibold' : 'regular'} color={i <= stepIndex ? colors.primary : colors.neutral60} align="center">
                    {s}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Địa chỉ */}
        <View style={styles.card}>
          <View style={styles.rowTop}>
            <RIcon name="mapPinLine" size={20} color={colors.neutral70} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText color={colors.neutral70}>Chi nhánh giao</AppText>
              <AppText weight="semibold">{order.storeName || 'Thế Giới Sữa'}</AppText>
            </View>
          </View>
          <Divider color={colors.neutral30} />
          <View style={styles.rowTop}>
            <RIcon name="mapPinUserFill" size={20} color={colors.neutral70} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText color={colors.neutral70}>Địa chỉ nhận</AppText>
              {address ? (
                <>
                  <AppText weight="semibold">
                    {address.receiver} <AppText color={colors.neutral70}>{address.phone}</AppText>
                  </AppText>
                  <AppText>{formatAddress(address)}</AppText>
                </>
              ) : (
                <AppText color={colors.neutral70}>Không có thông tin địa chỉ</AppText>
              )}
            </View>
          </View>
        </View>

        {/* Sản phẩm (dropdown) */}
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Sản phẩm ({order.lines.length})</AppText>
          {lines.map((l, i) => (
            <View key={l.productId + i} style={{ gap: 12 }}>
              {i > 0 && <Divider color={colors.neutral30} />}
              <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.productId } })}>
                <OrderLineRow {...l} />
              </Pressable>
            </View>
          ))}
          {order.lines.length > 1 && (
            <Pressable style={styles.more} onPress={() => setShowAll((v) => !v)}>
              <AppText color={colors.primary}>{showAll ? 'Thu gọn' : `Xem thêm ${order.lines.length - 1} sản phẩm`}</AppText>
              <RIcon name={showAll ? 'arrowUpSLine' : 'arrowDownSLine'} size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* Thanh toán */}
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Chi tiết thanh toán</AppText>
          <Row label="Tổng tiền hàng" value={formatPrice(merchandise)} />
          <Row label="Giảm giá sản phẩm" value={`-${formatPrice(merchandise - itemsTotal)}`} />
          {order.voucherDiscount > 0 && <Row label="Voucher" value={`-${formatPrice(order.voucherDiscount)}`} />}
          <Row label="Phí vận chuyển" value={formatPrice(order.shippingFee)} />
          <Row label="Giảm giá vận chuyển" value={`-${formatPrice(order.shippingDiscount)}`} color={colors.success} />
          <Divider color={colors.neutral30} />
          <Row label="Tổng thanh toán" value={formatPrice(orderTotal(order))} bold />
          <Row label="Phương thức" value={order.payment} />
          {order.note ? <Row label="Ghi chú" value={order.note} /> : null}
        </View>

        <View style={styles.card}>
          <Row label="Mã đơn hàng" value={`#${order.code}`} />
          <Row label="Thời gian đặt" value={order.createdAt} />
          <View style={styles.helpRow}>
            <Pressable style={styles.helpBtn} onPress={() => openLink('tel:1900636975')}>
              <RIcon name="customerService2Line" size={20} color={colors.primary} />
              <AppText weight="medium" color={colors.primary}>
                Gọi hỗ trợ
              </AppText>
            </Pressable>
            <Pressable style={styles.helpBtn} onPress={() => toast('Nhân viên CSKH sẽ liên hệ bạn trong ít phút', 'chat1Line')}>
              <RIcon name="chat1Line" size={20} color={colors.primary} />
              <AppText weight="medium" color={colors.primary}>
                Chat với shop
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <OrderActions
          status={order.status}
          reviewed={order.reviewed}
          onCancel={() => setCancel(true)}
          onBuyAgain={() => {
            reorder(order);
            router.push('/cart');
          }}
          onReview={() => router.push({ pathname: '/orders/review', params: { id: order.id } })}
          onTrack={() => toast('Shipper đang cách bạn khoảng 2 km', 'truckLine')}
          onReceived={() => {
            setOrderStatus(order.id, 'Hoàn thành');
            toast('Cảm ơn bạn đã xác nhận nhận hàng!');
          }}
        />
      </View>
      <CancelOrderDialog
        visible={cancel}
        onCancel={() => setCancel(false)}
        onConfirm={(reason) => {
          setOrderStatus(order.id, 'Huỷ', { cancelReason: reason });
          setCancel(false);
          toast('Đã huỷ đơn hàng');
        }}
      />
    </View>
  );
}

function Row({ label, value, color = colors.text, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText weight={bold ? 'semibold' : 'regular'} color={bold ? colors.text : colors.neutral90}>
        {label}
      </AppText>
      <AppText weight={bold ? 'semibold' : 'regular'} color={bold ? colors.error : color} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, padding: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  steps: { flexDirection: 'row' },
  step: { flex: 1, alignItems: 'center', gap: 6 },
  stepTrack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.neutral40 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.neutral40 },
  done: { backgroundColor: colors.primary },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  helpRow: { flexDirection: 'row', gap: 8 },
  helpBtn: { flex: 1, height: 40, borderRadius: 100, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12, boxShadow: '0px -8px 9px rgba(0,0,0,0.08)' },
});
