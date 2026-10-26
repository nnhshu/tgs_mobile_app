import { router, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerMe, useUpdateCustomer } from '@/api/hooks';
import { genderFromApi, genderToApi } from '@/api/mappers';
import { icons } from '@/assets';
import { FormField, Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet, ConfirmDialog, ResultDialog } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Button, Icon, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';
import { EMAIL, formatPhoneIntl } from '@/utils/validation';

const GENDERS = ['Nam', 'Nữ', 'Khác'] as const;
type Gender = (typeof GENDERS)[number];
type Form = { name: string; email: string; gender: Gender | null };

/**
 * Chỉnh sửa thông tin (Figma 7120:15153) — GET /customers/me, lưu bằng PUT /customers/me { name, email, gender }.
 * Rời màn khi còn thay đổi chưa lưu → hỏi "Bạn có chắc chắn muốn thoát không?" (Figma 7120:15375).
 * SĐT là tên đăng nhập nên chỉ đổi ở "Tài khoản & Mật khẩu".
 */
export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile, isLoggedIn } = useApp();
  const me = useCustomerMe();
  const update = useUpdateCustomer();

  // Giá trị từ server + phần người dùng đã sửa (draft) — không cần đồng bộ bằng effect.
  const initial = useMemo<Form | null>(
    () => (me.data ? { name: me.data.name ?? '', email: me.data.email ?? '', gender: genderFromApi(me.data.gender) ?? null } : null),
    [me.data],
  );
  const [draft, setDraft] = useState<Partial<Form>>({});
  const form: Form | null = initial ? { ...initial, ...draft } : null;
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genderSheet, setGenderSheet] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<(() => void) | null>(null);

  const set = (patch: Partial<Form>) => setDraft((d) => ({ ...d, ...patch }));

  const errors = form
    ? {
        name: form.name.trim().length < 2 ? 'Vui lòng nhập họ tên' : '',
        email: form.email.trim() && !EMAIL.test(form.email.trim()) ? 'Email không hợp lệ' : '',
      }
    : { name: '', email: '' };
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(initial);

  // Chặn rời màn (nút back, vuốt, back Android) khi còn thay đổi chưa lưu.
  useEffect(() => {
    if (!dirty || saved) return;
    return navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      setConfirmLeave(() => () => navigation.dispatch(e.data.action));
    });
  }, [navigation, dirty, saved]);

  const save = () => {
    setSubmitted(true);
    if (!form || Object.values(errors).some(Boolean)) return;
    // Chỉ gửi trường đã thay đổi.
    const body: { name?: string; email?: string; gender?: 'male' | 'female' | 'other' } = {};
    if (form.name.trim() !== initial?.name) body.name = form.name.trim();
    if (form.email.trim() !== initial?.email) body.email = form.email.trim();
    if (form.gender && form.gender !== initial?.gender) body.gender = genderToApi(form.gender);
    update.mutate(body, {
      // Server được tải lại (invalidate) → initial mới; xoá draft.
      onSuccess: () => {
        setDraft({});
        setSaved(true);
      },
    });
  };

  let body;
  if (!isLoggedIn) {
    body = (
      <View style={styles.center}>
        <StateView
          type="empty"
          title="Bạn chưa đăng nhập"
          message="Đăng nhập để xem và chỉnh sửa thông tin cá nhân"
          actionLabel="Đăng nhập"
          onAction={() => router.replace({ pathname: '/login', params: { redirect: '/profile-edit' } })}
        />
      </View>
    );
  } else if (me.isLoading) {
    body = (
      <View style={styles.content}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={{ gap: 8 }}>
            <Skeleton style={{ width: 100, height: 18 }} />
            <Skeleton style={{ height: 48, borderRadius: 6 }} />
          </View>
        ))}
      </View>
    );
  } else if (me.isError || !form) {
    body = (
      <View style={styles.center}>
        <StateView type="offline" title="Không tải được thông tin" message={me.error?.message ?? 'Vui lòng thử lại'} actionLabel="Thử lại" onAction={() => me.refetch()} />
      </View>
    );
  } else {
    body = (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FormField
            label="Tên của bạn"
            leading={<Icon source={icons.inputUser} size={20} />}
            value={form.name}
            onChangeText={(t) => set({ name: t })}
            error={submitted ? errors.name : ''}
          />
          <FormField
            label="Email"
            leading={<Icon source={icons.inputMail} size={20} />}
            placeholder="example@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(t) => set({ email: t })}
            error={submitted ? errors.email : ''}
          />
          {/* Giới tính: ô chọn có mũi tên, bấm mở sheet Nam / Nữ / Khác */}
          <Pressable onPress={() => setGenderSheet(true)}>
            <View style={{ pointerEvents: 'none' }}>
              <FormField
                label="Giới tính"
                leading={<Icon source={icons.inputGender} size={20} />}
                right={<Icon source={icons.inputChevronDown} size={20} />}
                placeholder="Chọn giới tính"
                value={form.gender ?? ''}
                editable={false}
              />
            </View>
          </Pressable>
          {/* SĐT là tên đăng nhập → đổi ở Tài khoản & Mật khẩu (cần OTP) */}
          <Pressable onPress={() => router.push('/account-security')}>
            <View style={{ pointerEvents: 'none' }}>
              <FormField
                label="Số điện thoại"
                leading={<Icon source={icons.inputPhone} size={20} />}
                value={formatPhoneIntl(me.data?.phone ?? profile.phone)}
                editable={false}
              />
            </View>
          </Pressable>

          {update.error && (
            <View style={styles.serverError}>
              <RIcon name="errorWarningFill" size={18} color={colors.error} />
              <AppText color={colors.error} style={{ flex: 1 }}>
                {update.error.message}
              </AppText>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Chỉnh sửa thông tin" shadow />
      <View style={styles.body}>{body}</View>

      {isLoggedIn && (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title={update.isPending ? 'Đang lưu...' : 'Lưu lại'} disabled={!dirty || update.isPending} onPress={save} style={{ height: 52 }} />
        </View>
      )}

      <BottomSheet visible={genderSheet} onClose={() => setGenderSheet(false)} title="Giới tính">
        {GENDERS.map((g) => (
          <Pressable
            key={g}
            style={styles.option}
            onPress={() => {
              set({ gender: g });
              setGenderSheet(false);
            }}>
            <AppText variant="bodyMediumRegular" color={g === form?.gender ? colors.primary : colors.text} style={{ flex: 1 }}>
              {g}
            </AppText>
            {g === form?.gender && <RIcon name="checkLine" size={20} color={colors.primary} />}
          </Pressable>
        ))}
      </BottomSheet>

      <ConfirmDialog
        visible={!!confirmLeave}
        title={'Bạn có chắc chắn muốn\nthoát không?'}
        cancelLabel="Huỷ bỏ"
        confirmLabel="Thoát"
        destructive
        onCancel={() => setConfirmLeave(null)}
        onConfirm={() => {
          const leave = confirmLeave;
          setConfirmLeave(null);
          leave?.();
        }}
      />
      <ResultDialog
        visible={saved}
        title="Cập nhật thành công"
        message="Thông tin cá nhân của bạn đã được lưu."
        onClose={() => {
          setSaved(false);
          safeBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, backgroundColor: colors.white, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 12, paddingVertical: 16, gap: 12 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.errorSurface },
  bottom: { backgroundColor: colors.white, paddingTop: 12, paddingHorizontal: 16, boxShadow: '-8px 4px 9px rgba(0,0,0,0.08)' },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
});
