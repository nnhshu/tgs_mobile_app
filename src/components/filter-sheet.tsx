import { ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterTerm, useFilterAttributes, useStores } from '@/api/hooks';
import { ProductQuery } from '@/api/types';
import { AppText, Button, RIcon } from '@/components/ui';
import { normalize, Product } from '@/data/mock';
import { colors, fonts } from '@/theme';

/** Mức giá có sẵn (Figma "02_Lọc sản phẩm"). */
export const PRICE_RANGES = [
  { label: 'Dưới 400.000đ', min: 0, max: 400000 },
  { label: '400.000 – 900.000đ', min: 400000, max: 900000 },
  { label: '900.000 – 1.800.000đ', min: 900000, max: 1800000 },
  { label: 'Trên 2.000.000đ', min: 2000000, max: undefined },
] as const;

export type ProductFilter = {
  onSale: boolean;
  inStock: boolean;
  /** Tỉnh đã chuẩn hoá ("Hồ Chí Minh"). */
  provinces: string[];
  category: FilterTerm | null;
  priceIndex: number | null;
  minPrice: string;
  maxPrice: string;
  brands: string[];
};

export const emptyFilter: ProductFilter = { onSale: false, inStock: false, provinces: [], category: null, priceIndex: null, minPrice: '', maxPrice: '', brands: [] };

const digits = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const money = (s: string) => (digits(s) ? digits(s).toLocaleString('vi-VN') : '');

export const countFilters = (f: ProductFilter) =>
  Number(f.onSale) + Number(f.inStock) + f.provinces.length + Number(!!f.category) + Number(f.priceIndex !== null || !!f.minPrice || !!f.maxPrice) + f.brands.length;

/** Phần lọc server hỗ trợ: danh mục, khoảng giá, khuyến mãi, còn hàng. */
export function serverQuery(f: ProductFilter): Partial<ProductQuery> {
  const preset = f.priceIndex !== null ? PRICE_RANGES[f.priceIndex] : undefined;
  const min = digits(f.minPrice) || preset?.min || 0;
  const max = digits(f.maxPrice) || preset?.max;
  return {
    ...(f.category ? { category: f.category.id } : {}),
    ...(min ? { min_price: min } : {}),
    ...(max ? { max_price: max } : {}),
    ...(f.onSale ? { on_sale: 1 as const } : {}),
    ...(f.inStock ? { stock_status: 'instock' as const } : {}),
  };
}

/** Phần lọc trên máy (API chưa có tham số): thương hiệu, nơi bán. */
export const hasClientFilters = (f: ProductFilter) => f.brands.length > 0 || f.provinces.length > 0;

export function applyClientFilter(list: Product[], f: ProductFilter) {
  if (!hasClientFilters(f)) return list;
  const brands = f.brands.map(normalize);
  return list.filter(
    (p) =>
      (!brands.length || (!!p.brand && brands.includes(normalize(p.brand)))) &&
      (!f.provinces.length || f.provinces.some((pv) => p.provinces?.includes(normalize(pv)))),
  );
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** 02_Lọc sản phẩm — ngăn kéo trượt từ phải, footer "Thiết lập lại" / "Áp dụng". */
export function FilterSheet({
  visible,
  value,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: ProductFilter;
  onApply: (f: ProductFilter) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [draft, setDraft] = useState(value);
  const set = (patch: Partial<ProductFilter>) => setDraft((d) => ({ ...d, ...patch }));
  const attrs = useFilterAttributes();
  const { stores } = useStores();

  // Nơi bán: các tỉnh có cửa hàng, nhiều cửa hàng trước.
  const provinces = useMemo(() => {
    const count = new Map<string, number>();
    stores.forEach((s) => s.province && count.set(s.province, (count.get(s.province) ?? 0) + 1));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [stores]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} onShow={() => setDraft(value)} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={onClose} />
        </Animated.View>
        <Animated.View entering={SlideInRight.duration(260)} style={[styles.panel, { width: Math.min(width - 37, 420), paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={10}>
              <RIcon name="closeLine" size={24} />
            </Pressable>
            <AppText variant="h4" style={{ flex: 1 }}>
              Lọc sản phẩm
            </AppText>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <Section title="Dịch vụ & Khuyến mãi">
              <View style={styles.chips}>
                <Chip label="Khuyến mãi" active={draft.onSale} onPress={() => set({ onSale: !draft.onSale })} />
                <Chip label="Còn hàng" active={draft.inStock} onPress={() => set({ inStock: !draft.inStock })} />
              </View>
            </Section>

            {provinces.length > 0 && (
              <Section title="Nơi bán">
                <ChipList
                  items={provinces.map((p) => ({ key: p, label: p === 'Hồ Chí Minh' ? 'TP. Hồ Chí Minh' : p }))}
                  isActive={(k) => draft.provinces.includes(k)}
                  onPress={(k) => set({ provinces: toggle(draft.provinces, k) })}
                />
              </Section>
            )}

            {attrs.categories.length > 0 && (
              <Section title="Danh mục">
                <ChipList
                  items={attrs.categories.map((c) => ({ key: String(c.id), label: c.name }))}
                  isActive={(k) => draft.category?.id === Number(k)}
                  // API chỉ lọc được 1 danh mục mỗi lần.
                  onPress={(k) => set({ category: draft.category?.id === Number(k) ? null : (attrs.categories.find((c) => c.id === Number(k)) ?? null) })}
                />
              </Section>
            )}

            <Section title="Giá">
              <View style={styles.chips}>
                {PRICE_RANGES.map((r, i) => (
                  <Chip key={r.label} label={r.label} active={draft.priceIndex === i} onPress={() => set({ priceIndex: draft.priceIndex === i ? null : i, minPrice: '', maxPrice: '' })} />
                ))}
              </View>
              <View style={styles.priceRow}>
                <PriceInput placeholder="Từ 0" value={money(draft.minPrice)} onChangeText={(t) => set({ minPrice: t, priceIndex: null })} />
                <View style={styles.dash} />
                <PriceInput placeholder="Đến 10.000.000" value={money(draft.maxPrice)} onChangeText={(t) => set({ maxPrice: t, priceIndex: null })} />
              </View>
            </Section>

            {attrs.brands.length > 0 && (
              <Section title="Thương hiệu" last>
                <ChipList items={attrs.brands.map((b) => ({ key: b.name, label: b.name }))} isActive={(k) => draft.brands.includes(k)} onPress={(k) => set({ brands: toggle(draft.brands, k) })} />
              </Section>
            )}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <Button title="Thiết lập lại" variant="outline" textColor={colors.secondaryHover} onPress={() => setDraft(emptyFilter)} style={{ flex: 1 }} />
            <Button title="Áp dụng" onPress={() => onApply(draft)} style={{ flex: 1 }} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Section({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.section, last && { borderBottomWidth: 0 }]}>
      <AppText variant="bodyMedium">{title}</AppText>
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <AppText variant="bodySmall" color={active ? colors.primary : colors.text} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Hiện 6 lựa chọn đầu + "Xem thêm" (mở toàn bộ). Lựa chọn đang chọn luôn hiện. */
function ChipList({ items, isActive, onPress, limit = 6 }: { items: { key: string; label: string }[]; isActive: (k: string) => boolean; onPress: (k: string) => void; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.filter((it, i) => i < limit || isActive(it.key));
  return (
    <View style={styles.chips}>
      {shown.map((it) => (
        <Chip key={it.key} label={it.label} active={isActive(it.key)} onPress={() => onPress(it.key)} />
      ))}
      {items.length > limit && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={styles.more} hitSlop={6}>
          <AppText variant="bodySmall" color={colors.primary}>
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </AppText>
          <RIcon name={expanded ? 'arrowUpSLine' : 'arrowRightSLine'} size={18} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

function PriceInput({ placeholder, value, onChangeText }: { placeholder: string; value: string; onChangeText: (t: string) => void }) {
  return (
    <View style={styles.priceInput}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.neutral60}
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
        style={styles.priceText}
      />
      <AppText variant="bodySmall" color={colors.neutral60}>
        đ
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: { height: '100%', backgroundColor: colors.white },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  body: { paddingHorizontal: 12, paddingBottom: 24 },
  section: { gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.neutral40 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.neutral40, justifyContent: 'center', backgroundColor: colors.white },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  more: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.neutral40 },
  priceText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text, padding: 0 },
  dash: { width: 12, height: 1, backgroundColor: colors.neutral60 },
  footer: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.neutral30 },
});
