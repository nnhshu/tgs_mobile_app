import { Href, router, useNavigation } from 'expo-router';
import { useCallback } from 'react';

import { safeBack } from '@/utils/navigation';

/** Các màn thuộc luồng đăng nhập — đóng hết khi đăng nhập xong. */
const AUTH_ROUTES = new Set(['login', 'otp', 'register']);

type StackState = { routes: { name: string }[]; index: number };
type ResettableNavigation = { getState: () => StackState | undefined; reset: (state: { index: number; routes: { name: string }[] }) => void };

/**
 * Thoát luồng đăng nhập an toàn:
 * - Còn màn khác bên dưới (Giỏ hàng, Tài khoản...) → đóng đúng số màn login/otp/register.
 * - Cả ngăn xếp chỉ toàn màn đăng nhập (mở app thẳng vào /login) → đặt lại ngăn xếp về Trang chủ,
 *   không dùng back/dismiss vì sẽ lỗi "GO_BACK was not handled".
 * - Sau đó mở màn đang chờ (redirect, vd. /checkout).
 */
export function useLeaveAuth() {
  const navigation = useNavigation() as unknown as ResettableNavigation;

  const leave = useCallback(
    (redirect?: string) => {
      const state = navigation.getState();
      const routes = state ? state.routes.slice(0, state.index + 1) : [];
      let authCount = 0;
      for (let i = routes.length - 1; i >= 0 && AUTH_ROUTES.has(routes[i].name); i--) authCount++;

      if (authCount > 0 && authCount < routes.length) {
        router.dismiss(authCount);
      } else {
        navigation.reset({ index: 0, routes: [{ name: '(tabs)' }] });
      }
      if (redirect) router.push(redirect as Href);
    },
    [navigation],
  );

  return { leave, close: safeBack };
}
