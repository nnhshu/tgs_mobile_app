import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { useToast } from '@/components/overlays';
import { AppText, Button, Radio, RIcon } from '@/components/ui';
import { maskCard } from '@/data/mock-extra';
import { RemixName } from '@/remix-icons';
import { PaymentMethod, useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

/** Phương thức thanh toán / Phương thức thanh toán_Add Card. */
export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const { payment, setPayment, cards } = useApp();

  const choose = (m: PaymentMethod) => {
    setPayment(m);
    if (select) {
      toast('Đã cập nhật phương thức thanh toán');
      safeBack();
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title={select ? 'Phương thức thanh toán' : 'Quản lý thanh toán'} />
      <ScrollView contentContainerStyle={{ padding: 12, gap: 16 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="bodyMediumSemibold">Thanh toán khi nhận hàng</AppText>
          <PaymentOption current={payment} onChoose={choose} id="cod" icon="cashFill" title="Tiền mặt khi nhận hàng" sub="Thanh toán cho nhân viên giao hàng" />
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="bodyMediumSemibold">Ví điện tử</AppText>
          <PaymentOption current={payment} onChoose={choose} id="wallet" icon="wallet3Fill" title="Ví MoMo" sub="Chuyển sang ứng dụng MoMo để thanh toán" />
        </View>
        <View style={{ gap: 8 }}>
          <AppText variant="bodyMediumSemibold">Thẻ ngân hàng / Thẻ quốc tế</AppText>
          {cards.map((c) => (
            <PaymentOption current={payment} onChoose={choose}
              key={c.id}
              id={`card:${c.id}`}
              icon={c.brand === 'visa' ? 'visaLine' : 'mastercardLine'}
              title={`${c.brand === 'visa' ? 'Visa' : 'Mastercard'} ${maskCard(c.number)}`}
              sub={`${c.holder} • Hết hạn ${c.expiry}${c.isDefault ? ' • Mặc định' : ''}`}
              onEdit={() => router.push({ pathname: '/cards/form', params: { id: c.id } })}
            />
          ))}
          <Pressable style={styles.addCard} onPress={() => router.push('/cards/form')}>
            <RIcon name="addLine" size={20} color={colors.primary} />
            <AppText weight="medium" color={colors.primary}>
              Thêm thẻ mới
            </AppText>
          </Pressable>
        </View>
        <View style={styles.secure}>
          <RIcon name="shieldCheckLine" size={18} color={colors.success} />
          <AppText size={12} color={colors.neutral70} style={{ flex: 1 }}>
            Thông tin thẻ được mã hoá và bảo mật theo chuẩn PCI DSS.
          </AppText>
        </View>
      </ScrollView>
      {select && (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title="Xác nhận" onPress={safeBack} />
        </View>
      )}
    </View>
  );
}

function PaymentOption({
  id,
  icon,
  title,
  sub,
  onEdit,
  current,
  onChoose,
}: {
  id: PaymentMethod;
  icon: RemixName;
  title: string;
  sub?: string;
  onEdit?: () => void;
  current: PaymentMethod;
  onChoose: (m: PaymentMethod) => void;
}) {
  const active = current === id;
  return (
    <Pressable onPress={() => onChoose(id)} style={[styles.option, active && styles.optionActive]}>
      <View style={styles.optionIcon}>
        <RIcon name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium">{title}</AppText>
        {sub && (
          <AppText size={12} color={colors.neutral70}>
            {sub}
          </AppText>
        )}
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={10} style={{ marginRight: 8 }}>
          <RIcon name="edit2Line" size={20} color={colors.primary} />
        </Pressable>
      )}
      <Radio selected={active} onPress={() => onChoose(id)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.neutral40 },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface, borderWidth: 1.5 },
  optionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: colors.white },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12 },
});
