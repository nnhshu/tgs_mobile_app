import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStores } from '@/api/hooks';
import { formatDistance } from '@/api/mappers';
import { icons } from '@/assets';
import { ConfirmDialog, SpinningLoader, useToast } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Button, Divider, Icon, RIcon } from '@/components/ui';
import { useOpenLink } from '@/hooks/use-open-link';
import { RemixName } from '@/remix-icons';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

/** Chi tiết cửa hàng + "Xác nhận đã chọn". */
export default function StoreDetailScreen() {
  const openLink = useOpenLink();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stores, isLoading } = useStores();
  const store = stores.find((s) => s.id === id);
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { selectedStore, setSelectedStore } = useApp();
  const [confirm, setConfirm] = useState(false);

  if (!store) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', backgroundColor: colors.white }]}>
        {isLoading ? (
          <SpinningLoader />
        ) : (
          <StateView type="empty" title="Không tìm thấy cửa hàng" message="Cửa hàng có thể đã ngừng hoạt động." actionLabel="Quay lại" onAction={safeBack} />
        )}
      </View>
    );
  }

  const isCurrent = selectedStore?.id === store.id;
  const hasCoords = store.lat !== undefined && store.lng !== undefined;

  const openMap = () => {
    const q = hasCoords ? `${store.lat},${store.lng}` : encodeURIComponent(`${store.name}, ${store.address}`);
    const native = Platform.OS === 'ios' ? `maps://?q=${encodeURIComponent(store.name)}&ll=${q}` : `geo:${hasCoords ? q : '0,0'}?q=${q}`;
    openLink(native, `https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const actions: { icon: RemixName; label: string; onPress: () => void; disabled?: boolean }[] = [
    { icon: 'compassDiscoverFill', label: 'Chỉ đường', onPress: openMap },
    { icon: 'phoneFill', label: 'Gọi điện', onPress: () => openLink(`tel:${store.phone}`), disabled: !store.phone },
    { icon: 'shareForwardFill', label: 'Chia sẻ', onPress: () => Share.share({ message: `${store.name}\n${store.address}${store.phone ? `\nĐT: ${store.phone}` : ''}` }) },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.hero}>
          <Image source={store.image} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Pressable onPress={safeBack} style={[styles.back, { top: insets.top + 8 }]} hitSlop={10}>
            <Icon source={icons.arrowLeft} size={24} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={{ gap: 8 }}>
            <View style={styles.row}>
              <AppText variant="h4" style={{ flex: 1 }}>
                {store.name}
              </AppText>
              {store.distanceKm !== undefined && (
                <AppText variant="bodyMediumSemibold" color={colors.secondary}>
                  {formatDistance(store.distanceKm)}
                </AppText>
              )}
            </View>
            <AppText color={colors.neutral70}>{store.address}</AppText>
          </View>
          <View style={styles.actions}>
            {actions.map((a) => (
              <Pressable key={a.label} style={[styles.action, a.disabled && { opacity: 0.4 }]} onPress={a.onPress} disabled={a.disabled}>
                <View style={styles.actionIcon}>
                  <RIcon name={a.icon} size={22} color={colors.primary} />
                </View>
                <AppText weight="medium">{a.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.card, { gap: 12 }]}>
          <AppText variant="bodyMediumSemibold">Thông tin cửa hàng</AppText>
          <InfoLine label="Khu vực" value={store.province} />
          <Divider />
          <InfoLine label="Điện thoại" value={store.phone || 'Đang cập nhật'} />
          <Divider />
          <InfoLine label="Dịch vụ" value="Giao hàng tận nơi, nhận tại cửa hàng" />
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={isCurrent ? 'Đang là cửa hàng của bạn' : 'Chọn cửa hàng này'} disabled={isCurrent} onPress={() => setConfirm(true)} />
      </View>

      <ConfirmDialog
        visible={confirm}
        title="Xác nhận đã chọn"
        message={`Bạn sẽ mua hàng tại ${store.name}. Giá và tồn kho sẽ cập nhật theo khu vực ${store.province}.`}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setSelectedStore(store);
          setConfirm(false);
          toast(`Đã chọn ${store.name}`);
        }}
      />
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLine}>
      <AppText color={colors.neutral70} style={{ width: 110 }}>
        {label}
      </AppText>
      <AppText style={{ flex: 1 }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { height: 240, backgroundColor: colors.neutral30 },
  back: { position: 'absolute', left: 16, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 100, padding: 6 },
  card: { backgroundColor: colors.white, padding: 12, gap: 16, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', justifyContent: 'space-around' },
  action: { alignItems: 'center', gap: 6 },
  actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  infoLine: { flexDirection: 'row', gap: 8 },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12, boxShadow: '0px -8px 9px rgba(0,0,0,0.08)' },
});
