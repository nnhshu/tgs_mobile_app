import { useNetworkState } from 'expo-network';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, ConfirmDialog, LoginPromptSheet, useToast } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Button, Checkbox, Icon, QuantityStepper, RIcon } from '@/components/ui';
import { CartItem, useApp, useCartTotals, VOUCHERS_ENABLED } from '@/store/app-store';
import { colors, formatPrice, priceLabel } from '@/theme';

/** Chỉ báo "Còn N sản phẩm" khi sắp hết. */
const LOW_STOCK = 10;

type Issue = 'soldOut' | 'unavailable' | null;
/** Sản phẩm không đặt được tại cửa hàng đang chọn. */
const issueOf = (i: CartItem): Issue => (i.product.sellsAtBranch === false || i.product.contactPrice ? 'unavailable' : i.product.stock === 0 ? 'soldOut' : null);

/**
 * Giỏ hàng (Figma): Guest / Đã Login / Đã add Voucher / Chi tiết khuyến mãi / Đã hết hàng / Giá đã đổi /
 * Voucher Invalid / Đổi cửa hàng / Login Required khi Checkout / Empty.
 */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const network = useNetworkState();
  const { cart, isLoggedIn, setQuantity, removeFromCart, removeSelected, toggleSelect, toggleSelectAll, selectedStore: store, ackCartChanges } = useApp();
  const { selected, total, voucher, voucherValid, voucherItemsDiscount, subtotal } = useCartTotals();
  const [loginSheet, setLoginSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | 'selected' | 'blocked' | null>(null);
  const [breakdown, setBreakdown] = useState(false);

  const orderable = cart.filter((i) => !issueOf(i));
  const blocked = cart.filter((i) => issueOf(i));
  const allSelected = orderable.length > 0 && orderable.every((i) => i.selected);
  const someSelected = selected.length > 0;
  const grandTotal = total - (voucherValid ? voucherItemsDiscount : 0);
  const saving = subtotal - grandTotal;

  // Các tình huống cần báo (theo thứ tự ưu tiên của Figma).
  const storeChanged = !!store && cart.some((i) => i.addedStoreId && i.addedStoreId !== store.id);
  const priceChanged = !storeChanged && cart.some((i) => i.addedPrice !== undefined && !issueOf(i) && i.addedPrice !== i.product.price);
  const unavailableCount = cart.filter((i) => issueOf(i) === 'unavailable').length;
  const soldOutCount = cart.filter((i) => issueOf(i) === 'soldOut').length;
  const mustRemove = blocked.some((i) => i.selected);

  const placeOrder = () => {
    if (!someSelected) {
      toast('Vui lòng chọn sản phẩm để đặt hàng', 'informationLine');
      return;
    }
    if (!isLoggedIn) {
      setLoginSheet(true);
      return;
    }
    ackCartChanges();
    setBreakdown(false);
    router.push('/checkout');
  };

  if (network.isConnected === false) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.white }]}>
        <ScreenHeader title="Giỏ hàng" />
        <View style={styles.center}>
          <StateView type="offline" title="Không thể tải giỏ hàng" message="Kiểm tra kết nối và thử lại" actionLabel="Thử lại" onAction={() => toast('Đang kết nối lại...', 'refreshLine')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={`Giỏ hàng (${cart.length})`}
        shadow
        right={
          <Pressable onPress={() => setMenu(true)} hitSlop={8}>
            <Icon source={icons.moreFill} size={24} />
          </Pressable>
        }
      />

      {cart.length === 0 ? (
        // Empty
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <RIcon name="shoppingCart2Line" size={36} color={colors.primary} />
          </View>
          <AppText variant="bodyMediumSemibold">Giỏ hàng của bạn đang trống</AppText>
          <AppText size={12} color={colors.neutral70} align="center">
            Khám phá sản phẩm và thêm vào giỏ hàng
          </AppText>
          <Button title="Khám phá sản phẩm" size="sm" onPress={() => router.navigate('/(tabs)/products')} style={styles.emptyBtn} />
        </View>
      ) : (
        <>
          <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ paddingBottom: 16 }}>
            <View style={styles.selectAll}>
              <Checkbox checked={someSelected} partial={!allSelected} onPress={toggleSelectAll} />
              <AppText style={{ flex: 1 }} numberOfLines={1}>
                Chọn tất cả ({cart.length} sản phẩm)
              </AppText>
              <Pressable onPress={() => (someSelected ? setConfirmDelete('selected') : toast('Chưa chọn sản phẩm nào', 'informationLine'))} hitSlop={8}>
                <Icon source={icons.trash} size={20} />
              </Pressable>
            </View>

            <View style={styles.list}>
              {cart.map((item) => {
                const { product, quantity, selected: isSelected, variant } = item;
                const issue = issueOf(item);
                return (
                  <View key={product.id} style={styles.item}>
                    <Checkbox checked={isSelected} onPress={() => toggleSelect(product.id)} />
                    <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })} style={issue && styles.dim}>
                      <ProductImage product={product} size={64} radius={6} />
                    </Pressable>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={[{ gap: 4 }, issue && styles.dim]}>
                        <AppText size={13} numberOfLines={1}>
                          {product.name}
                        </AppText>
                        {variant && (
                          <AppText size={12} color={colors.neutral70}>
                            {variant}
                          </AppText>
                        )}
                        <AppText variant="bodySmallSemibold" color={colors.error}>
                          {priceLabel(product.price)}
                        </AppText>
                        {product.oldPrice && (
                          <AppText size={11} color={colors.neutral70} strike>
                            {formatPrice(product.oldPrice)}
                          </AppText>
                        )}
                      </View>
                      <View style={styles.actions}>
                        <View style={[issue && styles.dim, { pointerEvents: issue ? 'none' : 'auto' }]}>
                          <QuantityStepper
                            value={quantity}
                            onChange={(v) => {
                              if (product.stock !== undefined && v > product.stock) toast(`Chỉ còn ${product.stock} sản phẩm`, 'errorWarningLine');
                              setQuantity(product.id, v);
                            }}
                          />
                        </View>
                        <Pressable onPress={() => setConfirmDelete(product.id)} hitSlop={8}>
                          <AppText size={12} color={colors.secondary}>
                            Xoá
                          </AppText>
                        </Pressable>
                      </View>
                      {issue === 'soldOut' ? (
                        <AppText size={11} color={colors.error}>
                          Đã hết hàng
                        </AppText>
                      ) : issue === 'unavailable' ? (
                        <AppText size={11} color={colors.error}>
                          Không khả dụng tại cửa hàng này
                        </AppText>
                      ) : product.stock !== undefined && product.stock > 0 && product.stock <= LOW_STOCK ? (
                        <AppText size={11} color={colors.secondaryHover}>
                          Còn {product.stock} sản phẩm
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Thông báo theo tình huống */}
            <View style={{ gap: 8, paddingHorizontal: 12 }}>
              {storeChanged && store && (
                <Notice tone="warning" text={`Cửa hàng đã đổi sang ${store.name}, đang kiểm tra tồn kho.`} />
              )}
              {unavailableCount > 0 && store && <Notice tone="error" text={`${unavailableCount} sản phẩm không có tại ${store.name}`} />}
              {soldOutCount > 0 && <Notice tone="error" text="Xoá sản phẩm hết hàng để tiếp tục" />}
              {priceChanged && <Notice tone="warning" icon text="Giá sản phẩm đã thay đổi so với lúc thêm vào giỏ" />}
              {voucher && !voucherValid && <Notice tone="error" text="Voucher không áp dụng cho đơn hàng này" />}
            </View>
          </ScrollView>

          {VOUCHERS_ENABLED && (
            <Pressable style={styles.voucherRow} onPress={() => router.push('/vouchers')}>
              <View style={styles.row}>
                <Icon source={icons.coupon} size={24} />
                <AppText weight="medium">Voucher</AppText>
              </View>
              <View style={[styles.row, { gap: 4, flexShrink: 1 }]}>
                {voucher && voucherValid ? (
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
            <TotalBlock total={grandTotal} saving={someSelected ? saving : 0} open={false} onToggle={() => someSelected && setBreakdown(true)} />
            {mustRemove ? (
              // Có sản phẩm hết hàng / không khả dụng đang được chọn → phải xoá trước.
              <Button title={soldOutCount && !unavailableCount ? 'Đặt hàng' : 'Xoá sản phẩm để tiếp tục'} disabled style={{ marginHorizontal: 12 }} />
            ) : (
              <Button title="Đặt hàng" disabled={!someSelected} onPress={placeOrder} style={{ marginHorizontal: 12 }} />
            )}
          </View>
        </>
      )}

      {/* Chi tiết khuyến mãi */}
      <BottomSheet
        visible={breakdown}
        onClose={() => setBreakdown(false)}
        title="Chi tiết khuyến mãi"
        footer={
          <View style={{ gap: 12 }}>
            <TotalBlock total={grandTotal} saving={saving} open onToggle={() => setBreakdown(false)} />
            <Button title="Đặt hàng" disabled={mustRemove} onPress={placeOrder} />
          </View>
        }>
        <View style={{ gap: 14, paddingBottom: 12 }}>
          <Line label="Tổng tiền hàng" value={formatPrice(subtotal)} />
          <Line label="Giảm giá sản phẩm" value={`-${formatPrice(subtotal - total)}`} />
          {voucherValid && voucherItemsDiscount > 0 && <Line label="Voucher giảm giá" value={`-${formatPrice(voucherItemsDiscount)}`} />}
          <Line label="Tiết kiệm" value={`-${formatPrice(saving)}`} valueColor={colors.error} />
          <View style={{ gap: 4 }}>
            <Line label="Tổng số tiền" value={formatPrice(grandTotal)} />
            <AppText size={12} color={colors.neutral60} align="right">
              Số tiền cuối cùng thanh toán
            </AppText>
          </View>
          <View style={styles.sheetDivider} />
          <Line label="Phí vận chuyển" value="Tính ở bước thanh toán" valueColor={colors.neutral70} />
        </View>
      </BottomSheet>

      {/* Menu "…": đổi cửa hàng, xoá sản phẩm */}
      <BottomSheet visible={menu} onClose={() => setMenu(false)}>
        <MenuRow
          icon="store2Line"
          label="Đổi cửa hàng"
          sub={store?.name ?? 'Chưa chọn cửa hàng'}
          onPress={() => {
            setMenu(false);
            router.push({ pathname: '/stores', params: { select: '1' } });
          }}
        />
        {blocked.length > 0 && (
          <MenuRow
            icon="deleteBinLine"
            label={`Xoá ${blocked.length} sản phẩm không đặt được`}
            onPress={() => {
              setMenu(false);
              setConfirmDelete('blocked');
            }}
          />
        )}
        {someSelected && (
          <MenuRow
            icon="deleteBinLine"
            label={`Xoá ${selected.length} sản phẩm đã chọn`}
            onPress={() => {
              setMenu(false);
              setConfirmDelete('selected');
            }}
          />
        )}
      </BottomSheet>

      <ConfirmDialog
        visible={confirmDelete !== null}
        title={confirmDelete === 'selected' || confirmDelete === 'blocked' ? 'Xoá các sản phẩm này?' : 'Xoá sản phẩm?'}
        message="Sản phẩm sẽ bị xoá khỏi giỏ hàng."
        cancelLabel="Huỷ bỏ"
        confirmLabel="Xoá"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete === 'selected') removeSelected();
          else if (confirmDelete === 'blocked') blocked.forEach((i) => removeFromCart(i.product.id));
          else if (confirmDelete) removeFromCart(confirmDelete);
          setConfirmDelete(null);
          toast('Đã xoá khỏi giỏ hàng');
        }}
      />

      {/* Login Required khi Checkout */}
      <LoginPromptSheet
        visible={loginSheet}
        title="Đăng nhập để thanh toán"
        message="Giỏ hàng của bạn sẽ được giữ nguyên sau khi đăng nhập"
        onClose={() => setLoginSheet(false)}
        onLogin={() => {
          setLoginSheet(false);
          router.push({ pathname: '/login', params: { redirect: '/checkout' } });
        }}
      />
    </View>
  );
}

/** "Tổng tiền 698.000 đ ˄" + "Tiết kiệm …" — bấm để mở / đóng Chi tiết khuyến mãi. */
function TotalBlock({ total, saving, open, onToggle }: { total: number; saving: number; open: boolean; onToggle: () => void }) {
  return (
    <Pressable style={styles.totalBlock} onPress={onToggle}>
      <View style={styles.totalRow}>
        <AppText variant="bodyMedium">Tổng tiền</AppText>
        <View style={[styles.row, { gap: 4 }]}>
          <AppText variant="h3" color={colors.error}>
            {formatPrice(total)}
          </AppText>
          <Icon source={icons.chevronUp} size={24} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </View>
      </View>
      {saving > 0 && (
        <AppText size={12} color={colors.success}>
          Tiết kiệm {formatPrice(saving)}
        </AppText>
      )}
    </Pressable>
  );
}

function Notice({ tone, text, icon }: { tone: 'error' | 'warning'; text: string; icon?: boolean }) {
  const color = tone === 'error' ? colors.error : colors.secondaryHover;
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'error' ? colors.errorSurface : '#FFF6E5' }]}>
      {icon && <RIcon name="errorWarningFill" size={16} color={color} />}
      <AppText size={12} color={color} style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}

function Line({ label, value, valueColor = colors.text }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <AppText>{label}</AppText>
      <AppText color={valueColor}>{value}</AppText>
    </View>
  );
}

function MenuRow({ icon, label, sub, onPress }: { icon: 'store2Line' | 'deleteBinLine'; label: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <RIcon name={icon} size={22} color={icon === 'deleteBinLine' ? colors.error : colors.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyMedium">{label}</AppText>
        {sub && (
          <AppText size={12} color={colors.neutral70} numberOfLines={1}>
            {sub}
          </AppText>
        )}
      </View>
      <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 80, backgroundColor: colors.white },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyBtn: { marginTop: 12, paddingHorizontal: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectAll: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  list: { paddingHorizontal: 12, paddingVertical: 12, gap: 20 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dim: { opacity: 0.45 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4 },
  voucherRow: {
    height: 48,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral30,
  },
  voucherChip: { borderWidth: 1, borderColor: colors.error, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 1 },
  bottom: { backgroundColor: colors.white, boxShadow: '-8px 4px 9px rgba(0,0,0,0.08)' },
  totalBlock: { paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20, gap: 4, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  sheetDivider: { height: 1, backgroundColor: colors.neutral30 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
});
