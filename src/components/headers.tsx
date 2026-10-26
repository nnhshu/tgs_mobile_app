
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { AppText, Icon } from '@/components/ui';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

/** Header trắng: nút back + tiêu đề 20px + action bên phải ("Header Screen" trong Figma). */
export function ScreenHeader({
  title,
  right,
  backIcon = icons.arrowLeft,
  onBack = safeBack,
  hideBack,
  shadow,
  style,
}: {
  title: string;
  hideBack?: boolean;
  right?: ReactNode;
  backIcon?: number;
  onBack?: () => void;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }, shadow && styles.shadow, style]}>
      <View style={styles.row}>
        {!hideBack && (
          <Pressable onPress={onBack} hitSlop={10}>
            <Icon source={backIcon} size={24} />
          </Pressable>
        )}
        <AppText variant="h4" style={{ flex: 1 }} numberOfLines={1}>
          {title}
        </AppText>
        {right}
      </View>
    </View>
  );
}

/** Ô tìm kiếm bo tròn trên nền xanh (Home & Sản phẩm). */
export function SearchBar({
  placeholder,
  cameraIcon = icons.camera,
  cameraSize = 24,
  onPress,
  style,
}: {
  placeholder: string;
  cameraIcon?: number;
  cameraSize?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.search, style]}>
      <View style={styles.searchLeft}>
        <Icon source={icons.search} size={20} />
        <AppText weight="medium" color={colors.neutral60} numberOfLines={1} style={{ flexShrink: 1 }}>
          {placeholder}
        </AppText>
      </View>
      <Icon source={cameraIcon} size={cameraSize} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, paddingBottom: 0 },
  shadow: { boxShadow: '0px 4px 4px rgba(9,30,66,0.05)', zIndex: 2 },
  row: { height: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  search: {
    height: 48,
    borderRadius: 128,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  searchLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
