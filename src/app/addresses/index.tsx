import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddressBook, useSelectedAddress, useSetDefaultAddress } from '@/api/hooks';
import { formatAddress } from '@/api/mappers';
import { Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { useToast } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Button, Radio, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

/**
 * Địa chỉ nhận hàng (chọn khi checkout) / Địa chỉ trống — GET /customers/me/address-book.
 * Đặt mặc định: POST /customers/me/address-book/{id}/default.
 */
export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { select } = useLocalSearchParams<{ select?: string }>();
  const { isLoggedIn, setAddressId } = useApp();
  const book = useAddressBook();
  const selected = useSelectedAddress();
  const setDefault = useSetDefaultAddress();
  const { addresses } = book;

  const choose = (id: string) => {
    setAddressId(id);
    if (select) {
      toast('Đã cập nhật địa chỉ nhận hàng');
      safeBack();
    }
  };

  const makeDefault = (id: string) =>
    setDefault.mutate(id, {
      onSuccess: () => toast('Đã đặt làm địa chỉ mặc định'),
      onError: (e) => toast(e.message, 'errorWarningLine'),
    });

  const addNew = () => router.push('/addresses/form');

  let content;
  if (!isLoggedIn) {
    content = (
      <View style={styles.center}>
        <StateView
          type="empty"
          title="Bạn chưa đăng nhập"
          message="Đăng nhập để quản lý địa chỉ nhận hàng"
          actionLabel="Đăng nhập"
          onAction={() => router.replace({ pathname: '/login', params: { redirect: '/addresses' } })}
        />
      </View>
    );
  } else if (book.isLoading) {
    content = (
      <View style={{ padding: 12, gap: 8 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 96, borderRadius: 8 }} />
        ))}
      </View>
    );
  } else if (book.isError && !addresses.length) {
    content = (
      <View style={styles.center}>
        <StateView type="offline" title="Không tải được sổ địa chỉ" message={book.error?.message ?? 'Vui lòng thử lại'} actionLabel="Thử lại" onAction={() => book.refetch()} />
      </View>
    );
  } else if (addresses.length === 0) {
    content = (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <RIcon name="mapPin2Fill" size={40} color={colors.primary} />
        </View>
        <AppText variant="h5">Chưa có địa chỉ nhận hàng</AppText>
        <AppText color={colors.neutral70} align="center">
          Thêm địa chỉ để Thế Giới Sữa giao hàng nhanh chóng đến bạn.
        </AppText>
        <Button title="Thêm địa chỉ mới" onPress={addNew} style={{ alignSelf: 'stretch', marginTop: 16 }} />
      </View>
    );
  } else {
    content = (
      <>
        <ScrollView
          contentContainerStyle={{ paddingVertical: 8, gap: 8 }}
          refreshControl={<RefreshControl refreshing={book.isRefetching} onRefresh={() => book.refetch()} tintColor={colors.primary} />}>
          <View style={styles.tip}>
            <RIcon name="informationLine" size={18} color={colors.primary} />
            <AppText size={12} color={colors.primary} style={{ flex: 1 }}>
              Chọn địa chỉ để giao hàng. Bấm biểu tượng bút để sửa thông tin.
            </AppText>
          </View>
          {addresses.map((a) => {
            const active = a.id === selected?.id;
            return (
              <Pressable key={a.id} onPress={() => choose(a.id)} style={[styles.card, active && styles.cardActive]}>
                <Radio selected={active} onPress={() => choose(a.id)} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.row}>
                    <AppText weight="semibold">{a.receiver}</AppText>
                    <View style={styles.vline} />
                    <AppText color={colors.neutral70}>{a.phone}</AppText>
                  </View>
                  <AppText color={colors.neutral90}>{formatAddress(a)}</AppText>
                  {!!a.note && (
                    <AppText size={12} color={colors.neutral70}>
                      Ghi chú: {a.note}
                    </AppText>
                  )}
                  <View style={styles.row}>
                    {a.isDefault ? (
                      <View style={[styles.chip, { borderColor: colors.error }]}>
                        <AppText size={12} color={colors.error}>
                          Mặc định
                        </AppText>
                      </View>
                    ) : null}
                    <View style={styles.chip}>
                      <AppText size={12} color={colors.neutral70}>
                        {a.typeLabel}
                      </AppText>
                    </View>
                    {!a.isDefault && (
                      <Pressable onPress={() => makeDefault(a.id)} disabled={setDefault.isPending} hitSlop={6} style={{ marginLeft: 'auto' }}>
                        <AppText size={12} weight="medium" color={setDefault.isPending ? colors.neutral50 : colors.primary}>
                          Đặt làm mặc định
                        </AppText>
                      </Pressable>
                    )}
                  </View>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/addresses/form', params: { id: a.id } })} hitSlop={10}>
                  <RIcon name="edit2Line" size={20} color={colors.primary} />
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title="Thêm địa chỉ mới" variant="outline" left={<RIcon name="addLine" size={20} />} onPress={addNew} />
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title={select ? 'Địa chỉ nhận hàng' : 'Địa chỉ giao hàng'} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.white },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24, backgroundColor: colors.white },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tip: { flexDirection: 'row', gap: 6, alignItems: 'center', marginHorizontal: 12, padding: 8, borderRadius: 6, backgroundColor: colors.primarySurface },
  card: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.white, alignItems: 'flex-start', borderWidth: 1, borderColor: 'transparent' },
  cardActive: { borderColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vline: { width: 1, height: 14, backgroundColor: colors.neutral40 },
  chip: { borderWidth: 1, borderColor: colors.neutral40, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 12 },
});
