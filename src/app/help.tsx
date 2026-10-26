import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/headers';
import { useToast } from '@/components/overlays';
import { AppText, Divider, RIcon } from '@/components/ui';
import { faqs } from '@/data/mock-extra';
import { RemixName } from '@/remix-icons';
import { useOpenLink } from '@/hooks/use-open-link';
import { colors } from '@/theme';

/** Trung tâm trợ giúp — FAQ dạng mở/đóng + kênh liên hệ. */
export default function HelpScreen() {
  const openLink = useOpenLink();
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const contacts: { icon: RemixName; label: string; sub: string; onPress: () => void }[] = [
    { icon: 'phoneLine', label: 'Hotline', sub: '1900 636 975 (7:00 - 22:00)', onPress: () => openLink('tel:1900636975') },
    { icon: 'mailLine', label: 'Email', sub: 'cskh@thegioisua.com', onPress: () => openLink('mailto:cskh@thegioisua.com') },
    { icon: 'chat1Line', label: 'Chat với tư vấn viên', sub: 'Phản hồi trong 5 phút', onPress: () => toast('Tư vấn viên sẽ liên hệ bạn ngay', 'chat1Line') },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Trung tâm trợ giúp" />
      <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 8, paddingBottom: 32 }}>
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Câu hỏi thường gặp</AppText>
          {faqs.map((f, i) => (
            <View key={f.q} style={{ gap: 8 }}>
              {i > 0 && <Divider color={colors.neutral30} />}
              <Pressable style={styles.row} onPress={() => setOpen(open === i ? null : i)}>
                <RIcon name="questionLine" size={20} color={colors.primary} />
                <AppText weight="medium" style={{ flex: 1 }}>
                  {f.q}
                </AppText>
                <RIcon name={open === i ? 'arrowUpSLine' : 'arrowDownSLine'} size={20} color={colors.neutral60} />
              </Pressable>
              {open === i && (
                <Animated.View entering={FadeIn}>
                  <AppText color={colors.neutral90} style={{ paddingLeft: 30 }}>
                    {f.a}
                  </AppText>
                </Animated.View>
              )}
            </View>
          ))}
        </View>
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Liên hệ hỗ trợ</AppText>
          {contacts.map((c) => (
            <Pressable key={c.label} style={styles.row} onPress={c.onPress}>
              <View style={styles.icon}>
                <RIcon name={c.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="medium">{c.label}</AppText>
                <AppText size={12} color={colors.neutral70}>
                  {c.sub}
                </AppText>
              </View>
              <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, padding: 12, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
});
