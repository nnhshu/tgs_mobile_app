import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { img } from '@/assets';
import { ScreenHeader } from '@/components/headers';
import { AppText, RIcon } from '@/components/ui';
import { useOpenLink } from '@/hooks/use-open-link';
import { colors } from '@/theme';

const STATS = [
  { value: '15+', label: 'Năm hoạt động' },
  { value: '120+', label: 'Cửa hàng' },
  { value: '1 triệu+', label: 'Khách hàng' },
];

/** Về Thế Giới Sữa. */
export default function AboutScreen() {
  const openLink = useOpenLink();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Về Thế Giới Sữa" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.hero}>
          <Image source={img.bgRadialHeader} style={StyleSheet.absoluteFill} contentFit="fill" />
          <Image source={img.logo} style={{ width: 233, height: 48 }} contentFit="contain" />
        </View>
        <View style={{ padding: 16, gap: 16 }}>
          <AppText variant="bodyMediumRegular" style={{ lineHeight: 24 }}>
            Thế Giới Sữa là hệ thống bán lẻ chuyên các sản phẩm sữa, dinh dưỡng và đồ dùng mẹ & bé chính hãng. Chúng tôi cam kết
            mang đến sản phẩm chất lượng, giá tốt và dịch vụ giao hàng nhanh chóng cho mọi gia đình Việt.
          </AppText>
          <View style={styles.stats}>
            {STATS.map((s) => (
              <View key={s.label} style={styles.stat}>
                <AppText variant="h4" color={colors.primary}>
                  {s.value}
                </AppText>
                <AppText size={12} color={colors.neutral70} align="center">
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
          <AppText variant="bodyMediumSemibold">Cam kết của chúng tôi</AppText>
          {['100% hàng chính hãng, hoàn tiền 200% nếu là hàng giả', 'Đổi trả miễn phí trong 30 ngày', 'Giao nhanh 2 giờ tại nội thành'].map((t) => (
            <View key={t} style={styles.row}>
              <RIcon name="shieldCheckLine" size={20} color={colors.success} />
              <AppText style={{ flex: 1 }}>{t}</AppText>
            </View>
          ))}
          <Pressable style={styles.row} onPress={() => openLink('https://thegioisua.com')}>
            <RIcon name="globalLine" size={20} color={colors.primary} />
            <AppText color={colors.primary}>thegioisua.com</AppText>
          </Pressable>
          <AppText size={12} color={colors.neutral60} align="center">
            Phiên bản 1.0.0
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { height: 160, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 4, padding: 12, borderRadius: 8, backgroundColor: colors.primarySurface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
