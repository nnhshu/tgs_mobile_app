/**
 * Nhật ký gọi API — in ra terminal Metro và lưu 200 bản ghi gần nhất để xem trong màn /api-logs.
 * Bật ở bản dev (__DEV__) hoặc khi EXPO_PUBLIC_API_LOG=1. Mật khẩu / token / OTP được che.
 */
export const API_LOG_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_API_LOG === '1';

export type ApiLogStatus = 'pending' | 'success' | 'error';

export type ApiLogEntry = {
  id: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  status: ApiLogStatus;
  httpStatus?: number;
  durationMs?: number;
  startedAt: number;
  /** Tóm tắt kết quả (số item, tổng, trang...) */
  summary?: string;
  response?: unknown;
  error?: string;
};

const MAX_ENTRIES = 200;
const SENSITIVE = /^(password|pass|token|access_token|jwt|code|otp|authorization)$/i;

let entries: ApiLogEntry[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Che dữ liệu nhạy cảm: "secret123" → "se•••••23", OTP "123456" → "1••••6". */
const maskValue = (v: unknown) => {
  const s = String(v ?? '');
  if (s.length <= 4) return '•'.repeat(s.length);
  return `${s.slice(0, s.length > 8 ? 2 : 1)}${'•'.repeat(Math.min(s.length - 3, 6))}${s.slice(s.length > 8 ? -2 : -1)}`;
};

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE.test(k) ? maskValue(v) : redact(v, depth + 1)]));
}

/** Rút gọn response để log không quá dài (mảng → 2 phần tử đầu, chuỗi dài → 120 ký tự). */
function shrink(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return value.length > 120 ? `${value.slice(0, 120)}… (${value.length} ký tự)` : value;
  if (value === null || typeof value !== 'object') return value;
  if (depth > 3) return Array.isArray(value) ? `[${value.length} phần tử]` : '{…}';
  if (Array.isArray(value)) {
    const head = value.slice(0, 2).map((v) => shrink(v, depth + 1));
    return value.length > 2 ? [...head, `… +${value.length - 2} phần tử`] : head;
  }
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, shrink(v, depth + 1)]));
}

/** Tóm tắt nhanh: danh sách → số phần tử, trang sản phẩm → items/total/page. */
function summarize(data: unknown): string {
  if (Array.isArray(data)) return `${data.length} phần tử`;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const parts: string[] = [];
    if (Array.isArray(d.items)) parts.push(`${d.items.length} items`);
    if (d.total !== undefined) parts.push(`total ${d.total}`);
    if (d.page !== undefined) parts.push(`trang ${d.page}/${d.total_pages ?? '?'}`);
    if (d.token) parts.push('có token');
    if (d.success !== undefined) parts.push(`success=${d.success}`);
    if (d.channel) parts.push(`channel=${d.channel}`);
    if (d.message) parts.push(String(d.message));
    if (parts.length) return parts.join(' · ');
    return `{ ${Object.keys(d).slice(0, 6).join(', ')} }`;
  }
  return String(data);
}

const fmtPath = (path: string, query?: Record<string, unknown>) => {
  const q = query ? Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '') : [];
  return q.length ? `${path}?${q.map(([k, v]) => `${k}=${v}`).join('&')}` : path;
};

export function logStart(method: ApiLogEntry['method'], path: string, query?: Record<string, unknown>, body?: unknown) {
  if (!API_LOG_ENABLED) return -1;
  const entry: ApiLogEntry = { id: nextId++, method, path, query, body: redact(body), status: 'pending', startedAt: Date.now() };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  console.log(`[API] → ${method} ${fmtPath(path, query)}${body !== undefined ? ` ${JSON.stringify(entry.body)}` : ''}`);
  emit();
  return entry.id;
}

export function logSuccess(id: number, httpStatus: number, data: unknown) {
  if (!API_LOG_ENABLED || id < 0) return;
  update(id, (e) => {
    const durationMs = Date.now() - e.startedAt;
    const summary = summarize(data);
    console.log(`[API] ← ${httpStatus} ${e.method} ${fmtPath(e.path, e.query)} (${durationMs}ms) ${summary}`);
    return { ...e, status: 'success', httpStatus, durationMs, summary, response: shrink(redact(data)) };
  });
}

export function logError(id: number, error: string, httpStatus?: number, data?: unknown) {
  if (!API_LOG_ENABLED || id < 0) return;
  update(id, (e) => {
    const durationMs = Date.now() - e.startedAt;
    console.warn(`[API] ✕ ${httpStatus ?? 'ERR'} ${e.method} ${fmtPath(e.path, e.query)} (${durationMs}ms) ${error}`);
    return { ...e, status: 'error', httpStatus, durationMs, error, response: data === undefined ? undefined : shrink(redact(data)) };
  });
}

function update(id: number, fn: (e: ApiLogEntry) => ApiLogEntry) {
  entries = entries.map((e) => (e.id === id ? fn(e) : e));
  emit();
}

export const getApiLogs = () => entries;
export const clearApiLogs = () => {
  entries = [];
  emit();
};
export const subscribeApiLogs = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const formatLogPath = fmtPath;
