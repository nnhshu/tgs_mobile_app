import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProduct, useProvince, useSelectedAddress } from '@/api/hooks';
import { formatAddress } from '@/api/mappers';
import { parseSections, parseSpecTable } from '@/api/html';
import { icons } from '@/assets';
import { Skeleton } from '@/components/form';
import { BottomSheet, useToast } from '@/components/overlays';
import { ProductImage } from '@/components/product-card';
import { ApiProductRail, ProductRow } from '@/components/product-rail';
import { StateView } from '@/components/state-view';
import { AppText, Button, Divider, Icon, IconBadgeButton, Photo, QuantityStepper, RIcon, SectionHeader } from '@/components/ui';
import { collections } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { colors, priceLabel } from '@/theme';
import { safeBack } from '@/utils/navigation';

function OptionChips({ label, options, value, onChange }: { label: string; options: string[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText color={colors.neutral80}>{label}:</AppText>
      <View style={styles.chips}>
        {options.map((o) => {
          const selected = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)} style={[styles.optionChip, selected && styles.optionChipActive]}>
              <AppText color={selected ? colors.primary : colors.text}>{o}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function InfoRow({ label, value, link, onPress }: { label: string; value: string; link?: boolean; onPress?: () => void }) {
  return (
    <Pressable style={styles.infoRow} onPress={onPress} disabled={!onPress}>
      <AppText style={styles.infoLabel} color={colors.neutral80}>
        {label}
      </AppText>
      <AppText color={link ? colors.primary : colors.text} style={{ flex: 1 }}>
        {value}
      </AppText>
    </Pressable>
  );
}

/** 02_Chi tiết sản phẩm — dữ liệu từ /products/{id}. */
export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { product, raw, isLoading, isError, error, refetch, isPlaceholderData } = useProduct(id);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const province = useProvince();
  const { addToCart, cartCount, isLoggedIn, wishlist, toggleWishlist, selectedStore, viewed, addViewed } = useApp();
  const address = useSelectedAddress();
  const storeLabel = selectedStore?.name ?? `khu vực ${province}`;

  const [imageIndex, setImageIndex] = useState(0);
  const [headerSolid, setHeaderSolid] = useState(false);
  const [options, setOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [variantSheet, setVariantSheet] = useState<'cart' | 'buy' | null>(null);
  const [showVariantError, setShowVariantError] = useState(false);
  const [loginSheet, setLoginSheet] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  const specs = useMemo(() => parseSpecTable(product?.descriptionHtml ?? ''), [product?.descriptionHtml]);
  const sections = useMemo(() => parseSections(product?.descriptionHtml ?? ''), [product?.descriptionHtml]);
  const attributes = useMemo(() => (raw?.attributes ?? []).filter((a) => a.options?.length), [raw]);

  // Ghi nhận "Sản phẩm đã xem" khi có dữ liệu chi tiết.
  useEffect(() => {
    if (product && !isPlaceholderData) addViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isPlaceholderData]);

  if (!product) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.white }]}>
        <StatusBar style="dark" />
        <Pressable onPress={safeBack} style={[styles.floatingHeader, { top: insets.top + 8 }]} hitSlop={10}>
          <Icon source={icons.arrowLeft} size={24} />
        </Pressable>
        {isError ? (
          <View style={styles.center}>
            <StateView type="offline" title="Không tải được sản phẩm" message={error?.message ?? 'Vui lòng thử lại'} actionLabel="Thử lại" onAction={() => refetch()} />
          </View>
        ) : (
          isLoading && (
            <View style={{ paddingTop: insets.top + 60, gap: 12, padding: 12 }}>
              <Skeleton style={{ height: 340 }} />
              <Skeleton style={{ height: 24, width: '80%' }} />
              <Skeleton style={{ height: 24, width: '40%' }} />
              <Skeleton style={{ height: 120 }} />
            </View>
          )
        )}
      </View>
    );
  }

  const unavailable = product.stock === 0 || product.contactPrice;
  const liked = wishlist.includes(product.id);
  const gallery = product.gallery ?? [];
  const missing = attributes.filter((a) => !options[a.name]);
  const variantLabel = attributes.length ? attributes.map((a) => options[a.name]).filter(Boolean).join(', ') : undefined;
  const brand = product.brand ?? specs.find((s) => /thương hiệu/i.test(s.label))?.value;
  const visibleSpecs = expanded.info ? specs : specs.slice(0, 4);

  const commit = (mode: 'cart' | 'buy') => {
    if (missing.length) {
      setShowVariantError(variantSheet !== null);
      setVariantSheet(mode);
      return;
    }
    setVariantSheet(null);
    setShowVariantError(false);
    if (mode === 'buy' && !isLoggedIn) {
      setLoginSheet(true);
      return;
    }
    addToCart(product, quantity, variantLabel, raw);
    if (mode === 'cart') toast('Đã thêm vào giỏ hàng');
    else router.push('/cart');
  };

  const share = () => Share.share({ message: `${product.name} — ${priceLabel(product.price)} tại Thế Giới Sữa\n${product.url ?? ''}` });
  const onGalleryScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const solid = e.nativeEvent.contentOffset.y > 300;
          if (solid !== headerSolid) setHeaderSolid(solid);
        }}>
        {/* Ảnh sản phẩm */}
        <View style={{ height: 420, backgroundColor: colors.white }}>
          {product.noImage || gallery.length === 0 ? (
            <View style={styles.noImage}>
              <ProductImage product={{ ...product, noImage: true }} size={width * 0.7} radius={12} />
            </View>
          ) : (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onGalleryScroll}>
              {gallery.map((source, i) => (
                <View key={i} style={{ width, height: 420 }}>
                  {/* Figma: ảnh chiếm left 2.67%, top 11.9%, w 94.27%, h 88.21% */}
                  <Image source={source} contentFit="contain" transition={200} style={{ position: 'absolute', left: '2.67%', top: '11.9%', width: '94.27%', height: '88.21%' }} />
                </View>
              ))}
            </ScrollView>
          )}
          {gallery.length > 1 && (
            <View style={styles.counter}>
              <AppText weight="medium">
                {imageIndex + 1}/{gallery.length}
              </AppText>
            </View>
          )}
          {product.stock === 0 && (
            <View style={styles.soldOutBanner}>
              <AppText weight="semibold" color={colors.white}>
                {product.sellsAtBranch === false ? `Không bán tại ${province}` : 'Sản phẩm tạm hết hàng'}
              </AppText>
            </View>
          )}
        </View>

        {/* Thông tin chính */}
        <View style={[styles.card, { gap: 12, borderRadius: 8 }]}>
          <View style={styles.titleRow}>
            <AppText variant="h4" style={{ flex: 1 }}>
              {product.name}
            </AppText>
            <Pressable
              style={[styles.wishlist, liked && { backgroundColor: colors.errorSurface }]}
              hitSlop={6}
              onPress={() => {
                toggleWishlist(product.id);
                toast(liked ? 'Đã bỏ khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích', liked ? 'informationLine' : 'checkboxCircleFill');
              }}>
              {liked ? <RIcon name="starFill" size={20} color={colors.error} /> : <Icon source={icons.heart} size={20} />}
            </Pressable>
          </View>
          <View style={styles.rowGap6}>
            {brand && (
              <>
                <AppText>Thương hiệu:</AppText>
                <Pressable onPress={() => router.push({ pathname: '/product-list', params: { title: brand, search: brand } })}>
                  <AppText color={colors.primary}>{brand}</AppText>
                </Pressable>
                <View style={styles.vline} />
              </>
            )}
            {product.sku && <AppText color={colors.neutral70}>SKU: {product.sku}</AppText>}
          </View>
          <View style={[styles.rowGap6, { gap: 8 }]}>
            <AppText variant="h3" color={product.contactPrice ? colors.primary : colors.text}>
              {priceLabel(product.price)}
            </AppText>
            {product.oldPrice && (
              <AppText variant="bodyMediumRegular" color={colors.neutral60} strike>
                {priceLabel(product.oldPrice)}
              </AppText>
            )}
          </View>
          <Pressable style={styles.branch} onPress={() => router.push({ pathname: '/stores', params: { select: '1' } })}>
            <RIcon name="store2Line" size={18} color={unavailable ? colors.error : colors.success} />
            <AppText style={{ flex: 1 }} numberOfLines={1}>
              {product.sellsAtBranch === false
                ? `Chưa bán tại ${province}`
                : product.stock === 0
                  ? `Hết hàng tại ${storeLabel}`
                  : `Còn hàng tại ${storeLabel}`}
            </AppText>
            <AppText weight="medium" color={colors.primary}>
              Đổi
            </AppText>
          </Pressable>
          {product.shortDescription && (
            <AppText color={colors.neutral90} numberOfLines={3}>
              {product.shortDescription}
            </AppText>
          )}
          {attributes.map((a) => (
            <OptionChips key={a.name} label={a.name} options={a.options} value={options[a.name] ?? null} onChange={(v) => setOptions((o) => ({ ...o, [a.name]: v }))} />
          ))}
        </View>

        {/* Thông tin vận chuyển */}
        <View style={[styles.card, { gap: 12, alignItems: 'center' }]}>
          <SectionHeader title="Thông tin vận chuyển" action={null} />
          <View style={{ gap: 12, alignSelf: 'stretch' }}>
            <View style={styles.shipRow}>
              <Icon source={icons.package} size={24} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText color={colors.neutral70}>Giao đến</AppText>
                <AppText weight="semibold" numberOfLines={1}>
                  {address ? formatAddress(address) : 'Chưa có địa chỉ'}
                </AppText>
              </View>
              <Pressable onPress={() => router.push({ pathname: '/addresses', params: { select: '1' } })} hitSlop={8}>
                <AppText variant="bodyMediumSemibold" color={colors.primary}>
                  Đổi
                </AppText>
              </Pressable>
            </View>
            <Divider />
            <View style={styles.shipRow}>
              <Icon source={icons.express} size={24} />
              <View style={{ gap: 4 }}>
                <AppText color={colors.neutral70}>Giao nhanh trong 1 - 2 ngày</AppText>
                <AppText weight="semibold">
                  Phí giao hàng: <AppText weight="semibold" color={colors.success}>Miễn phí</AppText>
                </AppText>
              </View>
            </View>
            <Divider />
            <View style={styles.shipRow}>
              <Icon source={icons.freeship} width={24} height={22.97} />
              <View style={{ gap: 4, flex: 1 }}>
                <AppText weight="semibold" color={colors.primary}>
                  Freeship <AppText weight="semibold" color={colors.success} style={{ fontStyle: 'italic' }}>Extra</AppText>
                </AppText>
                <AppText>Freeship 15k đơn từ 45k, Freeship 30k đơn từ 100k</AppText>
              </View>
            </View>
          </View>
          <Pressable onPress={() => router.push('/terms')}>
            <AppText color={colors.primary}>Xem thêm về chính sách giao hàng</AppText>
          </Pressable>
        </View>

        {/* Yên tâm mua sắm */}
        <View style={[styles.card, { gap: 12 }]}>
          <AppText variant="bodyMediumSemibold">Yên tâm mua sắm</AppText>
          <View style={styles.shipRow}>
            <Icon source={icons.box} size={24} />
            <AppText>Được đồng kiểm khi nhận hàng</AppText>
          </View>
          <Divider />
          <View style={styles.shipRow}>
            <Icon source={icons.exchangeDollar} size={24} />
            <AppText>Được hoàn tiền 200% nếu là hàng giả.</AppText>
          </View>
          <Divider />
          <View style={[styles.shipRow, { justifyContent: 'space-between' }]}>
            <View style={[styles.shipRow, { flex: 1 }]}>
              <Icon source={icons.exchange} size={24} />
              <AppText style={{ flex: 1 }}>Đổi trả miễn phí trong 30 ngày. Được đổi ý.</AppText>
            </View>
            <Pressable onPress={() => router.push('/terms')} hitSlop={8}>
              <AppText color={colors.primary}>Chi tiết</AppText>
            </Pressable>
          </View>
        </View>

        {/* Thông tin chi tiết (bảng thông số từ mô tả WordPress) */}
        {specs.length > 0 && (
          <View style={[styles.card, { gap: 12, alignItems: 'center' }]}>
            <AppText variant="h5" style={{ alignSelf: 'stretch' }}>
              Thông tin chi tiết
            </AppText>
            <View style={{ gap: 12, alignSelf: 'stretch' }}>
              {visibleSpecs.map((r, i) => (
                <View key={r.label} style={{ gap: 12 }}>
                  {i > 0 && <Divider />}
                  <InfoRow
                    label={r.label}
                    value={r.value}
                    link={/thương hiệu/i.test(r.label)}
                    onPress={/thương hiệu/i.test(r.label) ? () => router.push({ pathname: '/product-list', params: { title: r.value, search: r.value } }) : undefined}
                  />
                </View>
              ))}
            </View>
            {specs.length > 4 && (
              <Pressable onPress={() => toggle('info')}>
                <AppText color={colors.primary}>{expanded.info ? 'Thu gọn' : 'Xem tất cả'}</AppText>
              </Pressable>
            )}
          </View>
        )}

        {/* Mô tả / đặc điểm / hướng dẫn sử dụng */}
        {sections.length > 0 && (
          <View style={[styles.card, { gap: 16, paddingVertical: 16 }]}>
            {sections.map((sec, i) => {
              const open = expanded[`s${i}`] ?? i === 0;
              return (
                <View key={sec.title + i} style={{ gap: 10 }}>
                  {i > 0 && <Divider />}
                  <Pressable style={styles.sectionHead} onPress={() => toggle(`s${i}`)}>
                    <AppText variant="bodyMediumSemibold" style={{ flex: 1 }}>
                      {sec.title}
                    </AppText>
                    <RIcon name={open ? 'arrowUpSLine' : 'arrowDownSLine'} size={20} color={colors.neutral60} />
                  </Pressable>
                  {open && <AppText style={{ lineHeight: 21 }}>{sec.body}</AppText>}
                </View>
              );
            })}
          </View>
        )}

        {/* Đánh giá — API chưa cung cấp */}
        <View style={[styles.card, { gap: 12, paddingVertical: 16 }]}>
          <AppText variant="bodyMediumSemibold">Khách hàng đánh giá</AppText>
          <View style={styles.noReview}>
            <RIcon name="starLine" size={28} color={colors.neutral50} />
            <AppText color={colors.neutral70} align="center">
              Chưa có đánh giá cho sản phẩm này.{'\n'}Hãy là người đầu tiên đánh giá sau khi mua hàng!
            </AppText>
          </View>
        </View>

        {!!product.categoryIds?.length && (
          <View style={[styles.card, { paddingHorizontal: 0, paddingVertical: 16, gap: 12 }]}>
            <SectionHeader
              title="Sản phẩm tương tự"
              style={{ paddingHorizontal: 16 }}
              onAction={() => router.push({ pathname: '/product-list', params: { title: 'Sản phẩm tương tự', category: String(product.categoryIds![0]) } })}
            />
            <ApiProductRail query={{ category: product.categoryIds[0] }} excludeId={product.id} style={{ paddingLeft: 12 }} />
          </View>
        )}

        <View style={[styles.card, { gap: 12 }]}>
          <SectionHeader title="Top Deals" onAction={() => router.push({ pathname: '/product-list', params: { title: 'Giá tốt', orderby: 'price', order: 'asc' } })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {collections.map((c) => (
              <Pressable
                key={c.title}
                style={{ width: 148, gap: 8, paddingBottom: 12 }}
                onPress={() => router.push({ pathname: '/product-list', params: { title: c.title, orderby: 'price', order: 'asc' } })}>
                <Photo source={c.image} style={{ width: 148, height: 148 }} />
                <AppText weight="semibold" numberOfLines={2}>
                  {c.title}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {viewed.filter((p) => p.id !== product.id).length > 0 && (
          <View style={[styles.card, { gap: 12 }]}>
            <SectionHeader title="Sản phẩm đã xem" action={null} />
            <ProductRow products={viewed.filter((p) => p.id !== product.id)} />
          </View>
        )}
      </ScrollView>

      {/* Header nổi trên ảnh */}
      {headerSolid && <View style={[styles.headerBg, { height: insets.top + 60 }]} />}
      <View style={[styles.floatingHeader, { top: insets.top + 8, pointerEvents: 'box-none' }]}>
        <Pressable onPress={safeBack} hitSlop={10}>
          <Icon source={icons.arrowLeft} size={24} />
        </Pressable>
        <AppText weight="semibold" numberOfLines={1} style={{ flex: 1, marginHorizontal: 12, opacity: headerSolid ? 1 : 0 }}>
          {product.name}
        </AppText>
        <IconBadgeButton icon={icons.cartDark} count={cartCount} background="rgba(255,255,255,0.75)" badgeColor={colors.error} onPress={() => router.push('/cart')} />
        <Pressable onPress={share} hitSlop={8} style={{ marginLeft: 12 }}>
          <Icon source={icons.more} size={24} />
        </Pressable>
      </View>

      {/* Thanh mua hàng */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {product.contactPrice ? (
          <View style={[styles.actions, { paddingTop: 12 }]}>
            <Button title="Liên hệ để đặt hàng" left={<RIcon name="phoneLine" size={20} />} onPress={() => router.push('/help')} style={{ flex: 1 }} />
          </View>
        ) : product.stock === 0 ? (
          <View style={[styles.actions, { paddingTop: 12 }]}>
            <Button
              title="Nhận thông báo khi có hàng"
              left={<RIcon name="notification3Line" size={20} />}
              onPress={() => toast('Chúng tôi sẽ báo khi sản phẩm có hàng trở lại')}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <>
            <View style={styles.qtyRow}>
              <AppText variant="bodyMedium">Số lượng</AppText>
              <QuantityStepper
                value={quantity}
                onChange={(v) => {
                  if (product.stock !== undefined && v > product.stock) toast(`Chỉ còn ${product.stock} sản phẩm`, 'errorWarningLine');
                  setQuantity(Math.max(1, Math.min(v, product.stock ?? 99)));
                }}
                size={32}
                gap={8}
                fontSize={18}
                accentPlus
              />
            </View>
            <View style={styles.actions}>
              <Button title="Thêm vào giỏ" variant="outline" left={<Icon source={icons.cartAdd} size={20} />} onPress={() => commit('cart')} style={{ flex: 1, paddingHorizontal: 12 }} />
              <Button title="Mua ngay" onPress={() => commit('buy')} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </View>

      {/* 02_Chưa chọn quy cách */}
      <BottomSheet
        visible={variantSheet !== null}
        onClose={() => {
          setVariantSheet(null);
          setShowVariantError(false);
        }}
        footer={
          <Button
            title={variantSheet === 'buy' ? 'Mua ngay' : 'Thêm vào giỏ hàng'}
            onPress={() => {
              setShowVariantError(true);
              if (variantSheet) commit(variantSheet);
            }}
          />
        }>
        <View style={{ gap: 16, paddingBottom: 12 }}>
          <View style={styles.sheetProduct}>
            <ProductImage product={product} size={88} radius={6} />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText numberOfLines={2}>{product.name}</AppText>
              <AppText variant="h5" color={colors.error}>
                {priceLabel(product.price)}
              </AppText>
            </View>
          </View>
          {attributes.map((a) => (
            <OptionChips key={a.name} label={a.name} options={a.options} value={options[a.name] ?? null} onChange={(v) => setOptions((o) => ({ ...o, [a.name]: v }))} />
          ))}
          {showVariantError && missing.length > 0 && (
            <View style={styles.variantError}>
              <RIcon name="errorWarningFill" size={18} color={colors.error} />
              <AppText color={colors.error}>Vui lòng chọn {missing[0].name.toLowerCase()}</AppText>
            </View>
          )}
        </View>
      </BottomSheet>

      {/* 02_Khách bấm Mua ngay - Login Form */}
      <BottomSheet
        visible={loginSheet}
        onClose={() => setLoginSheet(false)}
        title="Đăng nhập để mua hàng"
        footer={
          <View style={{ gap: 8 }}>
            <Button
              title="Đăng nhập / Đăng ký"
              onPress={() => {
                setLoginSheet(false);
                addToCart(product, quantity, variantLabel, raw);
                router.push({ pathname: '/login', params: { redirect: '/cart' } });
              }}
            />
            <Button
              title="Thêm vào giỏ, mua sau"
              variant="outline"
              onPress={() => {
                setLoginSheet(false);
                addToCart(product, quantity, variantLabel, raw);
                toast('Đã thêm vào giỏ hàng');
              }}
            />
          </View>
        }>
        <AppText color={colors.neutral70} align="center" style={{ paddingBottom: 12 }}>
          Đăng nhập để đặt hàng nhanh hơn, tích điểm thành viên và theo dõi đơn hàng của bạn.
        </AppText>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: colors.white, padding: 12 },
  counter: { position: 'absolute', right: 8, bottom: 12, backgroundColor: 'rgba(236,245,255,0.65)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  wishlist: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 6, borderRadius: 100 },
  rowGap6: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  vline: { width: 1, height: 14, backgroundColor: colors.neutral40, marginHorizontal: 4 },
  branch: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: colors.backgroundAlt },
  chips: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 8 },
  optionChip: { height: 36, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.neutral40, backgroundColor: colors.white, justifyContent: 'center' },
  optionChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  shipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  infoLabel: { width: 140 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noReview: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  soldOutBanner: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,10,10,0.6)', paddingVertical: 8, alignItems: 'center' },
  headerBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.white, boxShadow: '0px 4px 4px rgba(9,30,66,0.05)' },
  floatingHeader: { position: 'absolute', left: 0, right: 0, height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  sheetProduct: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  variantError: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.errorSurface, padding: 8, borderRadius: 6 },
  bottomBar: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.neutral40, boxShadow: '0px -8px 9px rgba(0,0,0,0.08)' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
});
