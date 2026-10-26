import { ReactNode, useEffect } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppText, RIcon } from '@/components/ui';
import { RemixName } from '@/remix-icons';
import { colors, fonts } from '@/theme';

/** Ô nhập có nhãn (component "Input" trong Figma: label 16 medium, ô cao 48, viền #E0E0E0). */
export function FormField({
  label,
  required,
  error,
  icon,
  leading,
  right,
  style,
  multiline,
  ...input
}: TextInputProps & {
  label?: string;
  required?: boolean;
  error?: string;
  icon?: RemixName;
  /** Icon tuỳ ý bên trái (vd. SVG xuất từ Figma) — dùng khi không có trong bộ Remix. */
  leading?: ReactNode;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 8 }, style]}>
      {label && (
        <AppText variant="bodyMedium">
          {label}
          {required && <AppText variant="bodyMedium" color={colors.error}> *</AppText>}
        </AppText>
      )}
      <View style={[styles.input, multiline && styles.multiline, !!error && { borderColor: colors.error }]}>
        {leading}
        {icon && <RIcon name={icon} size={20} color={colors.neutral60} />}
        <TextInput
          placeholderTextColor={colors.neutral60}
          multiline={multiline}
          {...input}
          style={[styles.text, multiline && { textAlignVertical: 'top', minHeight: 80 }]}
        />
        {right}
      </View>
      {!!error && (
        <AppText size={12} color={colors.error}>
          {error}
        </AppText>
      )}
    </View>
  );
}

/** Ô chọn (dropdown giả) — hiện giá trị + mũi tên, bấm để mở sheet chọn. */
export function SelectField({ label, value, placeholder, onPress, required }: { label: string; value?: string; placeholder: string; onPress: () => void; required?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="bodyMedium">
        {label}
        {required && <AppText variant="bodyMedium" color={colors.error}> *</AppText>}
      </AppText>
      <Pressable onPress={onPress} style={styles.input}>
        <AppText variant="bodyMediumRegular" color={value ? colors.text : colors.neutral60} style={{ flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </AppText>
        <RIcon name="arrowDownSLine" size={20} color={colors.neutral60} />
      </Pressable>
    </View>
  );
}

/** Chip chọn 1 (bộ lọc, loại địa chỉ, lý do huỷ...). */
export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
  multiple,
}: {
  options: readonly T[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multiple?: boolean;
}) {
  const isActive = (o: T) => (multiple ? (value as T[]).includes(o) : value === o);
  return (
    <View style={styles.chips}>
      {options.map((o) => {
        const active = isActive(o);
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={[styles.chip, active && styles.chipActive]}>
            <AppText color={active ? colors.primary : colors.text}>{o}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Thanh tab ngang có gạch chân (component "List" 494x51 trong Đơn hàng / Ưu đãi của bạn). */
export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  counts,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (v: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <View style={styles.tabsWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
        {tabs.map((t) => {
          const active = t === value;
          const count = counts?.[t];
          return (
            <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, active && styles.tabActive]}>
              <AppText weight={active ? 'semibold' : 'regular'} color={active ? colors.primary : colors.neutral70}>
                {t}
                {count ? ` (${count})` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Khối xám nhấp nháy cho trạng thái Loading (skeleton). */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.4, { duration: 700 }), -1, true);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ backgroundColor: colors.neutral30, borderRadius: 8 }, style, animated]} />;
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.neutral40,
    borderRadius: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.neutral40,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  tabsWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  tab: { height: 50, paddingHorizontal: 12, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
});
