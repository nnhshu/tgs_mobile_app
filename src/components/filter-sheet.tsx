import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips, FormField } from '@/components/form';
import { AppText, Button, Divider, RIcon } from '@/components/ui';
import { colors } from '@/theme';

export const PRICE_RANGES = ['Dưới 200.000 đ', '200.000 - 400.000 đ', '400.000 - 600.000 đ', 'Trên 600.000 đ'] as const;

export type ProductFilter = {
  price: (typeof PRICE_RANGES)[number] | null;
  minPrice: string;
  maxPrice: string;
  brands: string[];
  inStock: boolean;
};

export const emptyFilter: ProductFilter = { price: null, minPrice: '', maxPrice: '', brands: [], inStock: false };

export const countFilters = (f: ProductFilter) => (f.price || f.minPrice || f.maxPrice ? 1 : 0) + f.brands.length + (f.inStock ? 1 : 0);

/** Khoảng giá [min, max] từ bộ lọc. */
export function priceBounds(f: ProductFilter): [number, number] {
  const ranges: Record<(typeof PRICE_RANGES)[number], [number, number]> = {
    'Dưới 200.000 đ': [0, 200000],
    '200.000 - 400.000 đ': [200000, 400000],
    '400.000 - 600.000 đ': [400000, 600000],
    'Trên 600.000 đ': [600000, Infinity],
  };
  const [a, b] = f.price ? ranges[f.price] : [0, Infinity];
  const min = Number(f.minPrice.replace(/\D/g, '')) || a;
  const max = Number(f.maxPrice.replace(/\D/g, '')) || b;
  return [min, max];
}

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** 02_Lọc sản phẩm — toàn màn hình, footer "Thiết lập lại" / "Áp dụng". */
export function FilterSheet({
  visible,
  value,
  brands,
  resultCount,
  onApply,
  onClose,
}: {
  visible: boolean;
  value: ProductFilter;
  /** Thương hiệu có trong các sản phẩm đã tải. */
  brands: string[];
  resultCount: (f: ProductFilter) => number;
  onApply: (f: ProductFilter) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);
  const set = (patch: Partial<ProductFilter>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setDraft(value)}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <RIcon name="closeFill" size={24} />
          </Pressable>
          <AppText variant="h4" style={{ flex: 1 }}>
            Lọc sản phẩm
          </AppText>
          <Pressable onPress={() => setDraft(emptyFilter)} hitSlop={8}>
            <AppText weight="medium" color={colors.primary}>
              Xoá lọc
            </AppText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <Section title="Khoảng giá">
            <ChoiceChips options={PRICE_RANGES} value={draft.price} onChange={(v) => set({ price: draft.price === v ? null : v, minPrice: '', maxPrice: '' })} />
            <View style={styles.priceInputs}>
              <FormField placeholder="Từ" keyboardType="number-pad" value={draft.minPrice} onChangeText={(t) => set({ minPrice: t, price: null })} style={{ flex: 1 }} />
              <View style={styles.dash} />
              <FormField placeholder="Đến" keyboardType="number-pad" value={draft.maxPrice} onChangeText={(t) => set({ maxPrice: t, price: null })} style={{ flex: 1 }} />
            </View>
          </Section>
          <Divider />
          {brands.length > 0 && (
            <>
              <Section title="Thương hiệu">
                <ChoiceChips options={brands} value={draft.brands} multiple onChange={(v) => set({ brands: toggle(draft.brands, v) })} />
              </Section>
              <Divider />
            </>
          )}
          <Pressable style={styles.stockRow} onPress={() => set({ inStock: !draft.inStock })}>
            <AppText variant="bodyMediumSemibold" style={{ flex: 1 }}>
              Chỉ hiện sản phẩm còn hàng
            </AppText>
            <RIcon name={draft.inStock ? 'checkboxCircleFill' : 'checkboxBlankCircleLine'} size={24} color={draft.inStock ? colors.primary : colors.neutral50} />
          </Pressable>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title="Thiết lập lại" variant="outline" onPress={() => setDraft(emptyFilter)} style={{ flex: 1 }} />
          <Button title={`Áp dụng (${resultCount(draft)})`} onPress={() => onApply(draft)} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="bodyMediumSemibold">{title}</AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  body: { padding: 12, gap: 20, paddingBottom: 24 },
  priceInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dash: { width: 12, height: 1, backgroundColor: colors.neutral60 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footer: { flexDirection: 'row', gap: 8, paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.neutral30 },
});
