import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRequestLocation, useStores } from '@/api/hooks';
import { formatDistance, Store } from '@/api/mappers';
import { icons } from '@/assets';
import { Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Icon, Photo, RIcon } from '@/components/ui';
import { normalize } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';
import { safeBack } from '@/utils/navigation';

/** Danh sách cửa hàng gần nhất / Tìm kiếm cửa hàng / Xin quyền vị trí — dữ liệu từ /stores. */
export default function StoresScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const { selectedStore, setSelectedStore, locationGranted, userLocation } = useApp();
  const { stores, isLoading, isError, refetch } = useStores();
  const requestLocation = useRequestLocation();
  const [askLocation, setAskLocation] = useState(locationGranted === null);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [province, setProvince] = useState<string | null>(null);
  const [confirmStore, setConfirmStore] = useState<Store | null>(null);

  const provinces = useMemo(() => {
    const count = new Map<string, number>();
    stores.forEach((s) => count.set(s.province, (count.get(s.province) ?? 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [stores]);

  const list = useMemo(() => {
    const q = normalize(query);
    return stores.filter(
      (s) => (!province || s.province === province) && (!q || normalize(`${s.name} ${s.address} ${s.province}`).includes(q)),
    );
  }, [stores, query, province]);

  const enableLocation = async () => {
    setAskLocation(false);
    setLocating(true);
    try {
      const ok = await requestLocation();
      if (!ok) toast('Bạn có thể bật quyền vị trí trong Cài đặt', 'informationLine');
    } catch {
      toast('Không lấy được vị trí hiện tại', 'errorWarningLine');
    } finally {
      setLocating(false);
    }
  };

  const onPick = (store: Store) => {
    if (select) setConfirmStore(store);
    else router.push({ pathname: '/stores/[id]', params: { id: store.id } });
  };

  const submitSearch = () => {
    const q = query.trim();
    if (q) setRecent((r) => [q, ...r.filter((x) => x !== q)].slice(0, 5));
    setFocused(false);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title={select ? 'Chọn cửa hàng' : 'Cửa hàng'} />

      <View style={styles.top}>
        <View style={[styles.search, focused && { borderColor: colors.primary }]}>
          <Icon source={icons.searchGray} size={20} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={submitSearch}
            placeholder="Tìm theo tên, địa chỉ, tỉnh/thành"
            placeholderTextColor={colors.neutral70}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <RIcon name="closeCircleFill" size={20} color={colors.neutral60} />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.locationRow} onPress={enableLocation}>
          <View style={styles.locationIcon}>
            <RIcon name="compassDiscoverFill" size={16} color={colors.white} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="semibold" numberOfLines={1}>
              {userLocation ? 'Đang sắp xếp theo vị trí của bạn' : 'Dùng vị trí hiện tại để tìm cửa hàng gần nhất'}
            </AppText>
            <AppText color={colors.neutral70} numberOfLines={1}>
              {locating ? 'Đang xác định vị trí...' : userLocation ? 'Bấm để cập nhật vị trí' : locationGranted === false ? 'Chưa cấp quyền vị trí' : 'Chưa bật định vị'}
            </AppText>
          </View>
          <Icon source={icons.seeMore} size={16} />
        </Pressable>
      </View>

      {focused && !query && recent.length > 0 ? (
        <ScrollView style={styles.list} contentContainerStyle={{ padding: 12, gap: 16 }} keyboardShouldPersistTaps="handled">
          <AppText weight="semibold" color={colors.neutral70}>
            Tìm kiếm gần đây
          </AppText>
          {recent.map((r) => (
            <Pressable key={r} style={styles.recentRow} onPress={() => setQuery(r)}>
              <RIcon name="timeFill" size={20} color={colors.neutral60} />
              <AppText variant="bodyMediumRegular" style={{ flex: 1 }}>
                {r}
              </AppText>
              <RIcon name="arrowRightUpLine" size={20} color={colors.neutral60} />
            </Pressable>
          ))}
        </ScrollView>
      ) : isLoading ? (
        <View style={[styles.list, { padding: 12, gap: 12 }]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <Skeleton style={{ width: 100, height: 76 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton style={{ height: 16, width: '70%' }} />
                <Skeleton style={{ height: 12 }} />
              </View>
            </View>
          ))}
        </View>
      ) : isError ? (
        <View style={[styles.list, { justifyContent: 'center' }]}>
          <StateView type="offline" title="Không tải được cửa hàng" message="Kiểm tra kết nối và thử lại" actionLabel="Thử lại" onAction={() => refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={list}
          keyExtractor={(s) => s.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          initialNumToRender={12}
          ListHeaderComponent={
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.provinces}>
                {[null, ...provinces].map((p) => {
                  const active = province === p;
                  return (
                    <Pressable key={p ?? 'all'} onPress={() => setProvince(p)} style={[styles.provinceChip, active && styles.provinceChipActive]}>
                      <AppText weight={active ? 'semibold' : 'regular'} color={active ? colors.primary : colors.text}>
                        {p ?? 'Tất cả'}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <AppText variant="h5" style={styles.listTitle}>
                Danh sách cửa hàng ({list.length})
              </AppText>
            </View>
          }
          ListEmptyComponent={<StateView type="empty" title="Không tìm thấy cửa hàng" message="Thử tìm bằng tên đường, quận hoặc tỉnh khác nhé!" style={{ marginTop: 48 }} />}
          renderItem={({ item: s }) => {
            const selected = selectedStore?.id === s.id;
            return (
              <Pressable onPress={() => onPick(s)} style={[styles.store, selected && styles.storeSelected]}>
                <Photo source={s.image} radius={6} style={styles.storeImage} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.storeTitle}>
                    <AppText variant="bodyMediumSemibold" style={{ flex: 1 }} numberOfLines={1}>
                      {s.name}
                    </AppText>
                    {s.distanceKm !== undefined && (
                      <AppText weight="semibold" color={colors.secondary}>
                        {formatDistance(s.distanceKm)}
                      </AppText>
                    )}
                  </View>
                  <AppText color={colors.neutral70} numberOfLines={2}>
                    {s.address}
                  </AppText>
                  {selected && (
                    <AppText size={12} weight="semibold" color={colors.primary}>
                      Cửa hàng của bạn
                    </AppText>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Xin quyền vị trí (trước khi gọi hộp thoại hệ thống) */}
      <ConfirmDialog
        visible={askLocation}
        icon={
          <View style={styles.permissionIcon}>
            <RIcon name="mapPin2Fill" size={32} color={colors.primary} />
          </View>
        }
        title="Cho phép truy cập vị trí"
        message="Thế Giới Sữa cần vị trí của bạn để tìm cửa hàng gần nhất và giao hàng nhanh hơn."
        cancelLabel="Để sau"
        confirmLabel="Cho phép"
        onCancel={() => setAskLocation(false)}
        onConfirm={enableLocation}
      />

      <ConfirmDialog
        visible={!!confirmStore}
        title="Xác nhận chọn cửa hàng"
        message={confirmStore ? `Đơn hàng sẽ được chuẩn bị tại ${confirmStore.name}. Giá và tồn kho sẽ cập nhật theo khu vực ${confirmStore.province}.` : ''}
        onCancel={() => setConfirmStore(null)}
        onConfirm={() => {
          if (confirmStore) setSelectedStore(confirmStore);
          toast(`Đã chọn ${confirmStore?.name}`);
          setConfirmStore(null);
          safeBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: { backgroundColor: colors.white, padding: 12, gap: 16, marginTop: 4 },
  search: { height: 48, borderRadius: 128, backgroundColor: colors.background, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  searchInput: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, padding: 0 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, backgroundColor: colors.white, marginTop: 8 },
  provinces: { gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  provinceChip: { height: 32, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: colors.neutral40, justifyContent: 'center' },
  provinceChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  listTitle: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 8 },
  store: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  storeSelected: { backgroundColor: colors.primarySurface },
  storeImage: { width: 100, height: 76 },
  storeTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permissionIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
});
