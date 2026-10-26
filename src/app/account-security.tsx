import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { icons } from '@/assets';
import { FormField } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, useToast } from '@/components/overlays';
import { AppText, Button, Divider, Icon, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

/** Account & Password — số điện thoại, đổi mật khẩu, liên kết Zalo/Google. */
export default function AccountSecurityScreen() {
  const toast = useToast();
  const { profile, updateProfile } = useApp();
  const [sheet, setSheet] = useState<'phone' | 'password' | null>(null);
  const [phone, setPhone] = useState(profile.phone);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [linked, setLinked] = useState({ Zalo: true, Google: false });

  const pwError = pw.next && pw.next.length < 8 ? 'Mật khẩu tối thiểu 8 ký tự' : pw.confirm && pw.confirm !== pw.next ? 'Mật khẩu xác nhận không khớp' : '';
  const eye = (
    <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
      <RIcon name={show ? 'eyeOffLine' : 'eyeLine'} size={20} color={colors.neutral60} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Tài khoản & Mật khẩu" />
      <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 8 }}>
        <View style={styles.card}>
          <Row icon="smartphoneLine" label="Số điện thoại" value={profile.phone} onPress={() => setSheet('phone')} />
          <Divider color={colors.neutral30} />
          <Row icon="lockPasswordLine" label="Mật khẩu" value="••••••••" onPress={() => setSheet('password')} />
        </View>
        <View style={styles.card}>
          <AppText variant="bodyMediumSemibold">Liên kết tài khoản</AppText>
          {(['Zalo', 'Google'] as const).map((k) => (
            <View key={k} style={styles.row}>
              <Icon source={k === 'Zalo' ? icons.zalo : icons.google} size={24} />
              <AppText weight="medium" style={{ flex: 1 }}>
                {k}
              </AppText>
              <Pressable
                onPress={() => {
                  setLinked((l) => ({ ...l, [k]: !l[k] }));
                  toast(linked[k] ? `Đã huỷ liên kết ${k}` : `Đã liên kết ${k}`);
                }}
                style={[styles.linkBtn, linked[k] && { borderColor: colors.neutral40 }]}>
                <AppText weight="medium" color={linked[k] ? colors.neutral70 : colors.primary}>
                  {linked[k] ? 'Huỷ liên kết' : 'Liên kết'}
                </AppText>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet
        visible={sheet === 'phone'}
        onClose={() => setSheet(null)}
        title="Đổi số điện thoại"
        footer={
          <Button
            title="Cập nhật"
            disabled={!/^0\d{9}$/.test(phone) || phone === profile.phone}
            onPress={() => {
              updateProfile({ phone });
              setSheet(null);
              toast('Đã cập nhật số điện thoại');
            }}
          />
        }>
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <FormField label="Số điện thoại mới" keyboardType="phone-pad" maxLength={10} value={phone} onChangeText={setPhone} icon="smartphoneLine" />
          <AppText size={12} color={colors.neutral70}>
            Mã xác thực sẽ được gửi đến số điện thoại mới để xác nhận.
          </AppText>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'password'}
        onClose={() => setSheet(null)}
        title="Đổi mật khẩu"
        footer={
          <Button
            title="Đổi mật khẩu"
            disabled={!pw.current || !pw.next || !!pwError || pw.next !== pw.confirm}
            onPress={() => {
              setSheet(null);
              setPw({ current: '', next: '', confirm: '' });
              toast('Đổi mật khẩu thành công');
            }}
          />
        }>
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <FormField label="Mật khẩu hiện tại" secureTextEntry={!show} value={pw.current} onChangeText={(t) => setPw((p) => ({ ...p, current: t }))} right={eye} />
          <FormField label="Mật khẩu mới" secureTextEntry={!show} value={pw.next} onChangeText={(t) => setPw((p) => ({ ...p, next: t }))} right={eye} />
          <FormField label="Nhập lại mật khẩu mới" secureTextEntry={!show} value={pw.confirm} onChangeText={(t) => setPw((p) => ({ ...p, confirm: t }))} error={pwError} right={eye} />
        </View>
      </BottomSheet>
    </View>
  );
}

function Row({ icon, label, value, onPress }: { icon: Parameters<typeof RIcon>[0]['name']; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <RIcon name={icon} size={20} color={colors.primary} />
      <AppText weight="medium" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText color={colors.neutral70}>{value}</AppText>
      <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: { backgroundColor: colors.white, padding: 12, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
});
