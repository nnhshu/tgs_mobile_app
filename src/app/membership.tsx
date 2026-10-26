import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { AppText, Icon, RIcon } from '@/components/ui';
import { tiers } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

/** Hạng thành viên — tiến độ lên hạng + quyền lợi từng hạng. */
export default function MembershipScreen() {
  const insets = useSafeAreaInsets();
  const { points, profile } = useApp();
  const currentIndex = tiers.reduce((idx, t, i) => (points >= t.min ? i : idx), 0);
  const [selected, setSelected] = useState(currentIndex);
  const next = tiers[currentIndex + 1];
  const progress = next ? (points - tiers[currentIndex].min) / (next.min - tiers[currentIndex].min) : 1;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Hạng thành viên" />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: insets.bottom + 16 }}>
        <View style={styles.hero}>
          <View style={styles.row}>
            <Icon source={tiers[currentIndex].icon} size={48} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText color={colors.white}>{profile.name}</AppText>
              <AppText variant="h4" color={colors.white}>
                Hạng {tiers[currentIndex].name}
              </AppText>
            </View>
            <Pressable onPress={() => router.push('/points-history')} style={styles.pointsPill}>
              <AppText weight="semibold" color={colors.white}>
                {points} điểm
              </AppText>
              <RIcon name="arrowRightSLine" size={18} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <AppText color={colors.white}>
            {next ? `Tích thêm ${next.min - points} điểm để lên hạng ${next.name}` : 'Bạn đang ở hạng cao nhất'}
          </AppText>
        </View>

        <View style={styles.tabs}>
          {tiers.map((t, i) => (
            <Pressable key={t.name} onPress={() => setSelected(i)} style={[styles.tier, i === selected && styles.tierActive]}>
              <Icon source={t.icon} size={28} />
              <AppText size={12} weight={i === selected ? 'semibold' : 'regular'} color={i === selected ? colors.primary : colors.text} numberOfLines={1}>
                {t.name}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Quyền lợi hạng {tiers[selected].name}</AppText>
          <AppText size={12} color={colors.neutral70}>
            Điều kiện: từ {tiers[selected].min} điểm tích luỹ
          </AppText>
          {tiers[selected].perks.map((p) => (
            <View key={p} style={styles.row}>
              <RIcon name="checkboxCircleFill" size={20} color={colors.success} />
              <AppText style={{ flex: 1 }}>{p}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Cách tích điểm</AppText>
          <AppText color={colors.neutral90}>
            Mỗi 10.000 đ chi tiêu khi mua hàng tại app hoặc cửa hàng Thế Giới Sữa được tích 1 điểm. Điểm có hiệu lực 12 tháng và
            dùng để đổi voucher trong mục Ưu đãi.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  hero: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsPill: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 8, padding: 4 },
  tier: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 6 },
  tierActive: { backgroundColor: colors.primarySurface },
  card: { backgroundColor: colors.white, borderRadius: 8, padding: 12, gap: 10 },
});
