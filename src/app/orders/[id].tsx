import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrder, useProduct, useStores } from '@/api/hooks';
import { formatAddress } from '@/api/mappers';
import { ScreenHeader } from '@/components/headers';
import { Skeleton } from '@/components/form';
import { dashDateTime, deliveryWindow, OrderLineRow, orderTotal, parseOrderDate, StatusChip } from '@/components/order-ui';
import { StateView } from '@/components/state-view';
import { useToast } from '@/components/overlays';
import { AppText, Button, RIcon } from '@/components/ui';
import { RemixName } from '@/remix-icons';
import { useOpenLink } from '@/hooks/use-open-link';
import { useApp } from '@/store/app-store';
import { colors, formatPrice } from '@/theme';
import { formatPhoneIntl } from '@/utils/validation';

const HOTLINE = '1900636975';

/** Chi tiết đơn hàng — GET /orders/{id} (Figma "Chi tiết đơn hàng_Đang giao / _Hoàn thành", "Sản phẩm Dropdown"). */
export default function OrderDetailScreen() {
  const openLink = useOpenLink();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { reorder } = useApp();
  const { stores } = useStores();
  const query = useOrder(id);
  const order = query.order;
  const [showPayment, setShowPayment] = useState(false);
  // API không trả tên chi nhánh → lấy tỉnh của phiên bản sản phẩm (version_slug, vd. "nghe-an" → "Nghệ An").
  const firstLine = order?.lines[0];
  const { raw: firstRaw } = useProduct(firstLine?.versionSlug ? firstLine.productId : '');
  const branchProvince = firstRaw?.versions?.find((v) => v.slug === firstLine?.versionSlug)?.name;

  if (!order) {
    return (
      <View style={styles.screen}>
        <StatusBar style="dark" />
        <ScreenHeader title="Chi tiết đơn hàng" shadow />
        {query.isError ? (
          <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.white }}>
            <StateView type="offline" title="Không tải được đơn hàng" message={query.error?.message ?? 'Vui lòng thử lại'} actionLabel="Thử lại" onAction={() => query.refetch()} />
          </View>
        ) : (
          <View style={{ padding: 12, gap: 12 }}>
            <Skeleton style={{ height: 80 }} />
            <Skeleton style={{ height: 140 }} />
            <Skeleton style={{ height: 100 }} />
          </View>
        )}
      </View>
    );
  }
  const s = order.status;
  const completed = s === 'Hoàn thành' || s === 'Đánh giá';
  const address = order.address;
  const merchandise = order.lines.reduce((sum, l) => sum + (l.oldPrice ?? l.price) * l.quantity, 0);
  const itemsTotal = order.lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const store = stores.find((st) => st.name === order.storeName);
  // Dự kiến giao thành công 3 ngày sau khi đặt (API chưa trả thời điểm giao).
  const created = parseOrderDate(order.createdAt);
  const deliveredAt = order.completedAt ? dashDateTime(order.completedAt) : created ? dashDateTime(nowLike(new Date(created.getTime() + 3 * 86400000))) : '';

  const banner: { icon: RemixName; text: string; tone: 'warning' | 'success' | 'error' } | null =
    s === 'Chờ xác nhận'
      ? { icon: 'timeFill', text: 'Đơn hàng đang đợi cửa hàng xác nhận', tone: 'warning' }
      : s === 'Đã xác nhận'
        ? { icon: 'checkboxCircleFill', text: 'Đơn hàng đã được cửa hàng xác nhận', tone: 'success' }
        : s === 'Đang giao'
          ? { icon: 'truckLine', text: `Đơn hàng đang trong thời gian giao. Thời gian nhận hàng dự kiến: ${deliveryWindow(order.createdAt)}`, tone: 'warning' }
          : completed
            ? { icon: 'checkboxCircleLine', text: `Đã giao thành công ngày ${deliveredAt}`, tone: 'success' }
            : s === 'Huỷ'
              ? { icon: 'closeCircleFill', text: `Đơn hàng đã huỷ lúc ${dashDateTime(order.cancelledAt ?? order.createdAt)}`, tone: 'error' }
              : null;
  const toneColor = { warning: colors.secondaryHover, success: colors.success, error: colors.error };
  const toneBg = { warning: '#FFF1DB', success: '#E6F6ED', error: colors.errorSurface };

  const copyCode = async () => {
    await Clipboard.setStringAsync(order.code);
    toast('Đã sao chép mã đơn hàng');
  };

  // API chưa có huỷ đơn / xác nhận đã nhận hàng → chỉ còn Viết đánh giá + Mua lại.
  const canBuyAgain = order.lines.some((l) => l.productId);
  const actions =
    completed || s === 'Huỷ' ? (
      <>
        {completed && !order.reviewed && (
          <Button title="Viết đánh giá" variant="outline" onPress={() => router.push({ pathname: '/orders/review', params: { id: order.id } })} style={{ flex: 1 }} />
        )}
        {canBuyAgain && (
          <Button
            title="Mua lại"
            onPress={() => {
              reorder(order);
              router.push('/cart');
            }}
            style={{ flex: 1 }}
          />
        )}
      </>
    ) : null;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Chi tiết đơn hàng" shadow />
      <ScrollView
        contentContainerStyle={{ gap: 8, paddingBottom: insets.bottom + (actions ? 100 : 24) }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.primary} />}>
        {/* Trạng thái + Thông tin vận chuyển */}
        <View style={styles.card}>
          {banner && (
            <View style={[styles.banner, { backgroundColor: toneBg[banner.tone] }]}>
              <RIcon name={banner.icon} size={18} color={toneColor[banner.tone]} />
              <AppText size={12} weight="medium" color={toneColor[banner.tone]} style={{ flex: 1 }}>
                {banner.text}
              </AppText>
            </View>
          )}
          {order.statusLabel && (
            <View style={styles.rowBetween}>
              <AppText size={12} color={colors.neutral70}>
                Trạng thái
              </AppText>
              <StatusChip status={s} label={order.statusLabel} />
            </View>
          )}
          <AppText variant="bodySmallSemibold">Thông tin vận chuyển</AppText>
          <View style={styles.rowBetween}>
            <AppText size={12} color={colors.neutral70}>
              Chi nhánh giao
            </AppText>
            <View style={[styles.row, { flexShrink: 1 }]}>
              <RIcon name="mapPinLine" size={16} color={colors.neutral70} />
              <AppText size={12} weight="medium" numberOfLines={1}>
                {order.storeName || (branchProvince ? `Chi nhánh ${branchProvince}` : 'Đang cập nhật')}
              </AppText>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <AppText size={12} color={colors.neutral70}>
              Địa chỉ nhận
            </AppText>
            {address ? (
              <>
                <View style={styles.row}>
                  <RIcon name="mapPinUserFill" size={16} color={colors.neutral70} />
                  <AppText size={12} weight="semibold">
                    {address.receiver}
                  </AppText>
                  <AppText size={12} color={colors.neutral70}>
                    {formatPhoneIntl(address.phone)}
                  </AppText>
                </View>
                <AppText size={12}>{formatAddress(address)}</AppText>
              </>
            ) : (
              <AppText size={12} color={colors.neutral70}>
                Không có thông tin địa chỉ
              </AppText>
            )}
          </View>
        </View>

        {/* Sản phẩm + Thành tiền (Sản phẩm Dropdown) */}
        <View style={styles.card}>
          <AppText variant="bodySmallSemibold">Sản phẩm ({order.lines.length})</AppText>
          {order.lines.map((l, i) => (
            <Pressable key={l.productId + i} onPress={() => router.push({ pathname: '/product/[id]', params: { id: l.productId } })} style={i > 0 && styles.lineDivider}>
              <OrderLineRow {...l} />
            </Pressable>
          ))}
          <Pressable style={[styles.rowBetween, styles.lineDivider]} onPress={() => setShowPayment((v) => !v)}>
            <AppText size={12}>Thành tiền</AppText>
            <View style={styles.row}>
              <AppText size={12} weight="semibold">
                {formatPrice(orderTotal(order))}
              </AppText>
              <RIcon name={showPayment ? 'arrowUpSLine' : 'arrowDownSLine'} size={18} color={colors.neutral70} />
            </View>
          </Pressable>
          {showPayment && (
            <View style={{ gap: 8 }}>
              <AppText size={12} weight="semibold">
                Chi tiết thanh toán
              </AppText>
              <Row label="Tổng tiền hàng" value={formatPrice(merchandise)} />
              <Row label="Giảm giá sản phẩm" value={`-${formatPrice(merchandise - itemsTotal)}`} />
              {order.voucherDiscount > 0 && <Row label="Voucher" value={`-${formatPrice(order.voucherDiscount)}`} />}
              <Row label="Phí vận chuyển" value={formatPrice(order.shippingFee)} />
              <Row label="Giảm giá vận chuyển" value={`-${formatPrice(order.shippingDiscount)}`} color={colors.success} />
              <Row label="Tổng thanh toán" value={formatPrice(orderTotal(order))} bold />
            </View>
          )}
        </View>

        {/* Bạn cần hỗ trợ? */}
        <View style={styles.card}>
          <AppText variant="bodySmallSemibold">Bạn cần hỗ trợ?</AppText>
          <HelpRow icon="chat1Line" label="Liên hệ cửa hàng" onPress={() => openLink(`tel:${(store?.phone || HOTLINE).replace(/[^\d+]/g, '')}`)} />
          <HelpRow icon="questionLine" label="Chăm sóc khách hàng" onPress={() => router.push('/help')} />
        </View>

        {/* Mã đơn & thời gian */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <AppText size={12} weight="semibold">
              Mã đơn hàng
            </AppText>
            <View style={styles.row}>
              <AppText size={12} color={colors.primary}>
                #{order.code}
              </AppText>
              <Pressable onPress={copyCode} style={styles.copy} hitSlop={6}>
                <AppText size={11}>Sao chép</AppText>
              </Pressable>
            </View>
          </View>
          {!!order.payment && <Row label="Phương thức thanh toán" value={order.payment} />}
          <Row label="Thời gian đặt hàng" value={dashDateTime(order.createdAt)} />
          {s !== 'Huỷ' && <Row label="Thời gian vận chuyển" value={deliveryWindow(order.createdAt)} />}
          {order.note ? <Row label="Ghi chú" value={order.note} /> : null}
        </View>
      </ScrollView>

      {actions && <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>{actions}</View>}

    </View>
  );
}

/** Date → "dd/mm/yyyy hh:mm" (để dùng lại dashDateTime). */
function nowLike(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function HelpRow({ icon, label, onPress }: { icon: RemixName; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.rowBetween, styles.helpRow]} onPress={onPress}>
      <View style={styles.row}>
        <RIcon name={icon} size={18} color={colors.text} />
        <AppText size={12}>{label}</AppText>
      </View>
      <RIcon name="arrowRightSLine" size={18} color={colors.neutral70} />
    </Pressable>
  );
}

function Row({ label, value, color = colors.text, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.rowBetween}>
      <AppText size={12} weight={bold ? 'semibold' : 'regular'} color={bold ? colors.text : colors.neutral90}>
        {label}
      </AppText>
      <AppText size={12} weight={bold ? 'semibold' : 'medium'} color={color} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 6 },
  lineDivider: { borderTopWidth: 1, borderTopColor: colors.neutral30, paddingTop: 10 },
  helpRow: { paddingVertical: 6 },
  copy: { borderWidth: 1, borderColor: colors.neutral40, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.white,
    paddingTop: 12,
    paddingHorizontal: 12,
    boxShadow: '0px -8px 9px rgba(0,0,0,0.08)',
  },
});
