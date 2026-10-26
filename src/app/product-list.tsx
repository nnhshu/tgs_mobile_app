import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories, useProducts } from '@/api/hooks';
import { Category } from '@/api/mappers';
import { ProductOrderBy } from '@/api/types';
import { icons } from '@/assets';
import { countFilters, emptyFilter, FilterSheet, priceBounds, ProductFilter } from '@/components/filter-sheet';
import { Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, SpinningLoader } from '@/components/overlays';
import { ProductCard } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Icon, RIcon } from '@/components/ui';
import { Product } from '@/data/mock';
import { colors } from '@/theme';

/** Sắp xếp phía server — API hỗ trợ orderby=date|price|title. */
const SORTS: { label: string; orderby?: ProductOrderBy; order?: 'asc' | 'desc' }[] = [
  { label: 'Mặc định' },
  { label: 'Mới nhất', orderby: 'date', order: 'desc' },
  { label: 'Giá thấp đến cao', orderby: 'price', order: 'asc' },
  { label: 'Giá cao đến thấp', orderby: 'price', order: 'desc' },
  { label: 'Tên A - Z', orderby: 'title', order: 'asc' },
];

/** Lọc phía client trên các sản phẩm đã tải (API chưa hỗ trợ lọc theo giá/thương hiệu). */
const applyFilter = (list: Product[], f: ProductFilter) => {
  const [min, max] = priceBounds(f);
  return list.filter(
    (p) =>
      (p.contactPrice ? !f.price && !f.minPrice && !f.maxPrice : p.price >= min && p.price <= max) &&
      (!f.brands.length || (p.brand && f.brands.includes(p.brand))) &&
      (!f.inStock || p.stock !== 0),
  );
};

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

  const initialSort = SORTS.findIndex((s) => s.orderby === params.orderby && s.order === params.order);
  const [sortIndex, setSortIndex] = useState(initialSort > 0 ? initialSort : 0);
  const [sortOpen, setSortOpen] = useState(false);
  const [filter, setFilter] = useState<ProductFilter>(emptyFilter);
  const [filterOpen, setFilterOpen] = useState(false);

  const baseCategory = params.category ? Number(params.category) : undefined;
  const [subCategory, setSubCategory] = useState<number | undefined>(undefined);
  const categories = useCategories();
  const current = baseCategory && categories.data ? findCategory(categories.data, baseCategory) : undefined;

  const sort = SORTS[sortIndex];
  const query = useProducts({ category: subCategory ?? baseCategory, search: params.search, orderby: sort.orderby, order: sort.order });

  const items = useMemo(() => applyFilter(query.products, filter), [query.products, filter]);
  const brands = useMemo(() => Array.from(new Set(query.products.map((p) => p.brand).filter((b): b is string => !!b))).sort(), [query.products]);
  const filterCount = countFilters(filter);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={params.title ?? current?.name ?? 'Sản phẩm'}
        right={
          <Pressable onPress={() => router.push('/search')} hitSlop={8}>
            <Icon source={icons.searchGray} size={24} />
          </Pressable>
        }
      />
      <View style={styles.toolbar}>
        <Pressable style={styles.tool} onPress={() => setSortOpen(true)}>
          <RIcon name="expandUpDownLine" size={18} />
          <AppText weight="medium" numberOfLines={1}>
            {sort.label}
          </AppText>
        </Pressable>
        <View style={styles.toolDivider} />
        <Pressable style={styles.tool} onPress={() => setFilterOpen(true)}>
          <RIcon name="filter2Line" size={18} color={filterCount ? colors.primary : colors.text} />
          <AppText weight="medium" color={filterCount ? colors.primary : colors.text}>
            Lọc{filterCount ? ` (${filterCount})` : ''}
          </AppText>
        </Pressable>
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
          ListHeaderComponent={
            <AppText style={styles.count}>
              {filterCount ? `${items.length} / ${query.products.length} sản phẩm đã tải` : `${query.total} sản phẩm`}
            </AppText>
          }
          renderItem={({ item }) => <ProductCard product={item} width={gridItemWidth} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => query.refetch()}
          ListFooterComponent={query.isFetchingNextPage ? <SpinningLoader size={28} /> : null}
        />
      )}

      <BottomSheet visible={sortOpen} onClose={() => setSortOpen(false)} title="Sắp xếp theo">
        {SORTS.map((s, i) => (
          <Pressable
            key={s.label}
            style={styles.sortRow}
            onPress={() => {
              setSortIndex(i);
              setSortOpen(false);
            }}>
            <AppText variant="bodyMediumRegular" weight={i === sortIndex ? 'semibold' : 'regular'} color={i === sortIndex ? colors.primary : colors.text} style={{ flex: 1 }}>
              {s.label}
            </AppText>
            {i === sortIndex && <RIcon name="checkLine" size={22} color={colors.primary} />}
          </Pressable>
        ))}
      </BottomSheet>

      <FilterSheet
        visible={filterOpen}
        value={filter}
        brands={brands}
        resultCount={(f) => applyFilter(query.products, f).length}
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
  toolbar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, marginTop: 2, height: 48 },
  tool: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%', paddingHorizontal: 8 },
  toolDivider: { width: 1, height: 20, backgroundColor: colors.neutral40 },
  subBar: { flexGrow: 0, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.neutral30 },
  subBarContent: { gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  subChip: { height: 32, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: colors.neutral40, justifyContent: 'center' },
  subChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  count: { paddingHorizontal: 12, paddingVertical: 12, color: colors.neutral70 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 12 },
  empty: { flex: 1, backgroundColor: colors.white, justifyContent: 'center', paddingBottom: 80 },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
});
