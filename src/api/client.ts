import { decodeEntities } from '@/api/html';
import { logError, logStart, logSuccess } from '@/api/logger';

/**
 * Client cho REST API WordPress của thegioisua.com (namespace tgs/v1).
 * Đổi môi trường bằng biến EXPO_PUBLIC_API_URL trong file .env.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://thegioisua.com/wp-json/tgs/v1';

const TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    /** data của lỗi WordPress (vd. tgs_duplicate_order trả kèm lookup_url). */
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** Đọc lỗi WordPress { code, message, data.status } → ApiError (message tiếng Việt từ server). */
function errorFrom(text: string, status: number) {
  try {
    const body = JSON.parse(text) as { code?: string; message?: string; data?: Record<string, unknown> };
    // Message có thể chứa HTML entity (vd. "543.000&nbsp;VNĐ").
    if (body.message) return { error: new ApiError(decodeEntities(body.message), status, body.code, body.data), body };
  } catch {
    // body không phải JSON
  }
  return { error: new ApiError(`Máy chủ trả lỗi ${status}`, status), body: text.slice(0, 300) };
}

type Query = Record<string, string | number | undefined | null>;

/** Gọi khi request có token bị 401 (token hết hạn / bị thu hồi) — store đăng ký để tự đăng xuất. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

const toQueryString = (query?: Query) => {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

/**
 * Gọi API + ghi nhật ký (logger.ts). API đôi khi trả ký tự điều khiển chưa escape trong mô tả sản phẩm
 * (JSON không hợp lệ), nên đọc dạng text và thay các ký tự này bằng khoảng trắng trước khi parse.
 */
async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  { query, body, token, signal }: { query?: Query; body?: unknown; token?: string | null; signal?: AbortSignal } = {},
): Promise<T> {
  // FormData (upload ảnh) gửi nguyên dạng multipart; fetch tự đặt Content-Type kèm boundary.
  const multipart = body instanceof FormData;
  const logId = logStart(method, path, query, multipart ? '[multipart/form-data]' : body);
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());

  try {
    const res = await fetch(`${API_URL}${path}${toQueryString(query)}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !multipart ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: multipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      const { error, body: errBody } = errorFrom(text, res.status);
      logError(logId, `${error.code ? `[${error.code}] ` : ''}${error.message}`, res.status, errBody);
      if (res.status === 401 && token && path !== '/auth/logout') onUnauthorized?.();
      throw error;
    }
    let data: T;
    try {
      data = (text ? JSON.parse(text.replace(/[\u0000-\u001F]/g, ' ')) : {}) as T;
    } catch {
      logError(logId, 'Response không phải JSON hợp lệ', res.status, text.slice(0, 300));
      throw new ApiError('Dữ liệu máy chủ trả về không hợp lệ', res.status);
    }
    logSuccess(logId, res.status, data);
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === 'AbortError') {
      // Huỷ do người dùng rời màn (React Query) khác với hết thời gian chờ.
      logError(logId, timedOut ? `Hết thời gian chờ (${TIMEOUT_MS / 1000}s)` : 'Đã huỷ');
      throw new ApiError(timedOut ? 'Hết thời gian kết nối, vui lòng thử lại' : 'Yêu cầu đã bị huỷ');
    }
    logError(logId, `Lỗi mạng: ${(e as Error).message}`);
    throw new ApiError('Không thể kết nối máy chủ, kiểm tra mạng và thử lại');
  } finally {
    clearTimeout(timeout);
  }
}

export const apiGet = <T>(path: string, query?: Query, signal?: AbortSignal, token?: string | null) =>
  request<T>('GET', path, { query, signal, token });

/** POST JSON — ném ApiError với message từ server khi lỗi. */
export const apiPost = <T>(path: string, body: unknown, token?: string | null) => request<T>('POST', path, { body, token });

/** PUT JSON (cập nhật dữ liệu). */
export const apiPut = <T>(path: string, body: unknown, token?: string | null) => request<T>('PUT', path, { body, token });

/** DELETE (xoá địa chỉ, ảnh đại diện...). */
export const apiDelete = <T>(path: string, token?: string | null) => request<T>('DELETE', path, { token });

/** POST multipart/form-data (upload ảnh). */
export const apiUpload = <T>(path: string, form: FormData, token?: string | null) => request<T>('POST', path, { body: form, token });

/** Đăng xuất phía server (best-effort — app luôn xoá phiên dù gọi lỗi). */
export const logoutRemote = (token: string) => apiPost('/auth/logout', {}, token).catch(() => undefined);
