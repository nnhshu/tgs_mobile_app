/** Số di động Việt Nam: 0 (hoặc +84) + đầu số 3/5/7/8/9 + 8 số. */
export const VN_PHONE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Bỏ khoảng trắng / dấu chấm người dùng gõ trong số điện thoại. */
export const cleanPhone = (v: string) => v.replace(/[\s.]/g, '');
