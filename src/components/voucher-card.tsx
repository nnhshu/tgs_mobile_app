import { Pressable, StyleSheet, View } from 'react-native';

import { img } from '@/assets';
import { AppText, Icon } from '@/components/ui';
import { colors } from '@/theme';

export type Voucher = {
  title: string;
  expiry: string;
  expiryUrgent?: boolean;
  action: string;
  points?: number;
  art: number;
  /** Ảnh FREESHIP là khối 80x80 hoàn chỉnh; các ảnh "GIẢM" đặt trên nền xanh. */
  fullArt?: boolean;
};

/** Thẻ voucher có răng cưa bên phải (component "Voucher" trong Figma). */
export function VoucherCard({ voucher, onPress, onAction, stamp }: { voucher: Voucher; onPress?: () => void; onAction?: () => void; stamp?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.wrap, stamp && { opacity: 0.6 }]}>
      <View style={styles.body}>
        {voucher.fullArt ? (
          <Icon source={voucher.art} size={80} />
        ) : (
          <View style={styles.art}>
            <Icon source={voucher.art} width={40} height={55.433} />
          </View>
        )}
        <View style={styles.content}>
          <View style={{ flex: 1, gap: 8 }}>
            <View style={{ gap: 4 }}>
              <AppText weight="semibold" color="#242422" style={voucher.points ? { width: 148 } : undefined}>
                {voucher.title}
              </AppText>
              <AppText size={12} color={voucher.expiryUrgent ? colors.error : '#959595'}>
                {voucher.expiry}
              </AppText>
            </View>
            {stamp ? (
              <AppText weight="semibold" color={colors.neutral60}>
                {stamp}
              </AppText>
            ) : (
              <Pressable onPress={onAction ?? onPress} disabled={!onAction && !onPress} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                <AppText weight="semibold" color={colors.primary}>
                  {voucher.action}
                </AppText>
              </Pressable>
            )}
          </View>
          {voucher.points !== undefined && (
            <View style={styles.points}>
              <AppText variant="bodyMediumSemibold" weight="bold" color={colors.secondary} align="center">
                {voucher.points}
              </AppText>
              <AppText variant="xsmallMedium" color={colors.secondary}>
                điểm
              </AppText>
            </View>
          )}
        </View>
      </View>
      <Icon source={img.voucherEdge} width={45} height={96} contentFit="fill" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', height: 96, boxShadow: '-8px 4px 6px rgba(64,64,64,0.08)' },
  body: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  art: { width: 80, height: 80, borderRadius: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  points: { width: 48, height: 48, borderRadius: 6, backgroundColor: colors.secondarySurface, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
