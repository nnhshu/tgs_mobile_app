import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Chip, Photo, RIcon } from '@/components/ui';
import { Product } from '@/data/mock';
import { colors, formatPrice, priceLabel } from '@/theme';

const openProduct = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });

/**
 * Thẻ sản phẩm dọc ("Bán chạy nhất", "Sản phẩm khuyến mãi", "Gợi ý hôm nay").
 * width 148 cho slider ngang, 177 cho lưới 2 cột.
 */
export function ProductCard({
  product,
  width = 148,
  priceColor = colors.secondary,
}: {
  product: Product;
  width?: number;
  priceColor?: string;
}) {
  const plain = !!product.plainPrice;
  return (
    <Pressable onPress={() => openProduct(product.id)} style={[styles.card, { width }]}>
      <View>
        <ProductImage product={product} size={width} />
        {product.badge && (
          <View style={styles.badgeWrap}>
            <Chip label={product.badge.label} tone={product.badge.tone} style={styles.badge} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <AppText numberOfLines={2}>{product.name}</AppText>
        <View style={styles.priceRow}>
          <AppText weight="semibold" color={plain ? colors.text : priceColor}>
            {priceLabel(product.price)}
          </AppText>
          {product.oldPrice && (
            <AppText size={12} weight={plain ? 'medium' : 'regular'} color={colors.neutral60} strike>
              {plain ? formatPrice(product.oldPrice).replace(' ', '') : formatPrice(product.oldPrice)}
            </AppText>
          )}
        </View>
      </View>
    </Pressable>
  );
}

/** Ảnh sản phẩm + lớp "Hết hàng" / placeholder khi không có ảnh. */
export function ProductImage({ product, size, radius = 8 }: { product: Product; size: number; radius?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      {product.noImage ? (
        <View style={[styles.placeholder, { borderRadius: radius }]}>
          <RIcon name="imageAddLine" size={size / 4} color={colors.neutral50} />
          {size > 100 && (
            <AppText size={12} color={colors.neutral60}>
              Chưa có hình ảnh
            </AppText>
          )}
        </View>
      ) : (
        <Photo source={product.image} radius={radius} style={{ width: size, height: size }} />
      )}
      {product.stock === 0 && (
        <View style={[styles.soldOut, { borderRadius: radius }]}>
          <View style={styles.soldOutPill}>
            <AppText size={size > 100 ? 14 : 11} weight="semibold" color={colors.white}>
              Hết hàng
            </AppText>
          </View>
        </View>
      )}
    </View>
  );
}

/** Thẻ Flash Sale: chip giảm giá góc trái + thanh "ĐANG BÁN CHẠY". */
export function FlashSaleCard({ product, discount }: { product: Product; discount?: string }) {
  return (
    <Pressable onPress={() => openProduct(product.id)} style={styles.flashCard}>
      <View>
        <ProductImage product={product} size={148} />
        {discount && <Chip label={discount} tone="soft" style={styles.flashChip} />}
      </View>
      <View style={{ gap: 12, alignItems: 'center' }}>
        <View style={{ gap: 8, alignSelf: 'stretch' }}>
          <AppText numberOfLines={2}>{product.name}</AppText>
          <AppText weight="semibold" color={colors.error}>
            {priceLabel(product.price)}
          </AppText>
        </View>
        <View style={styles.progress}>
          <View style={styles.progressFill} />
          <AppText variant="xsmallSemibold" color={colors.white} numberOfLines={1}>
            ĐANG BÁN CHẠY
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 8, overflow: 'hidden', gap: 8, paddingBottom: 12 },
  badgeWrap: { position: 'absolute', top: 8, right: 8 },
  badge: { borderRadius: 1000, paddingHorizontal: 8 },
  info: { gap: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashCard: { width: 148, gap: 8 },
  placeholder: { flex: 1, backgroundColor: colors.neutral20, alignItems: 'center', justifyContent: 'center', gap: 6 },
  soldOut: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  soldOutPill: { backgroundColor: 'rgba(10,10,10,0.6)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  flashImage: { width: 148, height: 148 },
  flashChip: { position: 'absolute', top: 8, left: 8, minWidth: 48, alignItems: 'center', borderRadius: 127 },
  progress: {
    width: 128,
    height: 16,
    borderRadius: 128,
    backgroundColor: colors.errorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 21,
    backgroundColor: colors.error,
  },
});
