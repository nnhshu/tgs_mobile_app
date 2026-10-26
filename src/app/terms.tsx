import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/headers';
import { AppText } from '@/components/ui';
import { termsSections } from '@/data/mock-extra';
import { colors } from '@/theme';

/** Điều khoản sử dụng. */
export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Điều khoản sử dụng" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <AppText size={12} color={colors.neutral70}>
          Cập nhật lần cuối: 25/08/2026
        </AppText>
        {termsSections.map((t) => (
          <View key={t.title} style={{ gap: 6 }}>
            <AppText variant="bodyMediumSemibold">{t.title}</AppText>
            <AppText color={colors.neutral90} style={{ lineHeight: 21 }}>
              {t.body}
            </AppText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.white } });
