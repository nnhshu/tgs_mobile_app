import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UnderlineTabs } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { AppText, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

const TABS = ['Tất cả', 'Nhận điểm', 'Dùng điểm'] as const;

/** Lịch sử điểm (2 biến thể trong Figma: có dữ liệu / theo tab). */
export default function PointsHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { points, pointHistory } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tất cả');
  const list = pointHistory.filter((p) => (tab === 'Tất cả' ? true : tab === 'Nhận điểm' ? p.amount > 0 : p.amount < 0));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Lịch sử điểm" />
      <View style={styles.summary}>
        <AppText color={colors.neutral70}>Điểm hiện có</AppText>
        <AppText variant="h2" color={colors.secondary}>
          {points}
        </AppText>
      </View>
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
        {list.length === 0 && (
          <AppText color={colors.neutral70} align="center" style={{ marginTop: 48 }}>
            Chưa có giao dịch điểm
          </AppText>
        )}
        {list.map((p) => (
          <View key={p.id} style={styles.item}>
            <View style={[styles.icon, { backgroundColor: p.amount > 0 ? colors.secondarySurface : colors.primarySurface }]}>
              <RIcon name={p.amount > 0 ? 'copperCoinLine' : 'exchangeFundsLine'} size={22} color={p.amount > 0 ? colors.secondary : colors.primary} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="medium" numberOfLines={2}>
                {p.title}
              </AppText>
              <AppText size={12} color={colors.neutral60}>
                {p.date}
              </AppText>
            </View>
            <AppText variant="bodyMediumSemibold" color={p.amount > 0 ? colors.success : colors.error}>
              {p.amount > 0 ? `+${p.amount}` : p.amount}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  summary: { alignItems: 'center', paddingVertical: 20, gap: 4, backgroundColor: colors.primarySurface },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
