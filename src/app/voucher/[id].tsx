import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { ConfirmDialog, ResultDialog, useToast } from '@/components/overlays';
import { VoucherCard } from '@/components/voucher-card';
import { AppText, Button, Divider, RIcon } from '@/components/ui';
import { getVoucher } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors, formatPrice } from '@/theme';

/**
 * Voucher - Ưu đãi sử dụng Chi tiết / Đổi điểm nhận ưu đãi chi tiết /
 * Đổi điểm_Chưa đủ điểm đổi / Đổi điểm thành công.
 */
export default function VoucherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = getVoucher(id);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { myVouchers, points, redeemVoucher, isLoggedIn, setAppliedVoucherId } = useApp();
  const owned = myVouchers.find((m) => m.voucherId === v.id && m.status === 'active');
  const status = myVouchers.find((m) => m.voucherId === v.id)?.status;
  const needPoints = !owned && v.points !== undefined;
  const enough = points >= (v.points ?? 0);
  const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(v.code);
    toast('Đã sao chép mã');
  };

  const useNow = () => {
    setAppliedVoucherId(v.id);
    toast('Đã áp dụng voucher vào giỏ hàng');
    router.push('/cart');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Chi tiết ưu đãi" />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 24 }}>
        <VoucherCard voucher={{ ...v, action: owned ? 'Dùng ngay' : v.points ? 'Đổi điểm' : 'Lưu mã' }} />

        {owned && (
          <View style={styles.card}>
            <AppText color={colors.neutral70}>Mã ưu đãi</AppText>
            <View style={styles.codeRow}>
              <AppText variant="h4" style={{ flex: 1, letterSpacing: 1 }}>
                {v.code}
              </AppText>
              <Pressable onPress={copy} style={styles.copy} hitSlop={6}>
                <RIcon name="fileCopyLine" size={18} color={colors.primary} />
                <AppText weight="medium" color={colors.primary}>
                  Sao chép
                </AppText>
              </Pressable>
            </View>
          </View>
        )}

        {needPoints && (
          <View style={[styles.card, styles.pointsCard]}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText color={colors.neutral70}>Điểm cần đổi</AppText>
              <AppText variant="h4" color={colors.secondary}>
                {v.points} điểm
              </AppText>
            </View>
            <View style={styles.chip}>
              <AppText size={12} weight="medium" color={enough ? colors.success : colors.error}>
                Bạn có {points} điểm
              </AppText>
            </View>
          </View>
        )}

        {needPoints && !enough && (
          <View style={styles.notEnough}>
            <RIcon name="errorWarningFill" size={18} color={colors.error} />
            <AppText color={colors.error} style={{ flex: 1 }}>
              Bạn còn thiếu {(v.points ?? 0) - points} điểm để đổi ưu đãi này. Mua sắm thêm để tích điểm nhé!
            </AppText>
          </View>
        )}

        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Thông tin ưu đãi</AppText>
          <Row label="Hạn sử dụng" value={v.expiry.replace('Hết hạn ', '')} />
          <Divider />
          <Row label="Đơn tối thiểu" value={formatPrice(v.minOrder)} />
          <Divider />
          <Row label="Giảm tối đa" value={formatPrice(v.maxDiscount)} />
          <Divider />
          <Row label="Áp dụng" value="Mua online & tại cửa hàng" />
        </View>

        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Điều kiện sử dụng</AppText>
          {v.conditions.map((c) => (
            <View key={c} style={{ flexDirection: 'row', gap: 8 }}>
              <AppText color={colors.primary}>•</AppText>
              <AppText style={{ flex: 1 }}>{c}</AppText>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {owned ? (
          <Button title="Dùng ngay" onPress={useNow} />
        ) : status === 'used' || status === 'expired' ? (
          <Button title={status === 'used' ? 'Đã sử dụng' : 'Đã hết hạn'} disabled />
        ) : needPoints ? (
          <Button
            title={enough ? `Đổi ${v.points} điểm` : 'Chưa đủ điểm đổi'}
            disabled={!enough}
            onPress={() => (isLoggedIn ? setConfirm(true) : router.push('/login'))}
          />
        ) : (
          <Button title="Lưu mã" onPress={copy} />
        )}
      </View>

      <ConfirmDialog
        visible={confirm}
        title="Xác nhận đổi điểm"
        message={`Dùng ${v.points} điểm để đổi "${v.title}"? Điểm còn lại: ${points - (v.points ?? 0)}.`}
        confirmLabel="Đổi điểm"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (redeemVoucher(v.id)) setSuccess(true);
        }}
      />
      <ResultDialog
        visible={success}
        title="Đổi điểm thành công!"
        message="Voucher đã được thêm vào ví ưu đãi của bạn."
        actionLabel="Xem ưu đãi của bạn"
        onClose={() => {
          setSuccess(false);
          router.replace('/my-vouchers');
        }}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText color={colors.neutral70}>{label}</AppText>
      <AppText weight="medium" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  card: { backgroundColor: colors.white, borderRadius: 8, padding: 12, gap: 12 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 8, padding: 12 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pointsCard: { flexDirection: 'row', alignItems: 'center' },
  chip: { backgroundColor: colors.neutral20, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  notEnough: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 8, backgroundColor: colors.errorSurface },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12 },
});
