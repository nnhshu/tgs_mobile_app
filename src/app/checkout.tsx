import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { ChoiceChips, FormField, Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { AppText, Button, Divider, Icon, Radio, RIcon } from '@/components/ui';
import { quickNotes } from '@/data/mock-extra';
import { useOrderDraft } from '@/hooks/use-order-draft';
import { RemixName } from '@/remix-icons';
import { usePaymentMethods, useShippingRates } from '@/api/hooks';
import { formatAddress, formatDistance } from '@/api/mappers';
import { useApp } from '@/store/app-store';
import { colors, fonts, formatPrice, priceLabel } from '@/theme';

const Dot = () => <View style={styles.dot} />;

const PAYMENT_ICON: Record<string, RemixName> = { cod: 'cashLine', vietqr_gateway: 'qrCodeLine' };

/**
 * Xác nhận đơn hàng (Checkout) + Ghi chú đơn hàng.
 * Phí giao: POST /shipping/rates · Thanh toán: GET /payment-methods · Đặt đơn ở màn payment-processing (POST /orders).
 */
export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { payment, setPayment, note, setNote, selectedStore: store } = useApp();
  const draft = useOrderDraft();
  const { selected, blocked, address, subtotal, discount, itemsTotal } = draft;
  const shipping = useShippingRates(blocked.length ? [] : draft.items, draft.shipping);
  const methods = usePaymentMethods();
  const [rateId, setRateId] = useState<string | null>(null);
  const [noteSheet, setNoteSheet] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note);

  // Phương thức giao đang chọn: lựa chọn của khách nếu còn trong danh sách, không thì cái đầu tiên.
  const rate = shipping.rates.find((r) => r.id === rateId) ?? shipping.rates[0];
  const paymentItems = methods.data?.items ?? [];
  const activePayment = paymentItems.some((m) => m.id === payment) ? payment : (methods.data?.default ?? paymentItems[0]?.id);
  const shippingFee = rate?.cost ?? 0;
  const grandTotal = itemsTotal + shippingFee;
  const blockedIds = new Set(blocked.map((b) => b.item.product.id));

  const placeOrder = () => {
    if (!address) {
      router.push('/addresses/form');
      return;
    }
    if (!store) {
      router.push({ pathname: '/stores', params: { select: '1' } });
      return;
    }
    if (!rate || !activePayment || blocked.length) return;
    if (activePayment !== payment) setPayment(activePayment);
    router.push({
      pathname: '/payment-processing',
      params: { rateId: rate.id, rateLabel: rate.label, rateCost: String(rate.cost), payment: activePayment },
    });
  };
  const canOrder = selected.length > 0 && !blocked.length && !!rate && !!activePayment;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Xác nhận đơn hàng" shadow />

      <ScrollView contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
        {/* Thông tin vận chuyển */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <AppText variant="bodyMediumSemibold" style={{ flex: 1 }}>
              Thông tin vận chuyển
            </AppText>
            <Pressable style={styles.changeChip} onPress={() => router.push({ pathname: '/addresses', params: { select: '1' } })}>
              <AppText weight="semibold" color={colors.primary}>
                Thay đổi
              </AppText>
            </Pressable>
          </View>
          <Pressable style={styles.rowBetween} onPress={() => router.push({ pathname: '/stores', params: { select: '1' } })}>
            <View style={{ gap: 8 }}>
              <AppText color={colors.neutral70}>Chi nhánh giao</AppText>
              <View style={styles.row}>
                <Icon source={icons.mapPin} size={20} />
                <AppText weight="semibold" color={store ? colors.text : colors.error} style={{ flexShrink: 1 }} numberOfLines={1}>
                  {store ? store.name : 'Chưa chọn — bấm để chọn cửa hàng'}
                </AppText>
                {store?.distanceKm !== undefined && (
                  <AppText weight="semibold" color={colors.secondary}>
                    {formatDistance(store.distanceKm)}
                  </AppText>
                )}
              </View>
            </View>
            <Icon source={icons.seeMore} size={16} />
          </Pressable>
          <Divider />
          <Pressable style={styles.rowBetween} onPress={() => router.push({ pathname: '/addresses', params: { select: '1' } })}>
            <View style={{ gap: 8, flex: 1 }}>
              <AppText color={colors.neutral70}>Địa chỉ nhận</AppText>
              {address ? (
                <>
                  <View style={styles.row}>
                    <Icon source={icons.mapPinUser} size={20} />
                    <AppText weight="semibold">{address.receiver}</AppText>
                    <AppText color={colors.neutral70}>{address.phone}</AppText>
                  </View>
                  <AppText>{formatAddress(address)}</AppText>
                </>
              ) : (
                <AppText color={colors.error}>Chưa có địa chỉ — bấm để thêm</AppText>
              )}
            </View>
            <Icon source={icons.seeMore} size={16} />
          </Pressable>
        </View>

        {/* Phương thức vận chuyển — POST /shipping/rates */}
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Phương thức vận chuyển</AppText>
          {!address ? (
            <AppText color={colors.neutral70}>Thêm địa chỉ nhận để xem phí giao hàng.</AppText>
          ) : blocked.length ? (
            <AppText color={colors.neutral70}>Bỏ các sản phẩm không bán tại chi nhánh để xem phí giao hàng.</AppText>
          ) : shipping.isLoading ? (
            [0, 1].map((i) => <Skeleton key={i} style={{ height: 56, borderRadius: 8 }} />)
          ) : shipping.isError ? (
            <Pressable style={styles.inlineError} onPress={() => shipping.refetch()}>
              <RIcon name="errorWarningLine" size={18} color={colors.error} />
              <AppText color={colors.error} style={{ flex: 1 }}>
                {shipping.error.message}
              </AppText>
              <AppText weight="semibold" color={colors.primary}>
                Thử lại
              </AppText>
            </Pressable>
          ) : (
            shipping.rates.map((r) => {
              const active = r.id === rate?.id;
              return (
                <Pressable key={r.id} onPress={() => setRateId(r.id)} style={[styles.option, styles.shipOption, active && styles.optionActive]}>
                  <View style={{ gap: 4, flex: 1 }}>
                    <AppText variant="bodyMediumSemibold">{r.label}</AppText>
                    <View style={styles.row}>
                      {r.cost === 0 ? <AppText color={colors.success}>Miễn phí</AppText> : <AppText>Phí {formatPrice(r.cost)}</AppText>}
                      {r.originalCost > r.cost && (
                        <>
                          <Dot />
                          <AppText color={colors.neutral60} strike>
                            {formatPrice(r.originalCost)}
                          </AppText>
                        </>
                      )}
                    </View>
                  </View>
                  <Radio selected={active} onPress={() => setRateId(r.id)} />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Sản phẩm */}
        <View style={[styles.card, { gap: 16 }]}>
          <AppText variant="bodyMediumSemibold">Sản phẩm ({selected.length})</AppText>
          <View style={{ gap: 12 }}>
            {selected.map(({ product, quantity, variant }, i) => (
              <View key={product.id} style={{ gap: 12 }}>
                {i > 0 && <Divider />}
                <View style={styles.product}>
                  <ProductImage product={product} size={80} radius={6} />
                  <View style={{ flex: 1, gap: 8 }}>
                    <AppText numberOfLines={1}>{product.name}</AppText>
                    {variant && (
                      <AppText size={12} color={colors.neutral70}>
                        {variant}
                      </AppText>
                    )}
                    {blockedIds.has(product.id) && (
                      <AppText size={12} color={colors.error}>
                        {blocked.find((b) => b.item.product.id === product.id)?.reason}
                      </AppText>
                    )}
                    <View style={styles.rowBetween}>
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
                      <View style={[styles.row, { gap: 4 }]}>
                        <Icon source={icons.closeSm} size={16} />
                        <AppText weight="medium">{quantity}</AppText>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Ghi chú */}
        <Pressable
          style={[styles.card, { gap: 16, borderRadius: 8 }]}
          onPress={() => {
            setNoteDraft(note);
            setNoteSheet(true);
          }}>
          <View style={styles.rowBetween}>
            <AppText variant="bodyMediumSemibold">Ghi chú</AppText>
            <Icon source={icons.seeMore} size={16} />
          </View>
          <AppText weight="medium" color={note ? colors.text : colors.neutral70} numberOfLines={2}>
            {note || 'Để lại lời nhắn'}
          </AppText>
        </Pressable>

        {/* Phương thức thanh toán — GET /payment-methods */}
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Phương thức thanh toán</AppText>
          {methods.isLoading ? (
            [0, 1].map((i) => <Skeleton key={i} style={{ height: 48, borderRadius: 8 }} />)
          ) : methods.isError ? (
            <Pressable style={styles.inlineError} onPress={() => methods.refetch()}>
              <RIcon name="errorWarningLine" size={18} color={colors.error} />
              <AppText color={colors.error} style={{ flex: 1 }}>
                {methods.error.message}
              </AppText>
              <AppText weight="semibold" color={colors.primary}>
                Thử lại
              </AppText>
            </Pressable>
          ) : (
            paymentItems.map((p) => {
              const active = p.id === activePayment;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPayment(p.id)}
                  style={[styles.option, styles.payOption, active ? { backgroundColor: colors.primarySurface, borderWidth: 0 } : null]}>
                  <View style={[styles.row, { flex: 1 }]}>
                    <RIcon name={PAYMENT_ICON[p.id] ?? 'bankCardLine'} size={24} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <AppText weight="medium">{p.title}</AppText>
                      {!!p.description && (
                        <AppText size={12} color={colors.neutral70}>
                          {p.description}
                        </AppText>
                      )}
                    </View>
                  </View>
                  <Radio selected={active} onPress={() => setPayment(p.id)} />
                </Pressable>
              );
            })
          )}
        </View>

        {/* Chi tiết thanh toán */}
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Chi tiết thanh toán</AppText>
          <SummaryRow label="Tổng tiền hàng" value={formatPrice(subtotal)} />
          {discount > 0 && <SummaryRow label="Giảm giá sản phẩm" value={`-${formatPrice(discount)}`} valueColor={colors.success} />}
          <SummaryRow label="Phí vận chuyển" value={rate ? formatPrice(shippingFee) : '—'} labelWeight="medium" />
          <Divider />
          <SummaryRow label="Tổng thanh toán" value={formatPrice(grandTotal)} labelWeight="semibold" valueWeight="semibold" />
        </View>

        <Pressable style={styles.terms} onPress={() => router.push('/terms')}>
          <AppText size={12}>
            {'Bằng việc nhấn "Đặt đơn", bạn đồng ý tuân theo '}
            <AppText size={12} weight="semibold" color={colors.primary}>
              Điều khoản của Thế Giới Sữa
            </AppText>
          </AppText>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.totalBlock}>
          <View style={[styles.rowBetween, { alignSelf: 'stretch' }]}>
            <AppText variant="bodyMedium">Tổng tiền</AppText>
            <AppText variant="h3" color={colors.error}>
              {formatPrice(grandTotal)}
            </AppText>
          </View>
          {discount > 0 && (
            <AppText size={12} color={colors.success}>
              Tiết kiệm {formatPrice(discount)}
            </AppText>
          )}
        </View>
        <Button title="Đặt hàng" disabled={!canOrder && !!address && !!store} onPress={placeOrder} style={{ marginHorizontal: 16 }} />
      </View>

      {/* Ghi chú đơn hàng */}
      <BottomSheet
        visible={noteSheet}
        onClose={() => setNoteSheet(false)}
        title="Ghi chú đơn hàng"
        footer={
          <Button
            title="Lưu ghi chú"
            onPress={() => {
              setNote(noteDraft.trim());
              setNoteSheet(false);
            }}
          />
        }>
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <ChoiceChips
            options={quickNotes}
            value={quickNotes.filter((q) => noteDraft.includes(q))}
            multiple
            onChange={(q) =>
              setNoteDraft((d) =>
                d.includes(q)
                  ? d
                      .replace(q, '')
                      .replace(/^[,\s]+|[,\s]+$/g, '')
                      .replace(/,\s*,/g, ',')
                  : d
                    ? `${d}, ${q}`
                    : q,
              )
            }
          />
          <FormField placeholder="Nhập ghi chú cho cửa hàng / shipper..." multiline maxLength={200} value={noteDraft} onChangeText={setNoteDraft} />
          <AppText size={12} color={colors.neutral60} align="right">
            {noteDraft.length}/200
          </AppText>
        </View>
      </BottomSheet>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  valueColor = colors.text,
  labelWeight = 'regular',
  valueWeight = 'regular',
}: {
  label: string;
  value: string;
  valueColor?: string;
  labelWeight?: keyof typeof fonts;
  valueWeight?: keyof typeof fonts;
}) {
  return (
    <View style={styles.rowBetween}>
      <AppText weight={labelWeight}>{label}</AppText>
      <AppText weight={valueWeight} color={valueColor}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  card: { backgroundColor: colors.white, padding: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  changeChip: { height: 24, paddingHorizontal: 12, borderRadius: 1000, backgroundColor: colors.primarySurface, justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  shipOption: { minHeight: 64, borderWidth: 1, borderColor: colors.neutral40, backgroundColor: colors.white },
  payOption: { minHeight: 48, borderWidth: 1, borderColor: colors.neutral40, backgroundColor: colors.white },
  optionActive: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySurface },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: colors.neutral90 },
  product: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  voucherRow: { height: 48, backgroundColor: colors.white, paddingHorizontal: 12 },
  voucherTag: { height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  inlineError: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.errorSurface },
  terms: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  bottom: { backgroundColor: colors.white, boxShadow: '-8px 4px 9px rgba(0,0,0,0.08)' },
  totalBlock: { paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20, gap: 4, alignItems: 'flex-end' },
});
