import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useProducts } from '@/api/hooks';
import { Category } from '@/api/mappers';
import { icons, img } from '@/assets';
import { Skeleton } from '@/components/form';
import { SearchBar } from '@/components/headers';
import { ProductImage } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Icon, IconBadgeButton, Photo, RIcon } from '@/components/ui';
import { hotCategories } from '@/data/mock';
import { useApp } from '@/store/app-store';
import { blueGradient, colors, priceLabel } from '@/theme';

/** Icon 3D trong Figma cho các danh mục WordPress tương ứng (theo slug). */
const CATEGORY_ICONS: Record<string, { icon: ImageSourcePropType; w: number; h: number }> = {
  'sua-bot': { icon: img.catSuaBot, w: 33, h: 36 },
  'sua-nuoc': { icon: img.catSuaNuoc, w: 36, h: 36 },
  'sua-dac-biet': { icon: img.catSuaDacBiet, w: 36, h: 36 },
  've-sinh-me-be': { icon: img.catMeBe, w: 36, h: 35 },
  'yen-sao': { icon: img.catYenSao, w: 34, h: 36 },
  'sua-dinh-duong': { icon: img.menuNhuCau, w: 39, h: 36 },
  'ta-bim-cham-soc': { icon: img.hot[11], w: 36, h: 36 },
  'sua-chua': { icon: img.hot[5], w: 36, h: 36 },
};

const SUGGEST = -1;

const openCategory = (c: { name: string; id?: number; search?: string }) =>
  router.push({
    pathname: '/product-list',
    params: { title: c.name, ...(c.id ? { category: String(c.id) } : {}), ...(c.search ? { search: c.search } : {}) },
  });

/** 02_Sản phẩm: menu danh mục (API /categories) bên trái + nội dung danh mục bên phải. */
export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { cartCount } = useApp();
  const categories = useCategories();
  const [active, setActive] = useState<number>(SUGGEST);
  const current = categories.data?.find((c) => c.id === active);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient {...blueGradient} style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <SearchBar placeholder="Danh mục sản phẩm" cameraIcon={icons.cameraSm} cameraSize={20} style={{ flex: 1 }} onPress={() => router.push('/search')} />
          <IconBadgeButton icon={icons.cart} count={cartCount} onPress={() => router.push('/cart')} />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent} showsVerticalScrollIndicator={false}>
          <MenuItem label="Gợi ý cho bạn" icon={{ icon: img.menuGoiY, w: 35, h: 36 }} selected={active === SUGGEST} onPress={() => setActive(SUGGEST)} />
          {categories.isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ width: 72, height: 72 }} />)}
          {categories.data?.map((c) => (
            <MenuItem key={c.id} label={c.name} icon={CATEGORY_ICONS[c.slug]} selected={active === c.id} onPress={() => setActive(c.id)} />
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.rightContent} showsVerticalScrollIndicator={false}>
          {active === SUGGEST ? (
            <View style={styles.card}>
              <AppText weight="semibold">Danh mục đang hot:</AppText>
              <View style={styles.hotGrid}>
                {hotCategories.map((c) => (
                  <Pressable key={c.label} style={styles.hotItem} onPress={() => openCategory({ name: c.label, id: c.categoryId, search: c.search })}>
                    <Photo source={c.image} radius={6} style={{ width: 84, height: 84 }} />
                    <AppText size={12} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                      {c.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : categories.isError ? (
            <StateView type="offline" title="Không tải được danh mục" message="Kiểm tra kết nối và thử lại" actionLabel="Thử lại" onAction={() => categories.refetch()} />
          ) : current ? (
            <CategoryPanel category={current} />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function MenuItem({ label, icon, selected, onPress }: { label: string; icon?: { icon: ImageSourcePropType; w: number; h: number }; selected: boolean; onPress: () => void }) {
  const content = (
    <>
      {icon ? (
        <Image source={icon.icon} style={{ width: icon.w, height: icon.h }} contentFit="cover" />
      ) : (
        <View style={styles.genericIcon}>
          <RIcon name="shoppingBag3Line" size={20} color={selected ? colors.primary : colors.neutral70} />
        </View>
      )}
      <AppText size={12} weight={selected ? 'semibold' : 'medium'} color={selected ? colors.primary : colors.text} align="center" numberOfLines={2} style={styles.menuLabel}>
        {label}
      </AppText>
    </>
  );
  return (
    <Pressable onPress={onPress}>
      {selected ? (
        <LinearGradient colors={['#ACD3FF', colors.primarySurface]} locations={[0.09, 0.95]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.menuItem}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.menuItem}>{content}</View>
      )}
    </Pressable>
  );
}

/** Panel danh mục: danh mục con + 10 sản phẩm đầu từ API. */
function CategoryPanel({ category }: { category: Category }) {
  const { products, isLoading, isError, refetch, total } = useProducts({ category: category.id, per_page: 10 });
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.card}>
        <Pressable style={styles.panelHeader} onPress={() => openCategory(category)}>
          <AppText weight="semibold" style={{ flex: 1 }}>
            {category.name}
          </AppText>
          <AppText color={colors.primary}>Xem tất cả</AppText>
          <Icon source={icons.seeMore} size={16} />
        </Pressable>
        {category.children.length > 0 && (
          <View style={styles.subGrid}>
            {category.children.map((c) => (
              <Pressable key={c.id} style={styles.subChip} onPress={() => openCategory(c)}>
                <AppText size={13} numberOfLines={2} align="center">
                  {c.name}
                </AppText>
                <AppText size={11} color={colors.neutral60}>
                  {c.count} sản phẩm
                </AppText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <AppText weight="semibold">{total ? `Sản phẩm (${total})` : 'Sản phẩm'}</AppText>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 64 }} />)
        ) : isError ? (
          <Pressable onPress={() => refetch()}>
            <AppText color={colors.primary}>Không tải được sản phẩm. Bấm để thử lại</AppText>
          </Pressable>
        ) : products.length === 0 ? (
          <AppText color={colors.neutral70}>Danh mục chưa có sản phẩm</AppText>
        ) : (
          products.map((p) => (
            <Pressable key={p.id} style={styles.miniProduct} onPress={() => router.push({ pathname: '/product/[id]', params: { id: p.id } })}>
              <ProductImage product={p} size={64} radius={6} />
              <View style={{ flex: 1, gap: 4 }}>
                <AppText size={13} numberOfLines={2}>
                  {p.name}
                </AppText>
                <AppText size={13} weight="semibold" color={p.stock === 0 ? colors.neutral60 : colors.secondary}>
                  {p.stock === 0 ? 'Hết hàng' : priceLabel(p.price)}
                </AppText>
              </View>
            </Pressable>
          ))
        )}
        {products.length > 0 && total > products.length && (
          <Pressable onPress={() => openCategory(category)} style={{ alignSelf: 'center', paddingVertical: 4 }}>
            <AppText color={colors.primary}>Xem thêm {total - products.length} sản phẩm</AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  header: { paddingBottom: 10 },
  headerRow: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  body: { flex: 1, flexDirection: 'row' },
  menu: { flexGrow: 0, backgroundColor: colors.white, boxShadow: '0px 0px 36px rgba(0,0,0,0.04)' },
  menuContent: { paddingTop: 8, paddingHorizontal: 8, paddingBottom: 110, gap: 4 },
  menuItem: { width: 72, height: 72, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  menuLabel: { lineHeight: 13, maxWidth: 64, letterSpacing: -0.24 },
  genericIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  rightContent: { padding: 8, paddingLeft: 12, paddingRight: 12, paddingBottom: 110 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 12 },
  hotGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4, rowGap: 12 },
  hotItem: { width: 84, gap: 8, alignItems: 'center' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subChip: { width: '48%', minHeight: 56, borderRadius: 8, backgroundColor: colors.primarySurface, padding: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  miniProduct: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
