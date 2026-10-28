import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrders } from '@/api/hooks';
import { icons } from '@/assets';
import { Skeleton, UnderlineTabs } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { OrderCard } from '@/components/order-ui';
import { SpinningLoader, useToast } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Button, Icon, RIcon } from '@/components/ui';
import { Order } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

const TABS = ['Tất cả', 'Chờ xác nhận', 'Đang giao', 'Hoàn thành', 'Huỷ', 'Đánh giá'] as const;
type Tab = (typeof TABS)[number];

const done = (o: Order) => o.status === 'Hoàn thành' || o.status === 'Đánh giá';

/** Tab nào chứa đơn nào (Figma "Đơn hàng"). */
const matches = (o: Order, t: Tab) => {
  switch (t) {
    case 'Tất cả':
      return true;
    case 'Chờ xác nhận':
      return o.status === 'Chờ xác nhận' || o.status === 'Đã xác nhận';
    case 'Hoàn thành':
      return done(o);
    case 'Đánh giá':
      // Đơn đã hoàn thành và đã được khách chấm sao.
      return done(o) && !!o.reviewed;
    default:
      return o.status === t;
  }
};

/** Đơn hàng — GET /orders: Tất cả / Xác nhận / Đang giao / Hoàn thành / Huỷ / Đánh giá / Đơn hàng trống. */
export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isLoggedIn, reorder } = useApp();
  const query = useOrders();
  const [tab, setTab] = useState<Tab>((TABS as readonly string[]).includes(params.tab ?? '') ? (params.tab as Tab) : 'Tất cả');

  const list = query.orders.filter((o) => matches(o, tab));

  // Tab lọc ít đơn mà server còn trang sau → tự tải thêm.
  useEffect(() => {
    if (list.length < 5 && query.hasNextPage && !query.isFetching) query.fetchNextPage();
  }, [list.length, query]);

  const buyAgain = (o: Order) => {
    if (!o.lines.some((l) => l.productId)) {
      router.push({ pathname: '/orders/[id]', params: { id: o.id } });
      return;
    }
    reorder(o);
    toast('Đã thêm sản phẩm vào giỏ hàng');
    router.push('/cart');
  };

  let body;
  if (!isLoggedIn) {
    body = (
      <View style={styles.empty}>
        <StateView
          type="empty"
          title="Bạn chưa đăng nhập"
          message="Đăng nhập để xem đơn hàng của bạn"
          actionLabel="Đăng nhập"
          onAction={() => router.replace({ pathname: '/login', params: { redirect: '/orders' } })}
        />
      </View>
    );
  } else if (query.isLoading) {
    body = (
      <View style={{ gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton style={{ height: 14, width: '50%' }} />
            <Skeleton style={{ height: 56 }} />
            <Skeleton style={{ height: 14, width: '30%' }} />
          </View>
        ))}
      </View>
    );
  } else if (query.isError && !query.orders.length) {
    body = (
      <View style={styles.empty}>
        <StateView type="offline" title="Không tải được đơn hàng" message={query.error?.message ?? 'Vui lòng thử lại'} actionLabel="Thử lại" onAction={() => query.refetch()} />
      </View>
    );
  } else if (list.length === 0 && query.hasNextPage) {
    body = (
      <View style={styles.empty}>
        <SpinningLoader />
      </View>
    );
  } else if (list.length === 0) {
    // Đơn hàng trống
    body = (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <RIcon name="fileList3Line" size={36} color={colors.primary} />
        </View>
        <AppText variant="bodyMediumSemibold">Bạn chưa có đơn hàng nào</AppText>
        <AppText size={12} color={colors.neutral70} align="center">
          Đơn hàng của bạn sẽ hiển thị tại đây
        </AppText>
        <Button title="Khám phá sản phẩm" size="sm" onPress={() => router.navigate('/(tabs)/products')} style={{ marginTop: 12, paddingHorizontal: 32 }} />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ gap: 8, paddingBottom: insets.bottom + 16 }}
        renderItem={({ item }) => <OrderCard order={item} onBuyAgain={buyAgain} />}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.primary} />}
        onEndReachedThreshold={0.5}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        ListFooterComponent={query.isFetchingNextPage ? <SpinningLoader size={28} /> : null}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Đơn hàng"
        right={
          <Pressable onPress={() => router.push('/help')} hitSlop={8}>
            <Icon source={icons.moreFill} size={24} />
          </Pressable>
        }
      />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 40, paddingBottom: 80, backgroundColor: colors.white },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  skeletonCard: { backgroundColor: colors.white, padding: 12, gap: 10 },
});
