import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { AppText, Icon } from '@/components/ui';
import { colors } from '@/theme';

const TABS: Record<string, { label: string; icon: number; activeIcon: number }> = {
  index: { label: 'Trang chủ', icon: icons.tabHome, activeIcon: icons.tabHomeActive },
  products: { label: 'Sản phẩm', icon: icons.tabProducts, activeIcon: icons.tabProductsActive },
  offers: { label: 'Ưu đãi', icon: icons.tabOffers, activeIcon: icons.tabOffersActive },
  account: { label: 'Tài khoản', icon: icons.tabAccount, activeIcon: icons.tabAccountActive },
};

/** Thanh điều hướng dưới dạng kính mờ ("Bottom Navbar" trong Figma). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.52)', 'rgba(255,255,255,0.13)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={styles.item}>
              <Icon source={focused ? tab.activeIcon : tab.icon} size={24} />
              <AppText
                size={12}
                weight={focused ? 'semibold' : 'regular'}
                color={focused ? '#2568D1' : colors.text}
                align="center"
                numberOfLines={1}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.75)',
    boxShadow: '8px 8px 96px rgba(0,0,0,0.15)',
  },
  row: { height: 54, flexDirection: 'row', justifyContent: 'center', gap: 20, paddingHorizontal: 12 },
  item: { width: 68, alignItems: 'center', paddingTop: 8, gap: 2 },
});
