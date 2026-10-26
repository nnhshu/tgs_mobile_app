import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { useToast } from '@/components/overlays';
import { AppText, Button, Icon, Radio, RIcon } from '@/components/ui';
import { getVoucher, voucherCatalog } from '@/data/mock-extra';
import { useApp, useCartTotals } from '@/store/app-store';
import { colors, fonts, formatPrice } from '@/theme';
import { safeBack } from '@/utils/navigation';

/** Chọn voucher khuyến mãi / _chưa chọn sản phẩm. */
export default function SelectVoucherScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { myVouchers, appliedVoucherId, setAppliedVoucherId } = useApp();
  const { total, selected } = useCartTotals();
  const [choice, setChoice] = useState<string | null>(appliedVoucherId);
  const [code, setCode] = useState('');

  const active = myVouchers.filter((v) => v.status === 'active').map((v) => getVoucher(v.voucherId));

  const applyCode = () => {
    const v = voucherCatalog.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    if (!v) {
      toast('Mã khuyến mãi không hợp lệ', 'errorWarningLine');
      return;
    }
    if (total < v.minOrder) {
      toast(`Đơn tối thiểu ${formatPrice(v.minOrder)} để dùng mã`, 'errorWarningLine');
      return;
    }
    setChoice(v.id);
    toast(`Đã chọn mã ${v.code}`);
  };

  const confirm = () => {
    setAppliedVoucherId(choice);
    if (choice) toast('Đã áp dụng voucher');
    safeBack();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Chọn voucher khuyến mãi" />
      <View style={styles.codeRow}>
        <View style={styles.codeInput}>
          <RIcon name="coupon3Line" size={20} color={colors.neutral60} />
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="Nhập mã khuyến mãi"
            placeholderTextColor={colors.neutral60}
            autoCapitalize="characters"
            style={styles.codeText}
          />
        </View>
        <Button title="Áp dụng" size="sm" disabled={!code.trim()} onPress={applyCode} />
      </View>

      {selected.length === 0 && (
        <View style={styles.warning}>
          <RIcon name="informationLine" size={18} color={colors.warning} />
          <AppText size={12} color={colors.warning} style={{ flex: 1 }}>
            Bạn chưa chọn sản phẩm nào. Hãy chọn sản phẩm trong giỏ để áp dụng voucher.
          </AppText>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
        <AppText variant="bodyMediumSemibold">Voucher của bạn ({active.length})</AppText>
        {active.length === 0 && <AppText color={colors.neutral70}>Bạn chưa có voucher khả dụng. Đổi điểm để nhận thêm ưu đãi nhé!</AppText>}
        {active.map((v) => {
          const eligible = selected.length > 0 && total >= v.minOrder;
          const isChosen = choice === v.id;
          return (
            <Pressable key={v.id} disabled={!eligible} onPress={() => setChoice(isChosen ? null : v.id)} style={[styles.voucher, !eligible && { opacity: 0.55 }, isChosen && styles.voucherActive]}>
              {v.fullArt ? (
                <Icon source={v.art} size={64} />
              ) : (
                <View style={styles.art}>
                  <Icon source={v.art} width={32} height={44} />
                </View>
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <AppText weight="semibold">{v.title}</AppText>
                <AppText size={12} color={colors.neutral70}>
                  Đơn tối thiểu {formatPrice(v.minOrder)} • {v.expiry}
                </AppText>
                {!eligible && selected.length > 0 && (
                  <AppText size={12} color={colors.error}>
                    Mua thêm {formatPrice(v.minOrder - total)} để dùng mã này
                  </AppText>
                )}
                <Pressable onPress={() => router.push({ pathname: '/voucher/[id]', params: { id: v.id } })} hitSlop={6}>
                  <AppText size={12} weight="semibold" color={colors.primary}>
                    Điều kiện
                  </AppText>
                </Pressable>
              </View>
              <Radio selected={isChosen} onPress={() => eligible && setChoice(isChosen ? null : v.id)} />
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push('/(tabs)/offers')} style={styles.more}>
          <AppText weight="medium" color={colors.primary}>
            Đổi điểm lấy thêm voucher
          </AppText>
          <RIcon name="arrowRightSLine" size={18} color={colors.primary} />
        </Pressable>
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={choice ? 'Dùng voucher' : 'Không dùng voucher'} onPress={confirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  codeRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: colors.white, marginTop: 4, alignItems: 'center' },
  codeInput: { flex: 1, height: 44, borderWidth: 1, borderColor: colors.neutral40, borderRadius: 6, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  codeText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, padding: 0 },
  warning: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FFF4EC', padding: 10 },
  voucher: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 8, backgroundColor: colors.white, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  voucherActive: { borderColor: colors.primary },
  art: { width: 64, height: 64, borderRadius: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12 },
});
