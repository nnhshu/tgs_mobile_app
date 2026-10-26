import { useEffect, useState } from 'react';

/** Trả về giá trị sau khi ngừng thay đổi `delay` ms (dùng cho gợi ý tìm kiếm). */
export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
