import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { AppText, Button, RIcon, Toggle } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';

const groupCard = (n: string) => n.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/** Thêm thẻ / Sửa thông tin thẻ / Thông tin thanh toán. */
export default function CardFormScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cards, saveCard, deleteCard, setPayment } = useApp();
  const editing = cards.find((c) => c.id === id);

  const [number, setNumber] = useState(editing ? groupCard(editing.number) : '');
  const [holder, setHolder] = useState(editing?.holder ?? '');
  const [expiry, setExpiry] = useState(editing?.expiry ?? '');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? cards.length === 0);
  const [showCvv, setShowCvv] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const digits = number.replace(/\D/g, '');
  const brand = digits.startsWith('5') ? 'mastercard' : 'visa';
  const [mm, yy] = expiry.split('/').map(Number);
  const errors = {
    number: digits.length !== 16 ? 'Số thẻ gồm 16 chữ số' : '',
    holder: !holder.trim() ? 'Nhập tên in trên thẻ' : '',
    expiry: !(mm >= 1 && mm <= 12 && yy >= 25) ? 'Ngày hết hạn không hợp lệ (MM/YY)' : '',
    cvv: !editing && !/^\d{3}$/.test(cvv) ? 'CVV gồm 3 chữ số' : '',
  };
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : '');

  const save = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const newId = saveCard({ id: editing?.id, brand, holder: holder.toUpperCase(), number: digits, expiry, isDefault });
    setPayment(`card:${newId}`);
    toast(editing ? 'Đã cập nhật thẻ' : 'Đã thêm thẻ thành công');
    safeBack();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={editing ? 'Thông tin thẻ' : 'Thêm thẻ'}
        right={
          editing ? (
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8}>
              <RIcon name="deleteBinLine" size={22} color={colors.error} />
            </Pressable>
          ) : null
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <LinearGradient colors={['#0042BC', '#4083FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preview}>
            <View style={styles.previewTop}>
              <RIcon name="bankCardFill" size={28} color={colors.white} />
              <RIcon name={brand === 'visa' ? 'visaLine' : 'mastercardLine'} size={36} color={colors.white} />
            </View>
            <AppText variant="h4" color={colors.white} style={{ letterSpacing: 2 }}>
              {number || '•••• •••• •••• ••••'}
            </AppText>
            <View style={styles.previewTop}>
              <AppText weight="medium" color={colors.white} numberOfLines={1} style={{ flex: 1 }}>
                {holder.toUpperCase() || 'TÊN CHỦ THẺ'}
              </AppText>
              <AppText weight="medium" color={colors.white}>
                {expiry || 'MM/YY'}
              </AppText>
            </View>
          </LinearGradient>

          <FormField label="Số thẻ" required placeholder="1234 5678 9012 3456" keyboardType="number-pad" value={number} onChangeText={(t) => setNumber(groupCard(t))} error={err('number')} icon="bankCardLine" />
          <FormField label="Tên chủ thẻ" required placeholder="NGUYEN VAN A" autoCapitalize="characters" value={holder} onChangeText={setHolder} error={err('holder')} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <FormField label="Ngày hết hạn" required placeholder="MM/YY" keyboardType="number-pad" value={expiry} onChangeText={(t) => setExpiry(formatExpiry(t))} error={err('expiry')} style={{ flex: 1 }} />
            <FormField
              label="CVV"
              required={!editing}
              placeholder={editing ? '•••' : '123'}
              keyboardType="number-pad"
              maxLength={3}
              secureTextEntry={!showCvv}
              value={cvv}
              onChangeText={setCvv}
              error={err('cvv')}
              style={{ flex: 1 }}
              right={
                <Pressable onPress={() => setShowCvv((v) => !v)} hitSlop={8}>
                  <RIcon name={showCvv ? 'eyeOffLine' : 'eyeLine'} size={20} color={colors.neutral60} />
                </Pressable>
              }
            />
          </View>
          <View style={styles.defaultRow}>
            <AppText variant="bodyMedium" style={{ flex: 1 }}>
              Đặt làm thẻ mặc định
            </AppText>
            <Toggle value={isDefault} onChange={setIsDefault} />
          </View>
          <View style={styles.secure}>
            <RIcon name="lockLine" size={16} color={colors.neutral70} />
            <AppText size={12} color={colors.neutral70} style={{ flex: 1 }}>
              Thế Giới Sữa không lưu mã CVV. Thông tin thẻ được mã hoá an toàn.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={editing ? 'Lưu thay đổi' : 'Thêm thẻ'} onPress={save} />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Xoá thẻ này?"
        message="Bạn sẽ cần nhập lại thông tin thẻ nếu muốn thanh toán bằng thẻ này."
        confirmLabel="Xoá thẻ"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (editing) deleteCard(editing.id);
          setConfirmDelete(false);
          toast('Đã xoá thẻ');
          safeBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { padding: 12, gap: 16, paddingBottom: 24 },
  preview: { height: 190, borderRadius: 16, padding: 20, justifyContent: 'space-between' },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  defaultRow: { flexDirection: 'row', alignItems: 'center' },
  secure: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottom: { paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.neutral30 },
});
