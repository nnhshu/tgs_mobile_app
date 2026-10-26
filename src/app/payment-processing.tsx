import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCreateOrder, usePaymentMethods } from '@/api/hooks';
import { readCreatedOrder } from '@/api/mappers';
import { ScreenHeader } from '@/components/headers';
import { SpinningLoader } from '@/components/overlays';
import { AppText } from '@/components/ui';
import { useOrderDraft } from '@/hooks/use-order-draft';
import { useApp } from '@/store/app-store';
import { colors, formatPrice } from '@/theme';

/**
 * Đặt đơn — POST /orders { items, billing, shipping, shipping_rate_id, payment_method, coupon_codes }.
 * Thành công → Hoàn tất đặt đơn (mở trang thanh toán nếu server trả link, vd. VietQR); lỗi → Đặt hàng thất bại.
 */
export default function PaymentProcessingScreen() {
  const params = useLocalSearchParams<{ rateId: string; rateLabel?: string; rateCost?: string; payment: string }>();
  const app = useApp();
  const draft = useOrderDraft();
  const methods = usePaymentMethods();
  const createOrder = useCreateOrder();
  const [stage, setStage] = useState<'creating' | 'paying'>('creating');
  const started = useRef(false);

  const shippingFee = Number(params.rateCost) || 0;
  const grandTotal = draft.itemsTotal + shippingFee;
  const paymentLabel =
    methods.data?.items.find((m) => m.id === params.payment)?.title ?? (params.payment === 'cod' ? 'Thanh toán khi nhận hàng' : params.payment);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!draft.address || !draft.shipping || !draft.items.length || !params.rateId) {
      router.replace({ pathname: '/order-failed', params: { reason: 'Thiếu thông tin đơn hàng. Vui lòng kiểm tra lại giỏ hàng và địa chỉ nhận.' } });
      return;
    }
    // Snapshot trước khi giỏ hàng bị xoá các sản phẩm đã đặt.
    const lines = draft.selected.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      image: i.product.image,
      quantity: i.quantity,
      price: i.product.price,
      oldPrice: i.product.oldPrice,
    }));
    const address = draft.address;
    const note = [app.note, address.note && `Ghi chú giao hàng: ${address.note}`].filter(Boolean).join(' · ');

    createOrder.mutate(
      {
        items: draft.items,
        billing: draft.shipping,
        shipping: draft.shipping,
        shipping_rate_id: params.rateId,
        payment_method: params.payment,
        coupon_codes: [],
        ...(note ? { customer_note: note } : {}),
      },
      {
        onSuccess: async (res) => {
          const created = readCreatedOrder(res);
          const order = app.placeOrder({
            lines,
            shippingFee,
            shippingDiscount: 0,
            voucherDiscount: 0,
            payment: paymentLabel,
            address,
            storeName: app.selectedStore?.name ?? '',
            note: app.note,
            serverId: created.id,
            ...(created.number ? { code: created.number } : {}),
          });
          if (created.paymentUrl) {
            setStage('paying');
            await WebBrowser.openBrowserAsync(created.paymentUrl).catch(() => undefined);
          }
          router.replace({ pathname: '/order-success', params: { id: order.id } });
        },
        onError: (e) => router.replace({ pathname: '/order-failed', params: { reason: e.message } }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title={stage === 'paying' ? 'Thanh toán' : 'Đang xử lý'} hideBack />
      <View style={styles.body}>
        <SpinningLoader size={56} />
        <AppText variant="h5" align="center">
          {stage === 'paying' ? 'Đang chờ thanh toán...' : 'Đang tạo đơn hàng'}
        </AppText>
        <AppText color={colors.neutral70} align="center">
          {stage === 'paying' ? 'Hoàn tất thanh toán trên trang vừa mở, sau đó quay lại ứng dụng.' : 'Vui lòng không tắt ứng dụng trong lúc xử lý.'}
        </AppText>
        <View style={styles.summary}>
          <AppText color={colors.neutral70}>Số tiền</AppText>
          <AppText variant="h4" color={colors.error}>
            {formatPrice(grandTotal)}
          </AppText>
          <AppText size={12} color={colors.neutral70}>
            {[params.rateLabel, paymentLabel].filter(Boolean).join(' · ')}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32, paddingBottom: 80 },
  summary: { alignItems: 'center', gap: 4, marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: colors.backgroundAlt, alignSelf: 'stretch' },
});
