import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { icons } from '@/assets';
import { ScreenHeader } from '@/components/headers';
import { AppText, Button, Icon } from '@/components/ui';
import { colors } from '@/theme';

/** Hoàn tất đặt đơn. */
export default function OrderSuccessScreen() {
  // id / code = đơn vừa tạo trên website (POST /orders).
  const { id, code } = useLocalSearchParams<{ id?: string; code?: string }>();
  const goHome = () => router.dismissTo('/(tabs)');
  const orderCode = code ? `#${code}` : '';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Đặt hàng thành công" backIcon={icons.closeLine} onBack={goHome} shadow />
      <View style={styles.body}>
        <View style={styles.content}>
          <View style={{ gap: 16, alignItems: 'center' }}>
            <Animated.View entering={ZoomIn.springify()}>
              <Icon source={icons.success} size={56} />
            </Animated.View>
            <View style={{ gap: 4, alignItems: 'center' }}>
              <AppText variant="h5">Đặt hàng thành công!</AppText>
              <AppText color={colors.neutral70} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                Mã đơn {orderCode} • Dự kiến giao 30- 45 phút
              </AppText>
            </View>
          </View>
          <View style={{ gap: 16, alignItems: 'center' }}>
            <Button title="Xem đơn hàng" onPress={() => {
                router.dismissTo('/(tabs)');
                router.push(id ? { pathname: '/orders/[id]', params: { id } } : '/orders');
              }} style={{ width: 259 }} />
            <Pressable onPress={goHome} hitSlop={8}>
              <AppText variant="bodyMediumRegular">Về trang chủ</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  body: { flex: 1, backgroundColor: colors.white, marginTop: 4, alignItems: 'center', paddingTop: 201 },
  content: { alignSelf: 'stretch', marginHorizontal: 24, gap: 24, alignItems: 'center' },
});
