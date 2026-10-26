import { useEffect } from 'react';

import { setUnauthorizedHandler } from '@/api/client';
import { useToast } from '@/components/overlays';
import { useApp } from '@/store/app-store';
import { goToLogin } from '@/utils/navigation';

/** Token hết hạn / bị thu hồi (API trả 401) → đăng xuất và báo người dùng. */
export function SessionWatcher() {
  const { logout, isLoggedIn } = useApp();
  const toast = useToast();
  useEffect(() => {
    if (!isLoggedIn) {
      setUnauthorizedHandler(null);
      return;
    }
    setUnauthorizedHandler(() => {
      logout();
      toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 'errorWarningLine');
      goToLogin();
    });
    return () => setUnauthorizedHandler(null);
  }, [isLoggedIn, logout, toast]);
  return null;
}
