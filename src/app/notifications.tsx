import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { UnderlineTabs } from '@/components/form';
import { AppText, RIcon } from '@/components/ui';
import { NotificationItem } from '@/data/mock-extra';
import { RemixName } from '@/remix-icons';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

const TABS = ['Tất cả', 'Đơn hàng', 'Khuyến mãi', 'Hệ thống'] as const;
const ICON: Record<NotificationItem['type'], { name: RemixName; color: string; bg: string }> = {
  'Đơn hàng': { name: 'truckLine', color: colors.primary, bg: colors.primarySurface },
  'Khuyến mãi': { name: 'giftFill', color: colors.secondary, bg: colors.secondarySurface },
  'Hệ thống': { name: 'notification3Fill', color: colors.neutral70, bg: colors.neutral20 },
};

/** Notification Empty / Notification Filled. */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, markRead, markAllRead, unreadCount } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Tất cả');
  const list = tab === 'Tất cả' ? notifications : notifications.filter((n) => n.type === tab);

  const open = (n: NotificationItem) => {
    markRead(n.id);
    if (n.type === 'Đơn hàng') router.push('/orders');
    else if (n.type === 'Khuyến mãi') router.push('/my-vouchers');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Thông báo"
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <AppText weight="medium" color={colors.primary}>
                Đọc tất cả
              </AppText>
            </Pressable>
          ) : null
        }
      />
      <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
      {list.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <RIcon name="notification3Line" size={40} color={colors.primary} />
          </View>
          <AppText variant="h5">Chưa có thông báo</AppText>
          <AppText color={colors.neutral70} align="center">
            Thông báo về đơn hàng và ưu đãi sẽ hiển thị tại đây.
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
          {list.map((n) => {
            const ic = ICON[n.type];
            return (
              <Pressable key={n.id} onPress={() => open(n)} style={[styles.item, !n.read && styles.unread]}>
                <View style={[styles.icon, { backgroundColor: ic.bg }]}>
                  <RIcon name={ic.name} size={22} color={ic.color} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={styles.titleRow}>
                    <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                      {n.title}
                    </AppText>
                    {!n.read && <View style={styles.dot} />}
                  </View>
                  <AppText color={colors.neutral90} numberOfLines={2}>
                    {n.body}
                  </AppText>
                  <AppText size={12} color={colors.neutral60}>
                    {n.time}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40, paddingBottom: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  unread: { backgroundColor: colors.primarySurface },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
});
