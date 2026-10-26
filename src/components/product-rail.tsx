import { Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { useProducts } from '@/api/hooks';
import { ProductQuery } from '@/api/types';
import { Skeleton } from '@/components/form';
import { FlashSaleCard, ProductCard } from '@/components/product-card';
import { AppText, RIcon } from '@/components/ui';
import { Product } from '@/data/mock';
import { colors } from '@/theme';

/** Hàng sản phẩm cuộn ngang lấy từ API — tự xử lý loading / lỗi / rỗng. */
export function ApiProductRail({
  query,
  variant = 'card',
  excludeId,
  style,
}: {
  query: ProductQuery;
  variant?: 'card' | 'flash';
  excludeId?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { products, isLoading, isError, refetch } = useProducts({ per_page: 10, ...query });
  const list = excludeId ? products.filter((p) => p.id !== excludeId) : products;
  return <ProductRow products={list} loading={isLoading} error={isError} onRetry={refetch} variant={variant} style={style} />;
}

export function ProductRow({
  products,
  loading,
  error,
  onRetry,
  variant = 'card',
  style,
}: {
  products: Product[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  variant?: 'card' | 'flash';
  style?: StyleProp<ViewStyle>;
}) {
  if (loading) {
    return (
      <View style={[styles.row, style]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Skeleton style={{ width: 148, height: 148 }} />
            <Skeleton style={{ width: 128, height: 12 }} />
            <Skeleton style={{ width: 80, height: 12 }} />
          </View>
        ))}
      </View>
    );
  }
  if (error) {
    return (
      <Pressable onPress={onRetry} style={styles.error}>
        <RIcon name="refreshLine" size={18} color={colors.primary} />
        <AppText color={colors.primary}>Không tải được sản phẩm. Bấm để thử lại</AppText>
      </Pressable>
    );
  }
  if (products.length === 0) {
    return (
      <AppText color={colors.neutral70} style={{ paddingVertical: 8 }}>
        Chưa có sản phẩm
      </AppText>
    );
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 12, paddingRight: 12 }]} style={[{ marginRight: -12 }, style]}>
      {products.map((p) => (variant === 'flash' ? <FlashSaleCard key={p.id} product={p} discount={p.badge?.label} /> : <ProductCard key={p.id} product={p} />))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, overflow: 'hidden' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
});
