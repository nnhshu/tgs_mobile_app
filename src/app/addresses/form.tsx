import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddressBook, useDeleteAddress, useSaveAddress } from '@/api/hooks';
import { Address, ADDRESS_TYPES, AddressType } from '@/api/mappers';
import { ChoiceChips, FormField } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { ConfirmDialog, useToast } from '@/components/overlays';
import { AppText, Button, RIcon, Toggle } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';
import { VN_PHONE } from '@/utils/validation';

type Form = Omit<Address, 'id' | 'typeLabel'>;

const TYPE_LABELS = ADDRESS_TYPES.map((t) => t.label);
const typeFromLabel = (label: string): AddressType => ADDRESS_TYPES.find((t) => t.label === label)?.value ?? 'other';
const labelOf = (type: AddressType) => ADDRESS_TYPES.find((t) => t.value === type)?.label ?? 'Khác';

/**
 * Thêm địa chỉ mới (POST) / Sửa địa chỉ (PUT) / Xoá địa chỉ (DELETE) — /customers/me/address-book.
 * API lưu địa chỉ dạng một chuỗi đầy đủ, kèm toà nhà/tầng và ghi chú cho shipper.
 */
export default function AddressFormScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { setAddressId, profile } = useApp();
  const { addresses } = useAddressBook();
  const save = useSaveAddress();
  const remove = useDeleteAddress();
  const editing = id ? addresses.find((a) => a.id === id) : undefined;

  // Giá trị ban đầu (từ server khi sửa) + phần người dùng đã nhập.
  const initial: Form = editing ?? {
    receiver: profile.name && profile.name !== profile.phone ? profile.name : '',
    phone: profile.phone ?? '',
    address: '',
    building: '',
    note: '',
    type: 'home',
    isDefault: addresses.length === 0,
  };
  const [draft, setDraft] = useState<Partial<Form>>({});
  const form: Form = { ...initial, ...draft };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const set = (patch: Partial<Form>) => setDraft((d) => ({ ...d, ...patch }));

  const errors = {
    receiver: form.receiver.trim().length < 2 ? 'Vui lòng nhập họ tên người nhận' : '',
    phone: !VN_PHONE.test(form.phone.replace(/\s/g, '')) ? 'Số điện thoại không hợp lệ' : '',
    address: form.address.trim().length < 10 ? 'Nhập đủ số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành' : '',
  };
  const valid = Object.values(errors).every((e) => !e);
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : '');
  const busy = save.isPending || remove.isPending;

  const submit = () => {
    setSubmitted(true);
    if (!valid || busy) return;
    save.mutate(
      { ...form, id: editing?.id },
      {
        onSuccess: (book) => {
          // Địa chỉ vừa thêm được chọn cho đơn hàng hiện tại.
          const created = book.address?.id ?? (!editing ? book.items?.[book.items.length - 1]?.id : undefined);
          if (!editing && created) setAddressId(String(created));
          toast(editing ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
          safeBack();
        },
      },
    );
  };

  const confirmRemove = () => {
    if (!editing) return;
    remove.mutate(editing.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        toast('Đã xoá địa chỉ');
        safeBack();
      },
      onError: (e) => {
        setConfirmDelete(false);
        toast(e.message, 'errorWarningLine');
      },
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title={editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}
        right={
          editing ? (
            <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8} disabled={busy}>
              <RIcon name="deleteBinLine" size={22} color={colors.error} />
            </Pressable>
          ) : null
        }
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <AppText variant="bodyMediumSemibold">Thông tin liên hệ</AppText>
          <FormField label="Họ và tên" required placeholder="Nhập họ tên người nhận" value={form.receiver} onChangeText={(t) => set({ receiver: t })} error={err('receiver')} />
          <FormField
            label="Số điện thoại"
            required
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            maxLength={12}
            value={form.phone}
            onChangeText={(t) => set({ phone: t })}
            error={err('phone')}
          />

          <AppText variant="bodyMediumSemibold" style={{ marginTop: 8 }}>
            Địa chỉ
          </AppText>
          <FormField
            label="Địa chỉ nhận hàng"
            required
            multiline
            placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
            value={form.address}
            onChangeText={(t) => set({ address: t })}
            error={err('address')}
          />
          <FormField label="Toà nhà, tầng, số phòng" placeholder="VD: Tầng 5, Block A" value={form.building ?? ''} onChangeText={(t) => set({ building: t })} />
          <FormField label="Ghi chú cho shipper" placeholder="VD: Gọi trước khi giao" value={form.note ?? ''} onChangeText={(t) => set({ note: t })} />

          <View style={{ gap: 8 }}>
            <AppText variant="bodyMedium">Loại địa chỉ</AppText>
            <ChoiceChips options={TYPE_LABELS} value={labelOf(form.type)} onChange={(v) => set({ type: typeFromLabel(v) })} />
          </View>

          <View style={styles.defaultRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyMedium">Đặt làm địa chỉ mặc định</AppText>
              {editing?.isDefault && (
                <AppText size={12} color={colors.neutral70}>
                  Đây đang là địa chỉ mặc định. Chọn địa chỉ khác làm mặc định để thay đổi.
                </AppText>
              )}
            </View>
            <Toggle value={form.isDefault} onChange={(v) => !editing?.isDefault && set({ isDefault: v })} />
          </View>

          {save.error && (
            <View style={styles.serverError}>
              <RIcon name="errorWarningFill" size={18} color={colors.error} />
              <AppText color={colors.error} style={{ flex: 1 }}>
                {save.error.message}
              </AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={save.isPending ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Hoàn thành'} disabled={busy} onPress={submit} />
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Xoá địa chỉ này?"
        message="Địa chỉ sẽ bị xoá khỏi sổ địa chỉ của bạn và không thể khôi phục."
        confirmLabel={remove.isPending ? 'Đang xoá...' : 'Xoá'}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  body: { padding: 12, gap: 16, paddingBottom: 24 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.errorSurface },
  bottom: { paddingTop: 12, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.neutral30 },
});
