import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceChips, FormField } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { OrderLineRow } from '@/components/order-ui';
import { ResultDialog } from '@/components/overlays';
import { AppText, Button, RIcon } from '@/components/ui';
import { reviewTags } from '@/data/mock-extra';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

const LABELS = ['Rất tệ', 'Không hài lòng', 'Bình thường', 'Hài lòng', 'Tuyệt vời'];

/** Đơn hàng_Đánh giá đơn hàng. */
export default function ReviewOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { orders, setOrderStatus } = useApp();
  const order = orders.find((o) => o.id === id) ?? orders[0];
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4, quality: 0.7 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)].slice(0, 4));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Đánh giá đơn hàng" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 12, gap: 16 }} keyboardShouldPersistTaps="handled">
          {order.lines.map((l) => (
            <OrderLineRow key={l.productId} {...l} />
          ))}
          <View style={styles.card}>
            <AppText variant="bodyMediumSemibold" align="center">
              Bạn cảm thấy đơn hàng thế nào?
            </AppText>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                  <RIcon name={n <= rating ? 'starFill' : 'starLine'} size={36} color={n <= rating ? colors.secondary : colors.neutral50} />
                </Pressable>
              ))}
            </View>
            <AppText weight="semibold" color={colors.secondary} align="center">
              {LABELS[rating - 1]}
            </AppText>
          </View>
          <ChoiceChips options={reviewTags} value={tags as (typeof reviewTags)[number][]} multiple onChange={(t) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))} />
          <FormField label="Nhận xét" placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm và dịch vụ..." multiline maxLength={500} value={content} onChangeText={setContent} />
          <AppText size={12} color={colors.neutral60} align="right" style={{ marginTop: -8 }}>
            {content.length}/500
          </AppText>
          <View style={{ gap: 8 }}>
            <AppText variant="bodyMedium">Thêm hình ảnh</AppText>
            <View style={styles.photos}>
              {photos.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  <Pressable onPress={() => setPhotos((p) => p.filter((x) => x !== uri))} style={styles.removePhoto} hitSlop={6}>
                    <RIcon name="closeCircleFill" size={20} color={colors.text} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 4 && (
                <Pressable onPress={pick} style={[styles.photo, styles.addPhoto]}>
                  <RIcon name="cameraLine" size={24} color={colors.primary} />
                  <AppText size={11} color={colors.primary}>
                    {photos.length}/4
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button
          title="Gửi đánh giá"
          onPress={() => {
            setOrderStatus(order.id, 'Hoàn thành', { reviewed: true });
            setDone(true);
          }}
        />
      </View>
      <ResultDialog
        visible={done}
        title="Cảm ơn bạn đã đánh giá!"
        message="Đánh giá của bạn giúp Thế Giới Sữa phục vụ tốt hơn."
        onClose={() => {
          setDone(false);
          safeBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  card: { gap: 8, padding: 16, borderRadius: 12, backgroundColor: colors.backgroundAlt },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  photos: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  photo: { width: 72, height: 72, borderRadius: 8 },
  addPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', gap: 2 },
  removePhoto: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.white, borderRadius: 10 },
  bottom: { paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.neutral30 },
});
