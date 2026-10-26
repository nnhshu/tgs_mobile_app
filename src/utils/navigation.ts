import { router } from 'expo-router';

/**
 * Quay lại màn trước; nếu không còn màn nào (mở app thẳng vào màn con qua deep link
 * hoặc Expo Go khôi phục màn đang xem) thì về Trang chủ — tránh lỗi "GO_BACK was not handled".
 */
export function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}

/** Sau khi đăng xuất / phiên hết hạn: đóng các màn đang mở (về tab) rồi mở màn Đăng nhập. */
export function goToLogin() {
  if (router.canDismiss()) router.dismissAll();
  router.push('/login');
}
