import { Image } from 'expo-image';
import { useNetworkState } from 'expo-network';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons, img } from '@/assets';
import { Skeleton } from '@/components/form';
import { SearchBar } from '@/components/headers';
import { StateView } from '@/components/state-view';
import { ProductCard } from '@/components/product-card';
import { AppText, Button, Chip, Icon, IconBadgeButton, Photo, SectionHeader } from '@/components/ui';
import { useProducts, useSelectedAddress, useStores } from '@/api/hooks';
import { formatAddress, formatDistance } from '@/api/mappers';
import { ApiProductRail } from '@/components/product-rail';
import { brands, collections, homeCategories } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { SpinningLoader } from '@/components/overlays';
import { blueGradient, colors, priceLabel } from '@/theme';

const HorizontalList = ({ children, gap = 12 }: { children: React.ReactNode; gap?: number }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap, paddingRight: 12 }} style={{ marginRight: -12 }}>
    {children}
  </ScrollView>
);

/** Đếm ngược Flash Sale (bắt đầu 03:24:36 như design). */
function useCountdown(initialSeconds: number) {
  const [left, setLeft] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return [pad(Math.floor(left / 3600)), pad(Math.floor((left % 3600) / 60)), pad(left % 60)];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridItemWidth = Math.floor((width - 24 - 12) / 2);
  const { cartCount, unreadCount, isLoggedIn, viewed, province } = useApp();
  // "Gợi ý hôm nay": sản phẩm mới nhất, tải thêm khi cuộn tới cuối trang.
  const suggestions = useProducts({ orderby: 'date', order: 'desc' });
  const { stores } = useStores();
  // Cửa hàng gần nhất (đã sắp theo vị trí nếu có), ưu tiên khu vực đang chọn.
  const nearbyStores = (userLocationKnown(stores) ? stores : stores.filter((s) => s.province === province)).slice(0, 4);
  const network = useNetworkState();
  const offline = network.isConnected === false;
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const countdown = useCountdown(3 * 3600 + 24 * 60 + 36);
  const goCart = () => router.push('/cart');
  /** Mở danh sách sản phẩm; params là query API (category, orderby, order...). */
  const openList = (title: string, params: Record<string, string> = {}) =>
    router.push({ pathname: '/product-list', params: { title, ...params } });
  const address = useSelectedAddress();

  // 01_Home_Loading (skeleton): hiển thị ngắn khi mở app / thử lại.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, [retryKey]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        scrollEnabled={!offline && !loading}
        scrollEventThrottle={200}
        onScroll={({ nativeEvent: e }) => {
          const nearEnd = e.layoutMeasurement.height + e.contentOffset.y > e.contentSize.height - 600;
          if (nearEnd && suggestions.hasNextPage && !suggestions.isFetchingNextPage) suggestions.fetchNextPage();
        }}>
        {/* Header xanh + tìm kiếm */}
        <LinearGradient {...blueGradient} style={[styles.blueBg, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <Pressable style={{ flexShrink: 1 }} onPress={() => router.push({ pathname: '/addresses', params: { select: '1' } })}>
              <AppText weight="semibold" color={colors.white}>
                Giao đến :
              </AppText>
              <View style={styles.location}>
                <AppText color={colors.white} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {address ? formatAddress(address) : 'Thêm địa chỉ giao hàng'}
                </AppText>
                <Icon source={icons.arrowDropRight} size={24} />
              </View>
            </Pressable>
            <View style={styles.headerIcons}>
              <IconBadgeButton icon={icons.notification} count={unreadCount} onPress={() => router.push('/notifications')} />
              <IconBadgeButton icon={icons.cart} count={cartCount} onPress={goCart} />
            </View>
          </View>
          <SearchBar placeholder="Tìm sữa, thương hiệu, nhu cầu của bạn" style={styles.searchBar} onPress={() => router.push('/search')} />
        </LinearGradient>

        {offline ? (
          <View style={styles.offline}>
            <StateView
              type="offline"
              title="Không có kết nối Internet"
              message="Kiểm tra kết nối mạng và thử lại"
              actionLabel="Thử lại"
              onAction={() => {
                setLoading(true);
                setRetryKey((k) => k + 1);
              }}
            />
          </View>
        ) : loading ? (
          <HomeSkeleton />
        ) : (
        <>
        {/* Banner chính */}
        <View style={styles.sheet}>
          <Pressable style={styles.banner} onPress={() => openList('Gian hàng chính hãng')}>
            <Image source={img.bannerTop} style={StyleSheet.absoluteFill} contentFit="cover" />
            <Icon source={img.dotsIndicator} width={32} height={6} />
          </Pressable>
        </View>

        {!isLoggedIn && (
          <View style={styles.guestBanner}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="semibold">Đăng nhập để nhận ưu đãi</AppText>
              <AppText size={12} color={colors.neutral70}>
                Tích điểm, nhận voucher và theo dõi đơn hàng
              </AppText>
            </View>
            <Button title="Đăng nhập" size="sm" onPress={() => router.push('/login')} style={{ height: 36 }} />
          </View>
        )}
        {/* Danh mục */}
        <View style={styles.categories}>
          {[homeCategories.slice(0, 5), homeCategories.slice(5)].map((row, i) => (
            <View key={i} style={[styles.categoryRow, i === 0 && { justifyContent: 'center' }]}>
              {row.map((c) => (
                <Pressable key={c.label} style={styles.category} onPress={() =>
                    c.label === 'Cửa hàng'
                      ? router.push('/stores')
                      : c.label === 'Khuyến mãi'
                        ? openList('Giá tốt', { orderby: 'price', order: 'asc' })
                        : openList(c.label, c.categoryId ? { category: String(c.categoryId) } : {})
                  }>
                  <View style={styles.categoryIcon}>
                    <Image source={c.icon} style={{ width: c.size.w, height: c.size.h }} contentFit="cover" />
                  </View>
                  <AppText variant="xsmallMedium" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ letterSpacing: -0.24 }}>
                    {c.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          ))}
        </View>

        {/* Flash Sale */}
        <LinearGradient colors={[colors.secondary, colors.white]} locations={[0.0024, 0.404]} style={[styles.section, { gap: 16 }]}>
          <SectionHeader
            actionColor={colors.text}
            onAction={() => openList('Flash Sale', { category: '19' })}
            title={
              <View style={styles.flashTitle}>
                <View style={styles.row}>
                  <Icon source={icons.flash} size={24} />
                  <AppText variant="h5">Flash Sale</AppText>
                </View>
                <View style={[styles.row, { gap: 6 }]}>
                  {countdown.map((part, i) => (
                    <View key={i} style={[styles.row, { gap: 6 }]}>
                      {i > 0 && <Icon source={img.colon} width={1.725} height={8.115} />}
                      <View style={styles.timeBox}>
                        <AppText variant="bodyMediumSemibold" color={colors.white}>
                          {part}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            }
          />
          <ApiProductRail query={{ category: 19 }} variant="flash" />
        </LinearGradient>

        <Pressable onPress={() => openList('Khuyến mãi')}>
          <Image source={img.bannerMid1} style={styles.midBanner} contentFit="cover" contentPosition="top" />
        </Pressable>

        <View style={styles.section}>
          <SectionHeader onAction={() => openList('Sữa bột', { category: '64' })} title="Bán chạy nhất" />
          <ApiProductRail query={{ category: 64 }} />
        </View>

        <View style={styles.section}>
          <SectionHeader onAction={() => openList('Bộ sưu tập ưu đãi')} title="Bộ sưu tập ưu đãi" />
          <HorizontalList>
            {collections.map((c) => (
              <Pressable key={c.title} style={styles.collection} onPress={() => openList(c.title)}>
                <Photo source={c.image} style={{ width: 148, height: 148 }} />
                <AppText weight="semibold" numberOfLines={2}>
                  {c.title}
                </AppText>
              </Pressable>
            ))}
          </HorizontalList>
        </View>

        {viewed.length > 0 && (
          <View style={styles.section}>
            <SectionHeader action={null} title="Xem gần đây" />
            <HorizontalList>
              {viewed.slice(0, 8).map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.recent}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}>
                  <Photo source={product.image} radius={4} style={{ width: 96, height: 96 }} />
                  <View style={styles.recentInfo}>
                    <AppText variant="bodyMediumSemibold" numberOfLines={2}>
                      {product.name}
                    </AppText>
                    <AppText weight="semibold" color={colors.secondary}>
                      {priceLabel(product.price)}
                    </AppText>
                    {product.badge && <Chip label={`Giảm ${product.badge.label}`} tone="soft" style={{ borderRadius: 127 }} />}
                  </View>
                </Pressable>
              ))}
            </HorizontalList>
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader onAction={() => openList('Sữa nước', { category: '65' })} title="Sản phẩm khuyến mãi" />
          <ApiProductRail query={{ category: 65 }} />
        </View>

        <Pressable onPress={() => openList('Khuyến mãi')}>
          <Image source={img.bannerMid2} style={styles.midBanner} contentFit="cover" contentPosition="top" />
        </Pressable>

        {/* Thương hiệu nổi bật */}
        <LinearGradient colors={['#A8D1FF', colors.white]} locations={[0.0024, 0.404]} style={[styles.section, { gap: 16 }]}>
          <SectionHeader onAction={() => openList('Thương hiệu nổi bật')} title="Thương hiệu nổi bật" titleSize={18} actionColor={colors.text} />
          <HorizontalList>
            {brands.map((b, i) => (
              <Pressable key={i} style={styles.brand} onPress={() => openList(b.name.split(' - ')[0])}>
                <LinearGradient
                  colors={i === 0 ? ['#A7DFFF', '#004599'] : ['transparent', 'transparent']}
                  locations={[0.078, 1.92]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.brandImage}>
                  <Image source={b.bg} style={StyleSheet.absoluteFill} contentFit="cover" />
                </LinearGradient>
                <Image source={b.logo} style={{ width: 92, height: 36 }} contentFit={b.logoFit} />
                <AppText variant="xsmallSemibold" align="center" numberOfLines={2} style={{ width: 128 }}>
                  {b.name}
                </AppText>
              </Pressable>
            ))}
          </HorizontalList>
        </LinearGradient>

        <View style={styles.section}>
          <SectionHeader onAction={() => router.push('/stores')} title="Cửa hàng gần bạn" />
          <HorizontalList>
            {nearbyStores.map((s) => (
              <Pressable key={s.id} style={styles.store} onPress={() => router.push({ pathname: '/stores/[id]', params: { id: s.id } })}>
                <Photo source={s.image} style={{ width: 220, height: 148 }} />
                <View style={{ gap: 4 }}>
                  <AppText weight="semibold" numberOfLines={1}>
                    {s.name}
                  </AppText>
                  <AppText size={12} color={colors.neutral70} numberOfLines={1}>
                    {s.address}
                  </AppText>
                  <AppText size={12} color={colors.neutral70} numberOfLines={1}>
                    {s.distanceKm !== undefined ? (
                      <>
                        Cách <AppText size={12} weight="semibold" color={colors.neutral70}>{formatDistance(s.distanceKm)}</AppText>
                        {' • '}
                      </>
                    ) : null}
                    <AppText size={12} color={colors.secondary}>{s.province}</AppText>
                  </AppText>
                </View>
              </Pressable>
            ))}
            <Pressable style={styles.discover} onPress={() => router.navigate('/(tabs)/offers')}>
              <Photo source={img.discover1} style={{ width: 270, height: 148 }} />
              <View style={{ gap: 4 }}>
                <AppText color={colors.neutral60}>Ưu đãi đặc biệt</AppText>
                <AppText variant="bodyMediumSemibold" numberOfLines={2}>
                  Nước ngon tận nhà, nhận quà tặng mê ly trên khắp mọi miền
                </AppText>
                <View style={[styles.row, { gap: 4 }]}>
                  <Icon source={icons.priceTag} size={16} />
                  <AppText size={10} weight="medium">
                    Lên đến 16.000đ
                  </AppText>
                </View>
              </View>
            </Pressable>
          </HorizontalList>
        </View>

        <Pressable style={styles.bottomBanner} onPress={() => openList('Khuyến mãi')}>
          <Image source={img.bannerBottom} style={StyleSheet.absoluteFill} contentFit="cover" />
          <Icon source={img.dotsIndicator} width={32} height={6} />
        </Pressable>

        <View style={[styles.section, { paddingHorizontal: 12 }]}>
          <SectionHeader
            onAction={() => openList('Sản phẩm mới', { orderby: 'date', order: 'desc' })}
            title="Gợi ý hôm nay"
            style={{ paddingHorizontal: 4 }}
          />
          {suggestions.isLoading ? (
            <View style={styles.grid}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ width: gridItemWidth, height: gridItemWidth + 60 }} />
              ))}
            </View>
          ) : suggestions.isError ? (
            <Button title="Thử lại" size="sm" variant="outline" onPress={() => suggestions.refetch()} style={{ alignSelf: 'center' }} />
          ) : (
            <View style={styles.grid}>
              {suggestions.products.map((p) => (
                <ProductCard key={p.id} product={p} width={gridItemWidth} />
              ))}
            </View>
          )}
          {suggestions.isFetchingNextPage && <SpinningLoader size={28} />}
        </View>
        </>
        )}
      </ScrollView>
    </View>
  );
}

const userLocationKnown = (stores: { distanceKm?: number }[]) => stores.some((s) => s.distanceKm !== undefined);

function HomeSkeleton() {
  return (
    <View style={{ paddingHorizontal: 12, gap: 16, marginTop: -15 }}>
      <Skeleton style={{ height: 174, borderRadius: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Skeleton style={{ width: 56, height: 56, borderRadius: 12 }} />
            <Skeleton style={{ width: 48, height: 10 }} />
          </View>
        ))}
      </View>
      <Skeleton style={{ width: 140, height: 18 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Skeleton style={{ width: 148, height: 148 }} />
            <Skeleton style={{ width: 120, height: 12 }} />
            <Skeleton style={{ width: 80, height: 12 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  row: { flexDirection: 'row', alignItems: 'center' },
  // Figma: search kết thúc ở y=154, sheet xám bắt đầu y=168, nền xanh tới y=195
  blueBg: { paddingBottom: 14 + 27 },
  headerRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  location: { flexDirection: 'row', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', gap: 8 },
  searchBar: { marginHorizontal: 16, marginTop: 10 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -27,
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  banner: { height: 174, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  categories: { backgroundColor: colors.white, marginTop: 12, paddingVertical: 16, paddingHorizontal: 12, gap: 16 },
  categoryRow: { flexDirection: 'row', gap: 10 },
  category: { width: 68, alignItems: 'center', gap: 4 },
  categoryIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  section: { backgroundColor: colors.white, marginTop: 12, padding: 12, gap: 12 },
  flashTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeBox: { height: 24, minWidth: 28, paddingHorizontal: 6, borderRadius: 4, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center' },
  midBanner: { height: 108, marginTop: 12, width: '100%' },
  collection: { width: 148, gap: 8, paddingBottom: 12 },
  recent: { width: 281, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentInfo: { width: 173, gap: 4 },
  brand: { width: 148, alignItems: 'center', gap: 8 },
  brandImage: { width: 148, height: 148, borderRadius: 8, overflow: 'hidden' },
  store: { width: 220, gap: 8, paddingBottom: 12 },
  discover: { width: 270, gap: 8, paddingBottom: 12 },
  bottomBanner: { height: 203, marginTop: 12, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  offline: { paddingTop: 120, paddingBottom: 200 },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.white,
    boxShadow: '0px 4px 12px rgba(0,0,0,0.06)',
  },
});
