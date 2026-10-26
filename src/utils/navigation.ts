import { router } from 'expo-router';

/**
 * Quay lại màn trước; nếu không còn màn nào (mở app thẳng vào màn con qua deep link
 * hoặc Expo Go khôi phục màn đang xem) thì về Trang chủ — tránh lỗi "GO_BACK was not handled".
 */
export function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
