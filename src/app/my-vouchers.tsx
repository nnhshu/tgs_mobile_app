import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnderlineTabs } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { AppText, Button, RIcon } from '@/components/ui';
import { VoucherCard } from '@/components/voucher-card';
import { getVoucher, MyVoucher } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

const TABS = ['Có thể dùng', 'Đã dùng', 'Hết hạn'] as const;
const STATUS: Record<(typeof TABS)[number], MyVoucher['status']> = { 'Có thể dùng': 'active', 'Đã dùng': 'used', 'Hết hạn': 'expired' };

/** Ưu đãi của bạn / _Đã dùng / _Hết hạn / Không có ưu đãi. */
export default function MyVouchersScreen() {
  const insets = useSafeAreaInsets();
  const { myVouchers, setAppliedVoucherId } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Có thể dùng');
  const list = myVouchers.filter((v) => v.status === STATUS[tab]).map((v) => getVoucher(v.voucherId));
  const counts = { 'Có thể dùng': myVouchers.filter((v) => v.status === 'active').length };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Ưu đãi của bạn" />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />
      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <RIcon name="coupon3Line" size={40} color={colors.primary} />
          </View>
          <AppText variant="h5">Không có ưu đãi</AppText>
          <AppText color={colors.neutral70} align="center">
            {tab === 'Có thể dùng' ? 'Đổi điểm thưởng để nhận thêm nhiều voucher hấp dẫn nhé!' : `Chưa có voucher ${tab.toLowerCase()}.`}
          </AppText>
          {tab === 'Có thể dùng' && <Button title="Đổi điểm ngay" size="sm" onPress={() => router.navigate('/(tabs)/offers')} style={{ marginTop: 12, minWidth: 160 }} />}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: insets.bottom + 16 }}>
          {list.map((v, i) => (
            <VoucherCard
              key={v.id + i}
              voucher={{ ...v, action: 'Dùng ngay', points: undefined }}
              stamp={tab === 'Có thể dùng' ? undefined : tab}
              onPress={() => router.push({ pathname: '/voucher/[id]', params: { id: v.id } })}
              onAction={() => {
                setAppliedVoucherId(v.id);
                router.push('/cart');
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
