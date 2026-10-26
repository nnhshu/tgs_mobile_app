import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/client';

/** Không thử lại lỗi 4xx (sai dữ liệu / hết phiên) — chỉ thử lại 1 lần với lỗi mạng hoặc 5xx. */
const shouldRetry = (failureCount: number, error: unknown) => {
  const status = error instanceof ApiError ? error.status : undefined;
  if (status && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000, retry: shouldRetry },
  },
});
