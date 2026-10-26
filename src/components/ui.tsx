import { Image, ImageContentFit, ImageProps } from 'expo-image';
import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { icons, img } from '@/assets';
import { remix, RemixName } from '@/remix-icons';
import { colors, fonts, FontWeight, typography } from '@/theme';

/* ---------- Text ---------- */

type AppTextProps = TextProps & {
  variant?: keyof typeof typography;
  color?: string;
  weight?: FontWeight;
  size?: number;
  align?: TextStyle['textAlign'];
  strike?: boolean;
};

export function AppText({ variant = 'bodySmall', color = colors.text, weight, size, align, strike, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        { color },
        weight && { fontFamily: fonts[weight] },
        size !== undefined && { fontSize: size },
        align && { textAlign: align },
        strike && { textDecorationLine: 'line-through' },
        style,
      ]}
    />
  );
}

/* ---------- Icon / image ---------- */

type IconProps = Omit<ImageProps, 'style'> & { size?: number; width?: number; height?: number; style?: ImageProps['style'] };

/** Hiển thị icon SVG/PNG export từ Figma với kích thước gốc của layer. */
export function Icon({ size = 24, width, height, style, contentFit = 'contain', ...rest }: IconProps) {
  return <Image {...rest} contentFit={contentFit} style={[{ width: width ?? size, height: height ?? size }, style]} />;
}

/** Icon Remix (bộ icon Figma dùng) — tô màu bằng tintColor. */
export function RIcon({ name, size = 24, color = colors.text, style }: { name: RemixName; size?: number; color?: string; style?: ImageProps['style'] }) {
  return <Image source={remix[name]} tintColor={color} contentFit="contain" style={[{ width: size, height: size }, style]} />;
}

export function Photo({
  source,
  style,
  radius = 8,
  contentFit = 'cover',
}: {
  source: ImageProps['source'];
  style?: StyleProp<ViewStyle>;
  radius?: number;
  contentFit?: ImageContentFit;
}) {
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', backgroundColor: colors.white }, style]}>
      <Image source={source} contentFit={contentFit} style={StyleSheet.absoluteFill} transition={150} />
    </View>
  );
}

/* ---------- Buttons ---------- */

type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'outline';
  size?: 'md' | 'sm';
  left?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

/** Nút bo tròn 1000px cao 52 (Secondary/Main) như trong design. */
export function Button({ title, variant = 'primary', size = 'md', left, disabled, style, textColor, ...rest }: ButtonProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? styles.buttonPrimary : styles.buttonOutline,
        size === 'sm' && styles.buttonSm,
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.85 },
        style,
      ]}>
      {left}
      <AppText variant={size === 'sm' ? 'bodySmallSemibold' : 'bodyMediumSemibold'} align="center" color={textColor}>
        {title}
      </AppText>
    </Pressable>
  );
}

/** Nút tròn mờ trên header xanh (thông báo / giỏ hàng) kèm badge đỏ. */
export function IconBadgeButton({
  icon,
  count,
  onPress,
  background = 'rgba(255,255,255,0.12)',
  badgeColor = colors.errorHover,
}: {
  icon: ImageProps['source'];
  count?: number;
  onPress?: () => void;
  background?: string;
  badgeColor?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={[styles.iconBadge, { backgroundColor: background }]}>
      <Icon source={icon} size={16} />
      {!!count && (
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <AppText size={12} weight="medium" color={colors.white} align="center" style={styles.badgeText}>
            {count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/* ---------- Section ---------- */

export function SectionHeader({
  title,
  action = 'Xem tất cả',
  onAction,
  titleSize = 16,
  actionColor = colors.primary,
  style,
}: {
  title: ReactNode;
  action?: string | null;
  onAction?: () => void;
  titleSize?: number;
  actionColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      {typeof title === 'string' ? (
        <AppText weight="semibold" size={titleSize}>
          {title}
        </AppText>
      ) : (
        title
      )}
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText color={actionColor}>{action}</AppText>
        </Pressable>
      )}
    </View>
  );
}

export function Divider({ color = colors.divider, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: color, alignSelf: 'stretch' }, style]} />;
}

export function Chip({ label, tone = 'sale', style }: { label: string; tone?: 'sale' | 'new' | 'soft'; style?: StyleProp<ViewStyle> }) {
  const bg = tone === 'sale' ? colors.error : tone === 'new' ? colors.success : colors.errorSurface;
  const fg = tone === 'soft' ? colors.error : colors.white;
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <AppText variant="xsmallSemibold" color={fg} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

/* ---------- Form controls ---------- */

export function Checkbox({ checked, partial, onPress }: { checked: boolean; partial?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.control}>
      {checked ? (
        <Icon source={partial ? icons.checkboxPartial : icons.checkboxChecked} size={24} />
      ) : (
        <View style={styles.checkboxEmpty} />
      )}
    </Pressable>
  );
}

export function Radio({ selected, onPress }: { selected: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.control}>
      {selected ? (
        <View style={styles.radioOn}>
          <View style={styles.radioDot} />
        </View>
      ) : (
        <View style={styles.radioOff} />
      )}
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={8} style={[styles.toggle, value ? styles.toggleOn : styles.toggleOff]}>
      {value ? (
        <Icon source={img.toggleOnKnob} size={16} />
      ) : (
        <Icon source={img.toggleOffKnob} width={20} height={20} style={{ margin: -2, marginTop: -1 }} />
      )}
    </Pressable>
  );
}

/** Bộ tăng giảm số lượng (component "Count" trong Figma). */
export function QuantityStepper({
  value,
  onChange,
  size = 28,
  accentPlus,
  gap = 4,
  fontSize = 16,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  accentPlus?: boolean;
  gap?: number;
  fontSize?: number;
}) {
  return (
    <View style={[styles.stepper, { gap }]}>
      <Pressable onPress={() => onChange(value - 1)} style={[styles.stepperBtn, { width: size, height: size }]}>
        <Icon source={icons.minus} size={16} />
      </Pressable>
      <AppText weight="semibold" size={fontSize} align="center" style={{ width: 26 }}>
        {value}
      </AppText>
      <Pressable
        onPress={() => onChange(value + 1)}
        style={[styles.stepperBtn, { width: size, height: size }, accentPlus && styles.stepperBtnAccent]}>
        <Icon source={accentPlus ? icons.plusWhite : icons.plus} size={16} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 1000,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSm: { height: 44, paddingHorizontal: 16 },
  buttonPrimary: { backgroundColor: colors.secondary },
  buttonOutline: { borderWidth: 1, borderColor: colors.secondaryHover, backgroundColor: colors.white },
  iconBadge: { padding: 12, borderRadius: 100 },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    padding: 2,
    borderRadius: 16,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: { lineHeight: 18, minWidth: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  chip: { height: 20, borderRadius: 1000, paddingHorizontal: 8, justifyContent: 'center', alignSelf: 'flex-start' },
  control: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  checkboxEmpty: {
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DFE1E7',
    boxShadow: '0px 1px 2px rgba(164,172,185,0.4)',
  },
  radioOff: {
    width: 16,
    height: 16,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DFE1E7',
    boxShadow: '0px 1px 2px rgba(164,172,185,0.4)',
  },
  radioOn: {
    width: 16,
    height: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white },
  toggle: { width: 36, height: 24, borderRadius: 999, padding: 2, flexDirection: 'row', alignItems: 'center' },
  toggleOn: { backgroundColor: colors.primary, justifyContent: 'flex-end' },
  toggleOff: { backgroundColor: colors.neutral60, justifyContent: 'flex-start', paddingLeft: 3 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 99,
    backgroundColor: colors.neutral20,
    borderWidth: 1,
    borderColor: colors.neutral30,
  },
  stepperBtn: {
    borderRadius: 1000,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnAccent: { backgroundColor: colors.secondary, borderColor: colors.secondary },
});
