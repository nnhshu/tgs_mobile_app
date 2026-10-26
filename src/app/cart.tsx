import { useNetworkState } from 'expo-network';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Button, Checkbox, Divider, Icon, QuantityStepper, RIcon } from '@/components/ui';
import { formatDistance } from '@/api/mappers';
import { useApp, useCartTotals, VOUCHERS_ENABLED } from '@/store/app-store';
import { colors, formatPrice, priceLabel } from '@/theme';

/**
 * Giỏ hàng: Guest / Đã Login / Empty / Lỗi / Đã add Voucher / Đổi cửa hàng / Giá đã đổi /
 * Voucher Invalid / Đã hết hàng / Login Required khi Checkout.
 */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const network = useNetworkState();
  const {
    cart,
    isLoggedIn,
    setQuantity,
    removeFromCart,
    removeSelected,
    toggleSelect,
    toggleSelectAll,
    selectedStore: store,
    province,
    setAppliedVoucherId,
  } = useApp();
  const { selected, total, saving, voucher, voucherValid, voucherItemsDiscount, subtotal } = useCartTotals();
  const [loginSheet, setLoginSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'selected' | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const inStock = cart.filter((i) => i.product.stock !== 0);
  const allSelected = inStock.length > 0 && inStock.every((i) => i.selected);
  const someSelected = selected.length > 0;
  const grandTotal = total - (voucherValid ? voucherItemsDiscount : 0);

  const placeOrder = () => {
    if (!someSelected) {
      toast('Vui lòng chọn sản phẩm để đặt hàng', 'informationLine');
      return;
    }
    if (selected.some((i) => i.product.stock === 0)) {
      toast('Có sản phẩm đã hết hàng, vui lòng bỏ chọn', 'errorWarningLine');
      return;
    }
    if (!isLoggedIn) {
      setLoginSheet(true);
      return;
    }
    router.push('/checkout');
  };

  if (network.isConnected === false) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.white }]}>
        <ScreenHeader title="Giỏ hàng" />
        <View style={styles.center}>
          <StateView
            type="offline"
            title="Không thể tải giỏ hàng"
            message="Kiểm tra kết nối và thử lại"
            actionLabel="Thử lại"
            onAction={() => toast('Đang kết nối lại...', 'refreshLine')}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={`Giỏ hàng (${cart.length})`}
        right={
          cart.length > 0 ? (
            <Pressable onPress={() => (someSelected ? setConfirmDelete('selected') : toast('Chưa chọn sản phẩm nào', 'informationLine'))} hitSlop={8}>
              <Icon source={icons.more} size={24} />
            </Pressable>
          ) : null
        }
      />

      {cart.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.white }]}>
          <View style={styles.emptyIcon}>
            <RIcon name="shoppingCart2Line" size={44} color={colors.primary} />
          </View>
          <AppText variant="h5">Giỏ hàng trống</AppText>
          <AppText color={colors.neutral70} align="center">
            Hãy chọn thêm sản phẩm bạn yêu thích nhé!
          </AppText>
          <Button title="Mua sắm ngay" onPress={() => router.navigate('/(tabs)')} style={{ alignSelf: 'stretch', marginTop: 16, marginHorizontal: 32 }} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingTop: 4, gap: 8, paddingBottom: 16 }}>
            {!isLoggedIn && (
              <Pressable style={styles.guest} onPress={() => router.push({ pathname: '/login', params: { redirect: '/cart' } })}>
                <RIcon name="user3Line" size={20} color={colors.primary} />
                <AppText style={{ flex: 1 }}>
                  <AppText weight="semibold" color={colors.primary}>
                    Đăng nhập
                  </AppText>{' '}
                  để nhận ưu đãi và tích điểm cho đơn hàng
                </AppText>
                <RIcon name="arrowRightSLine" size={20} color={colors.primary} />
              </Pressable>
            )}

            {/* Đổi cửa hàng */}
            <Pressable style={styles.storeRow} onPress={() => router.push({ pathname: '/stores', params: { select: '1' } })}>
              <RIcon name="store2Line" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <AppText size={12} color={colors.neutral70}>
                  Mua tại cửa hàng
                </AppText>
                <AppText weight="semibold" numberOfLines={1}>
                  {store ? store.name : 'Chọn cửa hàng gần bạn'}{' '}
                  {store?.distanceKm !== undefined && (
                    <AppText weight="semibold" color={colors.secondary}>
                      {formatDistance(store.distanceKm)}
                    </AppText>
                  )}
                </AppText>
              </View>
              <AppText weight="medium" color={colors.primary}>
                {store ? 'Đổi' : 'Chọn'}
              </AppText>
            </Pressable>

            {
              <View style={styles.notice}>
                <RIcon name="informationLine" size={18} color={colors.warning} />
                <AppText size={12} color={colors.warning} style={{ flex: 1 }}>
                  Giá và tồn kho đang tính theo khu vực {province}.
                </AppText>
              </View>
            }

            <View style={styles.card}>
              <View style={styles.selectAll}>
                <Checkbox checked={someSelected} partial={!allSelected} onPress={toggleSelectAll} />
                <AppText weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                  Chọn tất cả ({inStock.length} sản phẩm)
                </AppText>
                <Pressable onPress={() => (someSelected ? setConfirmDelete('selected') : toast('Chưa chọn sản phẩm nào', 'informationLine'))} hitSlop={8}>
                  <Icon source={icons.trash} size={20} />
                </Pressable>
              </View>
              <Divider />
              {cart.map(({ product, quantity, selected: isSelected, variant }) => {
                const soldOut = product.stock === 0;
                return (
                  <View key={product.id} style={[styles.item, soldOut && { opacity: 0.6 }]}>
                    <Checkbox
                      checked={isSelected && !soldOut}
                      onPress={() => (soldOut ? toast('Sản phẩm đã hết hàng', 'errorWarningLine') : toggleSelect(product.id))}
                    />
                    <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
                      <ProductImage product={product} size={80} radius={6} />
                    </Pressable>
                    <View style={{ flex: 1, gap: 8 }}>
                      <AppText numberOfLines={1}>{product.name}</AppText>
                      {variant && (
                        <View style={styles.variant}>
                          <AppText size={12} color={colors.neutral70}>
                            {variant}
                          </AppText>
                        </View>
                      )}
                      <View style={{ gap: 12 }}>
                        <View style={{ gap: 4 }}>
                          <AppText variant="bodyMediumSemibold" color={colors.error}>
                            {priceLabel(product.price)}
                          </AppText>
                          {product.oldPrice && (
                            <AppText size={12} color={colors.neutral70} strike>
                              {formatPrice(product.oldPrice)}
                            </AppText>
                          )}
                        </View>
                        <View style={styles.actions}>
                          {soldOut ? (
                            <AppText weight="semibold" color={colors.error}>
                              Đã hết hàng
                            </AppText>
                          ) : (
                            <QuantityStepper
                              value={quantity}
                              onChange={(v) => {
                                if (product.stock !== undefined && v > product.stock) toast(`Chỉ còn ${product.stock} sản phẩm`, 'errorWarningLine');
                                setQuantity(product.id, v);
                              }}
                            />
                          )}
                          <Pressable onPress={() => setConfirmDelete(product.id)} hitSlop={8}>
                            <AppText color={colors.secondary}>Xoá</AppText>
                          </Pressable>
                        </View>
                        {product.stock !== undefined && product.stock > 0 && (
                          <AppText size={12} color={colors.warning}>
                            Còn {product.stock} sản phẩm
                          </AppText>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {voucher && !voucherValid && (
            <View style={[styles.notice, { backgroundColor: colors.errorSurface }]}>
              <RIcon name="errorWarningFill" size={18} color={colors.error} />
              <AppText size={12} color={colors.error} style={{ flex: 1 }}>
                Voucher {voucher.code} chưa đủ điều kiện (đơn tối thiểu {formatPrice(voucher.minOrder)}).
              </AppText>
              <Pressable onPress={() => setAppliedVoucherId(null)} hitSlop={8}>
                <AppText size={12} weight="semibold" color={colors.error}>
                  Bỏ chọn
                </AppText>
              </Pressable>
            </View>
          )}

          {VOUCHERS_ENABLED && (
            <Pressable style={styles.voucherRow} onPress={() => router.push('/vouchers')}>
              <View style={styles.row}>
                <Icon source={icons.coupon} size={24} />
                <AppText weight="semibold">Voucher</AppText>
              </View>
              <View style={[styles.row, { gap: 4, flexShrink: 1 }]}>
                {voucher ? (
                  <View style={styles.voucherChip}>
                    <AppText size={12} weight="medium" color={colors.error} numberOfLines={1}>
                      {voucher.kind === 'freeship' ? 'Miễn phí vận chuyển' : `-${voucher.value}%`}
                    </AppText>
                  </View>
                ) : (
                  <AppText color={colors.neutral50}>Chọn voucher</AppText>
                )}
                <Icon source={icons.chevronRight} size={24} />
              </View>
            </Pressable>
          )}

          <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            {showBreakdown && (
              <View style={styles.breakdown}>
                <Line label="Tổng tiền hàng" value={formatPrice(subtotal)} />
                <Line label="Giảm giá sản phẩm" value={`-${formatPrice(subtotal - total)}`} />
                {voucherValid && voucherItemsDiscount > 0 && <Line label="Voucher" value={`-${formatPrice(voucherItemsDiscount)}`} />}
              </View>
            )}
            <Pressable style={styles.totalBlock} onPress={() => setShowBreakdown((v) => !v)}>
              <View style={styles.totalRow}>
                <AppText variant="bodyMedium">Tổng tiền</AppText>
                <View style={[styles.row, { gap: 4 }]}>
                  <AppText variant="h3" color={colors.error}>
                    {formatPrice(grandTotal)}
                  </AppText>
                  <Icon source={icons.chevronUp} size={24} style={{ transform: [{ rotate: showBreakdown ? '180deg' : '0deg' }] }} />
                </View>
              </View>
              {saving > 0 && someSelected && (
                <AppText size={12} color={colors.success}>
                  Tiết kiệm {formatPrice(subtotal - grandTotal)}
                </AppText>
              )}
            </Pressable>
            <Button
              title={`Đặt hàng${someSelected ? ` (${selected.length})` : ''}`}
              disabled={!someSelected}
              onPress={placeOrder}
              style={{ marginHorizontal: 12 }}
            />
          </View>
        </>
      )}

      <ConfirmDialog
        visible={confirmDelete !== null}
        title={confirmDelete === 'selected' ? 'Xoá sản phẩm đã chọn?' : 'Xoá sản phẩm?'}
        message={confirmDelete === 'selected' ? `${selected.length} sản phẩm sẽ bị xoá khỏi giỏ hàng.` : 'Sản phẩm sẽ bị xoá khỏi giỏ hàng.'}
        confirmLabel="Xoá"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete === 'selected') removeSelected();
          else if (confirmDelete) removeFromCart(confirmDelete);
          setConfirmDelete(null);
          toast('Đã xoá khỏi giỏ hàng');
        }}
      />

      {/* Login Required khi Checkout */}
      <BottomSheet
        visible={loginSheet}
        onClose={() => setLoginSheet(false)}
        title="Đăng nhập để đặt hàng"
        footer={
          <Button
            title="Đăng nhập / Đăng ký"
            onPress={() => {
              setLoginSheet(false);
              router.push({ pathname: '/login', params: { redirect: '/checkout' } });
            }}
          />
        }>
        <View style={{ alignItems: 'center', gap: 12, paddingBottom: 12 }}>
          <View style={styles.emptyIcon}>
            <RIcon name="user3Line" size={40} color={colors.primary} />
          </View>
          <AppText color={colors.neutral70} align="center">
            Bạn cần đăng nhập để hoàn tất đơn hàng, theo dõi trạng thái giao hàng và tích điểm thành viên.
          </AppText>
        </View>
      </BottomSheet>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <AppText color={colors.neutral90}>{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 80 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guest: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: colors.primarySurface },
  storeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.white },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF4EC' },
  card: { backgroundColor: colors.white, padding: 12, gap: 12 },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  variant: { alignSelf: 'flex-start', backgroundColor: colors.neutral20, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  voucherRow: {
    height: 48,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  voucherChip: { borderWidth: 1, borderColor: colors.error, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 1 },
  bottom: { backgroundColor: colors.white, boxShadow: '-8px 4px 9px rgba(0,0,0,0.08)' },
  breakdown: { paddingHorizontal: 20, paddingTop: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral30, paddingBottom: 12 },
  totalBlock: { paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20, gap: 4, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
});
