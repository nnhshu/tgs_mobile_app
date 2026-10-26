import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { icons } from '@/assets';
import { ScreenHeader } from '@/components/headers';
import { AppText, Button, RIcon } from '@/components/ui';
import { useOpenLink } from '@/hooks/use-open-link';
import { colors } from '@/theme';

/** Đặt hàng thất bại — hiển thị lý do server trả về (hết hàng, đơn trùng...). */
export default function OrderFailedScreen() {
  const { reason, lookupUrl } = useLocalSearchParams<{ reason?: string; lookupUrl?: string }>();
  const openLink = useOpenLink();
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Đặt hàng thất bại" backIcon={icons.closeLine} onBack={() => router.dismissTo('/checkout')} shadow />
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify()}>
          <RIcon name="closeCircleFill" size={64} color={colors.error} />
        </Animated.View>
        <AppText variant="h5">Đặt hàng không thành công</AppText>
        <AppText color={colors.neutral70} align="center">
          {reason ?? 'Đã có lỗi xảy ra trong quá trình xử lý đơn hàng. Vui lòng thử lại sau.'}
        </AppText>
        <View style={{ gap: 12, alignSelf: 'stretch', marginTop: 16 }}>
          <Button title="Thử lại" onPress={() => router.dismissTo('/checkout')} />
          {lookupUrl ? (
            <Button title="Tra cứu đơn hàng" variant="outline" onPress={() => openLink(lookupUrl)} />
          ) : (
            <Button title="Về giỏ hàng" variant="outline" onPress={() => router.dismissTo('/cart')} />
          )}
          <Pressable onPress={() => router.dismissTo('/(tabs)')} style={{ alignSelf: 'center', padding: 8 }}>
            <AppText variant="bodyMediumRegular">Về trang chủ</AppText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingBottom: 80 },
});
