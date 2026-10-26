import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons, img } from '@/assets';
import { PointsPill } from '@/components/points-pill';
import { AppText, Icon, SectionHeader } from '@/components/ui';
import { VoucherCard } from '@/components/voucher-card';
import { getVoucher, tiers, voucherCatalog } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { blueGradient, colors } from '@/theme';

const TIERS = [
  { label: 'Mới', icon: img.loyaltyMoi, overflow: true },
  { label: 'Đồng', icon: img.loyaltyDong },
  { label: 'Bạc', icon: img.loyaltyBac },
  { label: 'Vàng', icon: img.loyaltyVang },
  { label: 'Kim cương', icon: img.loyaltyKimCuong },
];

export default function OffersScreen() {
  const insets = useSafeAreaInsets();
  const { profile, points, myVouchers, isLoggedIn, setAppliedVoucherId } = useApp();
  const tierIndex = tiers.reduce((idx, t, i) => (points >= t.min ? i : idx), 0);
  const nextTier = tiers[tierIndex + 1];
  const mine = myVouchers.filter((v) => v.status === 'active').map((v) => getVoucher(v.voucherId));
  const redeemable = voucherCatalog.filter((v) => v.points);
  const openVoucher = (id: string) => router.push({ pathname: '/voucher/[id]', params: { id } });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <LinearGradient {...blueGradient} style={[styles.hero, { paddingTop: insets.top + 13 }]}>
          <Image source={img.giftBox} style={styles.giftBox} contentFit="cover" contentPosition="top left" />
          <View style={styles.userRow}>
            <View style={{ gap: 2 }}>
              <AppText weight="semibold" color={colors.white}>
                {isLoggedIn ? profile.name : 'Khách'}
              </AppText>
              <AppText size={12} color={colors.white}>
                {isLoggedIn ? `Thành viên ${tiers[tierIndex].name}` : 'Đăng nhập để tích điểm'}
              </AppText>
            </View>
            <Pressable onPress={() => router.push(isLoggedIn ? '/points-history' : '/login')}>
              <PointsPill points={isLoggedIn ? points : 0} />
            </Pressable>
          </View>
          <Pressable style={styles.barcodeCard} onPress={() => !isLoggedIn && router.push('/login')}>
            <Image source={img.barcode} style={{ width: 115.9, height: 36 }} contentFit="cover" />
            <AppText align="center">{isLoggedIn ? 'M1610200459' : 'Đăng nhập để nhận mã thành viên'}</AppText>
          </Pressable>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={{ gap: 12 }}>
            {/* Thang bậc chi tiêu */}
            <Pressable style={styles.loyalty} onPress={() => router.push('/membership')}>
              <Image source={img.bgRadialLoyalty} style={StyleSheet.absoluteFill} contentFit="fill" />
              <AppText variant="bodyMediumSemibold" weight="bold" align="center">
                Thang bậc chi tiêu
              </AppText>
              <View style={styles.tierLabels}>
                {TIERS.map((t) => (
                  <AppText key={t.label} variant="xsmallSemibold" align="center" style={styles.tierLabel}>
                    {t.label}
                  </AppText>
                ))}
              </View>
              <View style={styles.tierTrack}>
                {TIERS.map((t) => (
                  <View key={t.label} style={styles.tierSlot}>
                    {t.overflow ? (
                      <Icon source={t.icon} size={30} style={{ margin: -3 }} />
                    ) : (
                      <Icon source={t.icon} size={24} />
                    )}
                  </View>
                ))}
              </View>
              <AppText align="center">
                {nextTier ? (
                  <>
                    Thêm <AppText weight="semibold" color={colors.primary}>{nextTier.min - points} điểm</AppText> lên hạng {nextTier.name}
                  </>
                ) : (
                  'Bạn đang ở hạng cao nhất'
                )}
              </AppText>
            </Pressable>

            <View style={styles.quickRow}>
              <Pressable style={styles.quick} onPress={() => router.push('/membership')}>
                <View style={styles.quickIcon}>
                  <Icon source={icons.crown} width={22.4} height={16} />
                </View>
                <AppText weight="semibold">Hạng Thành viên</AppText>
              </Pressable>
              <Pressable style={styles.quick} onPress={() => router.push('/my-vouchers')}>
                <View style={[styles.quickIcon, { opacity: 0.8 }]}>
                  <Icon source={icons.voucher} width={21.5} height={13.5} />
                </View>
                <AppText weight="semibold" style={{ opacity: 0.8 }}>
                  Ưu đãi của bạn
                </AppText>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <SectionHeader title="Các ưu đãi của bạn" onAction={() => router.push('/my-vouchers')} />
            {mine.length === 0 ? (
              <AppText color={colors.neutral70}>Bạn chưa có ưu đãi nào. Đổi điểm bên dưới để nhận voucher nhé!</AppText>
            ) : (
              mine.slice(0, 2).map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={{ ...v, action: 'Dùng ngay', points: undefined }}
                  onPress={() => openVoucher(v.id)}
                  onAction={() => {
                    setAppliedVoucherId(v.id);
                    router.push('/cart');
                  }}
                />
              ))
            )}
          </View>

          <View style={{ gap: 12 }}>
            <SectionHeader title="Ưu đãi mới nhất" onAction={() => router.push({ pathname: '/product-list', params: { title: 'Khuyến mãi' } })} />
            {redeemable.map((v) => (
              <VoucherCard key={v.id} voucher={{ ...v, action: 'Đổi điểm' }} onPress={() => openVoucher(v.id)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.neutral20 },
  hero: { paddingHorizontal: 12, paddingBottom: 12 + 73, gap: 12 },
  giftBox: { position: 'absolute', left: 81, top: 34, width: 188, height: 147, opacity: 0.12 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barcodeCard: { height: 64, borderRadius: 8, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: colors.backgroundAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -73,
    paddingTop: 12,
    paddingHorizontal: 12,
    gap: 24,
  },
  loyalty: { height: 148, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 15 },
  // Cùng padding/slot 24px với tierTrack để nhãn nằm thẳng trên icon.
  tierLabels: { flexDirection: 'row', width: 339, paddingHorizontal: 19.5, justifyContent: 'space-between', marginTop: 4 },
  tierLabel: { width: 70, marginHorizontal: -23 },
  tierTrack: {
    width: 339,
    height: 36,
    borderRadius: 64,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 19.5,
  },
  tierSlot: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  quick: { flex: 1, height: 64, backgroundColor: colors.white, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
