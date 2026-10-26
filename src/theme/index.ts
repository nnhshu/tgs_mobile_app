import { TextStyle } from 'react-native';

/** Design tokens lấy từ Figma "Thế Giới Sữa App". */
export const colors = {
  primary: '#235DA7',
  primarySurface: '#ECF5FF',
  primaryDark: '#0042BC',
  primaryLight: '#4083FF',
  primaryBorder: '#3079D6',
  secondary: '#F9A51E',
  secondaryHover: '#D88500',
  secondarySurface: '#FFF1DB',
  error: '#DC0000',
  errorHover: '#FF3C3C',
  errorSurface: '#FFEBEB',
  errorBorder: '#FC9595',
  success: '#008E3E',
  warning: '#F26600',
  white: '#FFFFFF',
  neutral20: '#F5F5F5',
  neutral30: '#EDEDED',
  neutral40: '#E0E0E0',
  neutral50: '#C2C2C2',
  neutral60: '#9E9E9E',
  neutral70: '#757575',
  neutral80: '#616161',
  neutral90: '#424242',
  text: '#0A0A0A',
  background: '#F1F3F7',
  backgroundAlt: '#F4F5F5',
  divider: '#E3E3E3',
} as const;

/** Gradient xanh dùng cho header Home / Sản phẩm / Ưu đãi / Tài khoản. */
export const blueGradient = {
  colors: [colors.primaryDark, colors.primaryLight] as const,
  locations: [0.029, 0.896] as const,
};

/**
 * Figma dùng "Inter Display"; bản Google Fonts gần nhất là Inter,
 * nên map theo độ đậm sang các family Inter đã load ở root layout.
 */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export type FontWeight = keyof typeof fonts;

const t = (size: number, weight: FontWeight): TextStyle => ({ fontSize: size, fontFamily: fonts[weight] });

export const typography = {
  h1: t(36, 'semibold'),
  h2: t(30, 'bold'),
  h3: t(24, 'semibold'),
  h4: t(20, 'semibold'),
  h5: t(18, 'semibold'),
  bodyMedium: t(16, 'medium'),
  bodyMediumRegular: t(16, 'regular'),
  bodyMediumSemibold: t(16, 'semibold'),
  bodySmall: t(14, 'regular'),
  bodySmallMedium: t(14, 'medium'),
  bodySmallSemibold: t(14, 'semibold'),
  xsmall: t(12, 'regular'),
  xsmallMedium: t(12, 'medium'),
  xsmallSemibold: t(12, 'semibold'),
} as const;

/** 469000 -> "469.000 đ" (không phụ thuộc Intl của Hermes). */
export const formatPrice = (value: number) =>
  `${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} đ`;

/** Giá sản phẩm; 0 = API chưa công bố giá → "Liên hệ". */
export const priceLabel = (value: number) => (value > 0 ? formatPrice(value) : 'Liên hệ');
