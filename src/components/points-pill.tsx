import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { img } from '@/assets';
import { AppText, Icon } from '@/components/ui';
import { colors } from '@/theme';

/** Viên thuốc kính mờ hiển thị điểm thưởng (dùng ở Ưu đãi & Tài khoản). */
export function PointsPill({ compact, points }: { compact?: boolean; points: number }) {
  return (
    <View style={[styles.pill, compact && styles.compact]}>
      <BlurView intensity={21} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.2)']}
        locations={[0.14, 0.63]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Icon source={compact ? img.medalSm : img.medal} size={compact ? 20 : 36} />
      <AppText variant="bodyMediumSemibold" color={colors.white}>
        {points} điểm
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 128,
    borderWidth: 1.2,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  compact: { height: 36, paddingLeft: 8, paddingRight: 12 },
});
