import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useProducts } from '@/api/hooks';
import { Category } from '@/api/mappers';
import { ProductOrderBy } from '@/api/types';
import { icons } from '@/assets';
import { applyClientFilter, countFilters, emptyFilter, FilterSheet, hasClientFilters, ProductFilter, serverQuery } from '@/components/filter-sheet';
import { Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, SpinningLoader, useToast } from '@/components/overlays';
import { ProductCard } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Icon, RIcon } from '@/components/ui';
import { colors } from '@/theme';

/** Tab sắp xếp (Figma "02_Sản phẩm_Khuyến mãi") — API chỉ hỗ trợ orderby=date|price|title. */
type SortTab = 'all' | 'best' | 'new' | 'price';
const SORT_TABS: { key: SortTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'best', label: 'Bán chạy' },
  { key: 'new', label: 'Hàng mới' },
  { key: 'price', label: 'Giá' },
];

const findCategory = (tree: Category[], id: number): Category | undefined => {
  for (const c of tree) {
    if (c.id === id) return c;
    const hit = findCategory(c.children, id);
    if (hit) return hit;
  }
};

/**
 * Danh sách sản phẩm theo danh mục / tìm kiếm ("02_Sản phẩm_Seach_Sữa bột", "02. Loading", "Error")
 * — phân trang vô hạn từ /products.
 */
export default function ProductListScreen() {
  const params = useLocalSearchParams<{ title?: string; category?: string; orderby?: ProductOrderBy; order?: 'asc' | 'desc'; search?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gridItemWidth = Math.floor((width - 24 - 12) / 2);

  const toast = useToast();
  const [tab, setTab] = useState<SortTab>(params.orderby === 'date' ? 'new' : params.orderby === 'price' ? 'price' : 'all');
  const [priceOrder, setPriceOrder] = useState<'asc' | 'desc'>(params.orderby === 'price' && params.order === 'desc' ? 'desc' : 'asc');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<ProductFilter>(emptyFilter);
  const [filterOpen, setFilterOpen] = useState(false);

  const baseCategory = params.category ? Number(params.category) : undefined;
  const [subCategory, setSubCategory] = useState<number | undefined>(undefined);
  const categories = useCategories();
  const current = baseCategory && categories.data ? findCategory(categories.data, baseCategory) : undefined;

  const sort: { orderby?: ProductOrderBy; order?: 'asc' | 'desc' } =
    tab === 'new' ? { orderby: 'date', order: 'desc' } : tab === 'price' ? { orderby: 'price', order: priceOrder } : {};
  const pressTab = (key: SortTab) => {
    // API chưa có thứ tự "bán chạy" (orderby chỉ nhận date | price | title).
    if (key === 'best') return toast('Sắp xếp theo bán chạy sẽ sớm ra mắt', 'informationLine');
    // Bấm lại tab Giá → đổi chiều tăng / giảm.
    if (key === 'price' && tab === 'price') setPriceOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    setTab(key);
  };
  // Danh mục, giá, khuyến mãi, còn hàng lọc ở server; thương hiệu & nơi bán lọc trên các trang đã tải.
  const query = useProducts({ category: subCategory ?? baseCategory, search: params.search, orderby: sort.orderby, order: sort.order, ...serverQuery(filter) });

  const items = useMemo(() => applyClientFilter(query.products, filter), [query.products, filter]);
  const filterCount = countFilters(filter);
  const clientFiltering = hasClientFilters(filter);

  // Lọc trên máy mà còn ít kết quả → tự tải thêm trang (tối đa ~200 sản phẩm) để không bỏ sót.
  useEffect(() => {
    if (clientFiltering && items.length < 12 && query.hasNextPage && !query.isFetching && query.products.length < 200) query.fetchNextPage();
  }, [clientFiltering, items.length, query]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={params.title ?? current?.name ?? 'Sản phẩm'}
        right={
          <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
            <Icon source={icons.moreFill} size={24} />
          </Pressable>
        }
      />
      {/* Lọc + tab sắp xếp */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarContent}>
          <Pressable style={[styles.filterPill, filterCount > 0 && styles.filterPillActive]} onPress={() => setFilterOpen(true)}>
            <RIcon name="filter2Line" size={16} color={colors.primary} />
            <AppText variant="bodySmallSemibold" color={colors.primary}>
              Lọc{filterCount ? ` (${filterCount})` : ''}
            </AppText>
          </Pressable>
          {SORT_TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable key={t.key} onPress={() => pressTab(t.key)} style={styles.tab} hitSlop={6}>
                <AppText variant={active ? 'bodySmallSemibold' : 'bodySmall'} color={active ? colors.primary : colors.text}>
                  {t.label}
                </AppText>
                {t.key === 'price' && (
                  <RIcon
                    name={tab === 'price' ? (priceOrder === 'asc' ? 'arrowUpSLine' : 'arrowDownSLine') : 'expandUpDownLine'}
                    size={18}
                    color={colors.primary}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.toolbarLine} />
      </View>

      {current && current.children.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subBar} contentContainerStyle={styles.subBarContent}>
          {[{ id: undefined, name: 'Tất cả' }, ...current.children].map((c) => {
            const active = subCategory === c.id;
            return (
              <Pressable key={c.id ?? 'all'} onPress={() => setSubCategory(c.id)} style={[styles.subChip, active && styles.subChipActive]}>
                <AppText weight={active ? 'semibold' : 'regular'} color={active ? colors.primary : colors.text}>
                  {c.name}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {query.isLoading ? (
        <View style={[styles.grid, { paddingTop: 12, backgroundColor: colors.white, flex: 1 }]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ gap: 8, marginBottom: 12 }}>
              <Skeleton style={{ width: gridItemWidth, height: gridItemWidth }} />
              <Skeleton style={{ width: gridItemWidth * 0.9, height: 12 }} />
              <Skeleton style={{ width: gridItemWidth * 0.5, height: 12 }} />
            </View>
          ))}
        </View>
      ) : query.isError ? (
        <View style={styles.empty}>
          <StateView type="offline" title="Không thể tải sản phẩm" message={query.error?.message ?? 'Kiểm tra kết nối và thử lại'} actionLabel="Thử lại" onAction={() => query.refetch()} />
        </View>
      ) : items.length === 0 && (query.isFetchingNextPage || (clientFiltering && query.hasNextPage && query.products.length < 200)) ? (
        // Đang tải thêm trang để tìm sản phẩm khớp bộ lọc thương hiệu / nơi bán.
        <View style={styles.empty}>
          <SpinningLoader />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <StateView
            type="empty"
            title="Không có sản phẩm phù hợp"
            message={filterCount ? 'Thử bỏ bớt điều kiện lọc để xem thêm sản phẩm nhé!' : 'Danh mục này hiện chưa có sản phẩm.'}
            actionLabel={filterCount ? 'Xoá bộ lọc' : undefined}
            onAction={() => setFilter(emptyFilter)}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          style={{ backgroundColor: colors.white }}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
          contentContainerStyle={{ rowGap: 12, paddingBottom: insets.bottom + 16 }}
          ListHeaderComponent={<View style={{ height: 12 }} />}
          renderItem={({ item }) => <ProductCard product={item} width={gridItemWidth} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          ListFooterComponent={query.isFetchingNextPage ? <SpinningLoader size={28} /> : null}
        />
      )}

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)}>
        {[
          { icon: 'searchLine' as const, label: 'Tìm kiếm', go: () => router.push('/search') },
          { icon: 'shoppingCart2Line' as const, label: 'Giỏ hàng', go: () => router.push('/cart') },
          { icon: 'home5Line' as const, label: 'Về trang chủ', go: () => router.dismissTo('/(tabs)') },
        ].map((m) => (
          <Pressable
            key={m.label}
            style={styles.sortRow}
            onPress={() => {
              setMenuOpen(false);
              m.go();
            }}>
            <RIcon name={m.icon} size={22} color={colors.primary} />
            <AppText variant="bodyMediumRegular" style={{ flex: 1 }}>
              {m.label}
            </AppText>
          </Pressable>
        ))}
      </BottomSheet>

      <FilterSheet
        visible={filterOpen}
        value={filter}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilter(f);
          setFilterOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  toolbar: { backgroundColor: colors.white, marginTop: 2 },
  toolbarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, height: 52 },
  toolbarLine: { height: 1, marginHorizontal: 12, backgroundColor: colors.neutral40 },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySurface },
  filterPillActive: { borderWidth: 1.5 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 },
  subBar: { flexGrow: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.neutral30 },
  subBarContent: { gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  subChip: { height: 32, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: colors.neutral40, justifyContent: 'center' },
  subChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 12 },
  empty: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', paddingBottom: 80 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
});
