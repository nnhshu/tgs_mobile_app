import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { ProductCard } from '@/components/product-card';
import { StateView } from '@/components/state-view';
import { AppText, Icon, Photo } from '@/components/ui';
import { useProducts } from '@/api/hooks';
import { SpinningLoader } from '@/components/overlays';
import { hotCategories, normalize, popularSearches } from '@/data/mock';
import { useDebounce } from '@/hooks/use-debounce';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';
import { safeBack } from '@/utils/navigation';

const FEATURED = [0, 1, 2, 6, 3, 4, 5, 7].map((i) => hotCategories[i]);

/** Phần khớp từ khoá in đậm, phần còn lại thường ("Sữa b|ột Similac"). */
function HighlightText({ text, keyword }: { text: string; keyword: string }) {
  const start = normalize(text).indexOf(normalize(keyword));
  if (start < 0 || !keyword.trim()) return <AppText variant="bodyMediumRegular">{text}</AppText>;
  const end = start + keyword.trim().length;
  return (
    <AppText variant="bodyMediumRegular" style={{ flex: 1 }} numberOfLines={1}>
      {text.slice(0, start)}
      <AppText variant="bodyMediumRegular" weight="bold">
        {text.slice(start, end)}
      </AppText>
      {text.slice(end)}
    </AppText>
  );
}

/** Search / Search Focus & Suggestion / List search / Search Empty / Search Error. */
export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ q?: string }>();
  const { recentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } = useApp();

  const [text, setText] = useState(params.q ?? '');
  const [submitted, setSubmitted] = useState(params.q ?? '');
  const [focused, setFocused] = useState(!params.q);

  const results = useProducts({ search: submitted }, { enabled: !!submitted });
  // Gợi ý khi gõ: gọi API tìm kiếm (6 kết quả) sau 300ms ngừng gõ.
  const debounced = useDebounce(text.trim(), 300);
  const suggestQuery = useProducts({ search: debounced, per_page: 6 }, { enabled: focused && debounced.length >= 2 });
  const suggestions = useMemo(() => suggestQuery.products.map((p) => ({ id: p.id, name: p.name })), [suggestQuery.products]);
  const gridItemWidth = Math.floor((width - 24 - 12) / 2);

  const submit = (keyword: string) => {
    const k = keyword.trim();
    if (!k) return;
    setText(k);
    setSubmitted(k);
    setFocused(false);
    addRecentSearch(k);
  };

  /** Tìm bằng hình ảnh: chọn ảnh sản phẩm, gợi ý nhóm "Sữa bột" (mô phỏng nhận diện ảnh). */
  const searchByImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5 });
    if (!res.canceled) submit('Sữa bột');
  };

  const clear = () => {
    setText('');
    setSubmitted('');
    setFocused(true);
  };

  const typing = focused && text.trim().length > 0;
  const showResults = !focused && !!submitted;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={safeBack} hitSlop={10}>
          <Icon source={icons.arrowLeft} size={24} />
        </Pressable>
        <View style={[styles.input, focused && styles.inputFocused]}>
          <Icon source={icons.searchGray} size={20} />
          <TextInput
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onSubmitEditing={() => submit(text)}
            placeholder="Tìm sữa, thương hiệu"
            placeholderTextColor={colors.neutral70}
            returnKeyType="search"
            autoFocus={!params.q}
            style={styles.inputText}
          />
          {text.length > 0 ? (
            <Pressable onPress={clear} hitSlop={8}>
              <Icon source={icons.clearFill} size={24} />
            </Pressable>
          ) : (
            <Pressable onPress={searchByImage} hitSlop={8}>
              <Icon source={icons.camera} size={24} />
            </Pressable>
          )}
        </View>
      </View>

      {typing ? (
        <ScrollView style={styles.white} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => submit(text)} style={styles.suggestionRow}>
            <Icon source={icons.searchGray} size={20} />
            <AppText variant="bodyMediumRegular" color={colors.primary} style={{ flex: 1 }} numberOfLines={1}>
              Tìm “{text.trim()}”
            </AppText>
          </Pressable>
          {suggestQuery.isFetching && suggestions.length === 0 && <SpinningLoader size={24} />}
          {suggestions.map((s) => (
            <Pressable key={s.id} onPress={() => router.push({ pathname: '/product/[id]', params: { id: s.id } })} style={styles.suggestionRow}>
              <HighlightText text={s.name} keyword={text} />
            </Pressable>
          ))}
        </ScrollView>
      ) : showResults ? (
        results.isLoading ? (
          <View style={[styles.white, styles.center]}>
            <SpinningLoader />
          </View>
        ) : results.isError ? (
          <View style={[styles.white, styles.center]}>
            <StateView type="offline" title="Không thể tải kết quả" message="Kiểm tra kết nối và thử lại" actionLabel="Thử lại" onAction={() => results.refetch()} />
          </View>
        ) : results.products.length === 0 ? (
          <View style={styles.white}>
            <View style={styles.resultHeader}>
              <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                Kết quả cho“{submitted}”
              </AppText>
              <AppText color={colors.neutral70}>0 sản phẩm</AppText>
            </View>
            <View style={styles.center}>
              <StateView
                type="empty"
                title="Không tìm thấy kết quả nào"
                message={'Rất tiếc khi không tìm thấy sản phẩm bạn cần.\nBạn có thể thử lại bằng từ khoá khác nhé!'}
              />
            </View>
          </View>
        ) : (
          <FlatList
            data={results.products}
            keyExtractor={(p) => p.id}
            numColumns={2}
            style={styles.white}
            columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 12 }}
            contentContainerStyle={{ rowGap: 12, paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.resultHeader}>
                <AppText>
                  {results.total} kết quả cho &quot;{submitted.toLowerCase()}&quot;
                </AppText>
              </View>
            }
            renderItem={({ item }) => <ProductCard product={item} width={gridItemWidth} />}
            onEndReachedThreshold={0.6}
            onEndReached={() => results.hasNextPage && !results.isFetchingNextPage && results.fetchNextPage()}
            ListFooterComponent={results.isFetchingNextPage ? <SpinningLoader size={28} /> : null}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={{ gap: 0, paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 && (
            <View style={styles.white}>
              <View style={styles.sectionTitle}>
                <AppText variant="h5">Tìm kiếm gần đây</AppText>
                <Pressable onPress={clearRecentSearches} hitSlop={8}>
                  <AppText weight="medium" color={colors.primary}>
                    Xoá tất cả
                  </AppText>
                </Pressable>
              </View>
              <View style={styles.recentList}>
                {recentSearches.map((k) => (
                  <View key={k} style={styles.recentRow}>
                    <Pressable onPress={() => submit(k)} style={styles.recentText}>
                      <Icon source={icons.history} size={24} />
                      <AppText variant="bodyMediumRegular" color={colors.neutral70} style={{ flex: 1 }} numberOfLines={1}>
                        {k}
                      </AppText>
                    </Pressable>
                    <Pressable onPress={() => removeRecentSearch(k)} hitSlop={10}>
                      <Icon source={icons.closeGray} size={18} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={[styles.white, { marginTop: 4, paddingBottom: 12 }]}>
            <View style={[styles.sectionTitle, { paddingBottom: 12 }]}>
              <AppText variant="h5">Tìm kiếm phổ biến</AppText>
            </View>
            <View style={styles.chips}>
              {popularSearches.map((k) => (
                <Pressable key={k} onPress={() => submit(k)} style={styles.chip}>
                  <AppText weight="medium" color={colors.primary}>
                    {k}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.white, { marginTop: 4 }]}>
            <View style={[styles.sectionTitle, { paddingTop: 24, paddingBottom: 12 }]}>
              <AppText variant="h5">Danh mục nổi bật</AppText>
            </View>
            <View style={styles.categoryGrid}>
              {FEATURED.map((c) => (
                <Pressable
                  key={c.label}
                  style={styles.category}
                  onPress={() =>
                    router.push({
                      pathname: '/product-list',
                      params: { title: c.label, ...(c.categoryId ? { category: String(c.categoryId) } : { search: c.search ?? c.label }) },
                    })
                  }>
                  <Photo source={c.image} radius={6} style={{ width: 84, height: 84 }} />
                  <AppText size={12} align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {c.label}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 2,
    gap: 12,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 128,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    gap: 8,
    marginVertical: 2,
  },
  inputFocused: { borderColor: colors.primary },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.text, padding: 0 },
  white: { backgroundColor: colors.white, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  suggestions: { paddingHorizontal: 12, paddingVertical: 16, gap: 16 },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 16, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 12, rowGap: 12 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 8, paddingHorizontal: 16 },
  recentList: { padding: 12, gap: 16 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 12 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 1000, backgroundColor: colors.primarySurface, justifyContent: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 12, rowGap: 12 },
  category: { width: 84, gap: 8, alignItems: 'center' },
});
