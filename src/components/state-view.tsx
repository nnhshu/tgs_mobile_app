import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { icons, img } from '@/assets';
import { AppText, Button, Icon } from '@/components/ui';
import { colors } from '@/theme';

/** Trạng thái rỗng / lỗi kết nối ("Search Empty", "Search Error" trong Figma). */
export function StateView({
  type,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: {
  type: 'empty' | 'offline';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      {type === 'offline' ? <Icon source={icons.wifiOff} size={24} /> : <Icon source={img.emptySearch} size={58} />}
      <View style={{ gap: 4, alignItems: 'center' }}>
        <AppText variant="h5" align="center">
          {title}
        </AppText>
        <AppText color={colors.neutral70} align="center">
          {message}
        </AppText>
      </View>
      {actionLabel && (
        <Button title={actionLabel} size="sm" onPress={onAction} style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 16, paddingHorizontal: 32 },
  button: { minWidth: 128 },
});
