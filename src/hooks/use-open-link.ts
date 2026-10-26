import { useCallback } from 'react';
import { Linking } from 'react-native';

import { useToast } from '@/components/overlays';

/**
 * Mở link ngoài (tel:, mailto:, maps...). Nếu thiết bị không hỗ trợ (vd. gọi điện trên Simulator)
 * thì thử link dự phòng, cuối cùng báo toast thay vì để lỗi promise văng ra.
 */
export function useOpenLink() {
  const toast = useToast();
  return useCallback(
    async (url: string, fallback?: string) => {
      for (const target of fallback ? [url, fallback] : [url]) {
        try {
          await Linking.openURL(target);
          return;
        } catch {
          // thử link tiếp theo
        }
      }
      toast('Thiết bị không hỗ trợ thao tác này', 'errorWarningLine');
    },
    [toast],
  );
}
