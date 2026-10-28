import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useOrder } from '@/api/hooks';
import { ScreenHeader } from '@/components/headers';
import { OrderLineRow, StatusChip } from '@/components/order-ui';
import { ResultDialog, useToast } from '@/components/overlays';
import { AppText, Button, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';
import { safeBack } from '@/utils/navigation';

type Media = { uri: string; video: boolean };

/** Đơn hàng_Đánh giá đơn hàng (Figma): sao + ảnh/video + nhận xét. */
export default function ReviewOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { rateOrder } = useApp();
  const { order } = useOrder(id);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [done, setDone] = useState(false);

  if (!order) return null;

  const pick = async (video: boolean) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Bạn cần cấp quyền truy cập thư viện', 'errorWarningLine');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [video ? 'videos' : 'images'],
      allowsMultipleSelection: !video,
      selectionLimit: video ? 1 : 4,
      quality: 0.7,
    });
    if (!res.canceled) setMedia((m) => [...m, ...res.assets.map((a) => ({ uri: a.uri, video }))].slice(0, 5));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Đánh giá đơn hàng" shadow />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.rowBetween}>
            <AppText size={12}>
              Mã đơn <AppText size={12} color={colors.primary}>#{order.code}</AppText>
            </AppText>
            <StatusChip status={order.status} />
          </View>
          {order.lines.map((l, i) => (
            <OrderLineRow key={l.productId + i} {...l} />
          ))}
          <Pressable onPress={() => router.push({ pathname: '/orders/[id]', params: { id: order.id } })} style={{ alignSelf: 'flex-end' }} hitSlop={6}>
            <AppText size={12} color={colors.primary}>
              Xem chi tiết
            </AppText>
          </Pressable>
          <View style={styles.divider} />

          <AppText align="center" style={{ paddingHorizontal: 24 }}>
            Đánh giá đơn hàng để giúp chúng tôi cải thiện hơn dịch vụ của mình
          </AppText>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={4}>
                <RIcon name="starFill" size={32} color={n <= rating ? colors.secondary : colors.neutral40} />
              </Pressable>
            ))}
          </View>

          <View style={styles.mediaButtons}>
            <Pressable style={styles.mediaBtn} onPress={() => pick(false)}>
              <RIcon name="imageAddLine" size={18} color={colors.neutral70} />
              <AppText size={12} color={colors.neutral70}>
                Thêm hình ảnh
              </AppText>
            </Pressable>
            <Pressable style={styles.mediaBtn} onPress={() => pick(true)}>
              <RIcon name="videoAddLine" size={18} color={colors.neutral70} />
              <AppText size={12} color={colors.neutral70}>
                Thêm video
              </AppText>
            </Pressable>
          </View>
          {media.length > 0 && (
            <View style={styles.thumbs}>
              {media.map((m) => (
                <View key={m.uri}>
                  <Image source={{ uri: m.uri }} style={styles.thumb} contentFit="cover" />
                  {m.video && (
                    <View style={styles.play}>
                      <RIcon name="playFill" size={18} color={colors.white} />
                    </View>
                  )}
                  <Pressable onPress={() => setMedia((list) => list.filter((x) => x.uri !== m.uri))} style={styles.remove} hitSlop={8}>
                    <RIcon name="closeCircleFill" size={18} color={colors.text} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Hãy chia sẻ nhận xét cho các sản phẩm này nhé!"
            placeholderTextColor={colors.neutral70}
            multiline
            maxLength={500}
            style={styles.textarea}
          />

          <Button
            title="Gửi đánh giá"
            disabled={rating === 0}
            onPress={() => {
              // API chưa có endpoint đánh giá → lưu số sao trong app (hiện ở tab "Đánh giá").
              rateOrder(order.id, rating);
              setDone(true);
            }}
          />
          {rating === 0 && (
            <AppText size={12} color={colors.neutral60} align="center">
              Chọn số sao để gửi đánh giá
            </AppText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  body: { padding: 12, gap: 14, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: colors.neutral30 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  mediaButtons: { flexDirection: 'row', gap: 8 },
  mediaBtn: { flex: 1, height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 4, borderWidth: 1, borderColor: colors.neutral30 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 6 },
  play: { position: 'absolute', top: 0, left: 0, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6 },
  remove: { position: 'absolute', top: -6, right: -6, backgroundColor: colors.white, borderRadius: 10 },
  textarea: { minHeight: 96, borderRadius: 6, backgroundColor: colors.backgroundAlt, padding: 12, fontFamily: fonts.regular, fontSize: 13, color: colors.text, textAlignVertical: 'top' },
});
