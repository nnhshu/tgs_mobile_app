/** Số di động Việt Nam: 0 (hoặc +84) + đầu số 3/5/7/8/9 + 8 số. */
export const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Bỏ khoảng trắng / dấu chấm người dùng gõ trong số điện thoại. */
export const cleanPhone = (v: string) => v.replace(/[\s.]/g, '');

/** "0902524588" / "+84902524588" → "(+84) 902524588" (cách hiển thị trong Figma). */
export const formatPhoneIntl = (v?: string) => {
  const p = cleanPhone(v ?? '');
  if (!p) return '';
  const local = p.replace(/^(\+84|84|0)/, '');
  return `(+84) ${local}`;
};

/** "0902524588" → "0902 524 588" (cách hiển thị SĐT trong Figma). */
export const formatPhoneDisplay = (v: string) => {
  const d = v.replace(/\D/g, '');
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
};
