import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnderlineTabs } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { CancelOrderDialog, OrderActions, OrderLineRow, orderTotal, StatusChip } from '@/components/order-ui';
import { useToast } from '@/components/overlays';
import { AppText, Button, Divider, Icon, RIcon } from '@/components/ui';
import { icons } from '@/assets';
import { Order } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors, formatPrice } from '@/theme';

const TABS = ['Tất cả', 'Chờ xác nhận', 'Đang giao', 'Hoàn thành', 'Đánh giá', 'Huỷ'] as const;
type Tab = (typeof TABS)[number];

/** Đơn hàng: Tất cả / Xác nhận / Đang giao / Hoàn thành / Đánh giá / Huỷ / Đơn hàng trống. */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { orders, setOrderStatus, reorder } = useApp();
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'Tất cả');
  const [cancelId, setCancelId] = useState<string | null>(null);

  const matches = (o: Order, t: Tab) =>
    t === 'Tất cả' || o.status === t || (t === 'Đánh giá' && o.status === 'Hoàn thành' && !o.reviewed);
  const list = orders.filter((o) => matches(o, tab));
  const counts = Object.fromEntries(TABS.slice(1, 5).map((t) => [t, orders.filter((o) => matches(o, t)).length])) as Partial<Record<Tab, number>>;

  const buyAgain = (o: Order) => {
    reorder(o);
    toast('Đã thêm sản phẩm vào giỏ hàng');
    router.push('/cart');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Đơn hàng của tôi" />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />
      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <RIcon name="fileList3Line" size={40} color={colors.primary} />
          </View>
          <AppText variant="h5">Chưa có đơn hàng</AppText>
          <AppText color={colors.neutral70} align="center">
            Các đơn hàng {tab === 'Tất cả' ? '' : `"${tab}" `}của bạn sẽ hiển thị tại đây.
          </AppText>
          <Button title="Mua sắm ngay" size="sm" onPress={() => router.navigate('/(tabs)')} style={{ marginTop: 12, minWidth: 160 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 8, paddingBottom: insets.bottom + 16 }}>
          {list.map((o) => (
            <Pressable key={o.id} style={styles.card} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: o.id } })}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText weight="semibold">#{o.code}</AppText>
                  <AppText size={12} color={colors.neutral60}>
                    {o.createdAt}
                  </AppText>
                </View>
                <StatusChip status={o.reviewed && o.status === 'Hoàn thành' ? 'Hoàn thành' : o.status} />
                <Icon source={icons.seeMore} size={16} />
              </View>
              <Divider color={colors.neutral30} />
              <OrderLineRow {...o.lines[0]} />
              {o.lines.length > 1 && (
                <AppText size={12} color={colors.neutral70} align="center">
                  Xem thêm {o.lines.length - 1} sản phẩm
                </AppText>
              )}
              <Divider color={colors.neutral30} />
              <View style={styles.totalRow}>
                <AppText color={colors.neutral70}>
                  {o.lines.reduce((s, l) => s + l.quantity, 0)} sản phẩm
                </AppText>
                <AppText>
                  Tổng tiền: <AppText variant="bodyMediumSemibold" color={colors.error}>{formatPrice(orderTotal(o))}</AppText>
                </AppText>
              </View>
              <OrderActions
                status={o.status}
                reviewed={o.reviewed}
                onCancel={() => setCancelId(o.id)}
                onBuyAgain={() => buyAgain(o)}
                onReview={() => router.push({ pathname: '/orders/review', params: { id: o.id } })}
                onTrack={() => router.push({ pathname: '/orders/[id]', params: { id: o.id } })}
                onReceived={() => {
                  setOrderStatus(o.id, 'Hoàn thành');
                  toast('Cảm ơn bạn đã xác nhận nhận hàng!');
                }}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <CancelOrderDialog
        visible={!!cancelId}
        onCancel={() => setCancelId(null)}
        onConfirm={(reason) => {
          if (cancelId) setOrderStatus(cancelId, 'Huỷ', { cancelReason: reason });
          setCancelId(null);
          toast('Đã huỷ đơn hàng');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40, paddingBottom: 80, backgroundColor: colors.white },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  card: { backgroundColor: colors.white, padding: 12, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
