import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerMe, useUpdateCustomer } from '@/api/hooks';
import { genderFromApi, genderToApi } from '@/api/mappers';
import { img } from '@/assets';
import { ChoiceChips, FormField, Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { ResultDialog } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Button, Photo, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { safeBack } from '@/utils/navigation';
import { EMAIL } from '@/utils/validation';

const GENDERS = ['Nam', 'Nữ', 'Khác'] as const;
type Gender = (typeof GENDERS)[number];
type Form = { name: string; email: string; gender: Gender | null };

/**
 * Thông tin cá nhân — GET /customers/me, lưu bằng PUT /customers/me { name, email, gender }.
 * SĐT là tên đăng nhập nên chỉ đổi ở "Tài khoản & Mật khẩu".
 */
export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { profile, isLoggedIn } = useApp();
  const me = useCustomerMe();
  const update = useUpdateCustomer();

  // Giá trị từ server + phần người dùng đã sửa (draft) — không cần đồng bộ bằng effect.
  const initial = useMemo<Form | null>(
    () =>
      me.data
        ? {
            name: me.data.name ?? '',
            email: me.data.email ?? '',
            gender: genderFromApi(me.data.gender) ?? null,
          }
        : null,
    [me.data],
  );
  const [draft, setDraft] = useState<Partial<Form>>({});
  const form: Form | null = initial ? { ...initial, ...draft } : null;
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (patch: Partial<Form>) => setDraft((d) => ({ ...d, ...patch }));

  const errors = form
    ? {
        name: form.name.trim().length < 2 ? 'Vui lòng nhập họ tên' : '',
        email: form.email.trim() && !EMAIL.test(form.email.trim()) ? 'Email không hợp lệ' : '',
      }
    : { name: '', email: '' };
  const dirty = !!form && JSON.stringify(form) !== JSON.stringify(initial);

  const save = () => {
    setSubmitted(true);
    if (!form || Object.values(errors).some(Boolean)) return;
    // Chỉ gửi trường đã thay đổi.
    const body: {
      name?: string;
      email?: string;
      gender?: 'male' | 'female' | 'other';
    } = {};
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

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Thông tin cá nhân" />

      {!isLoggedIn ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <StateView
            type="empty"
            title="Bạn chưa đăng nhập"
            message="Đăng nhập để xem và chỉnh sửa thông tin cá nhân"
            actionLabel="Đăng nhập"
            onAction={() =>
              router.replace({
                pathname: '/login',
                params: { redirect: '/profile-edit' },
              })
            }
          />
        </View>
      ) : me.isLoading ? (
        <View style={styles.body}>
          <Skeleton
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              alignSelf: 'center',
            }}
          />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 48 }} />
          ))}
        </View>
      ) : me.isError || !form ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <StateView
            type="offline"
            title="Không tải được thông tin"
            message={me.error?.message ?? 'Vui lòng thử lại'}
            actionLabel="Thử lại"
            onAction={() => me.refetch()}
          />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Photo source={profile.avatar ?? img.avatar} radius={44} style={styles.avatar} />
              <AppText size={12} color={colors.neutral70}>
                Đổi ảnh đại diện tại trang Tài khoản
              </AppText>
            </View>
            <FormField label="Họ và tên" required value={form.name} onChangeText={(t) => set({ name: t })} error={submitted ? errors.name : ''} />
            <Pressable onPress={() => router.push('/account-security')}>
              <View style={{ pointerEvents: 'none' }}>
                <FormField
                  label="Số điện thoại"
                  value={me.data?.phone ?? profile.phone}
                  editable={false}
                  right={<AppText color={colors.primary}>Thay đổi</AppText>}
                />
              </View>
            </Pressable>
            <FormField
              label="Email"
              placeholder="example@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(t) => set({ email: t })}
              error={submitted ? errors.email : ''}
            />
            <View style={{ gap: 8 }}>
              <AppText variant="bodyMedium">Giới tính</AppText>
              <ChoiceChips options={GENDERS} value={form.gender} onChange={(g) => set({ gender: g })} />
            </View>

            {update.error && (
              <View style={styles.serverError}>
                <RIcon name="errorWarningFill" size={18} color={colors.error} />
                <AppText color={colors.error} style={{ flex: 1 }}>
                  {update.error.message}
                </AppText>
              </View>
            )}

            <Pressable style={styles.link} onPress={() => router.push('/account-security')}>
              <RIcon name="lockPasswordLine" size={20} color={colors.primary} />
              <AppText weight="medium" style={{ flex: 1 }}>
                Tài khoản & Mật khẩu
              </AppText>
              <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {isLoggedIn && (
        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button title={update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'} disabled={!dirty || update.isPending} onPress={save} />
        </View>
      )}
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
  screen: { flex: 1, backgroundColor: colors.white },
  body: { padding: 12, gap: 16, paddingBottom: 24 },
  avatar: {
    width: 88,
    height: 88,
    borderWidth: 3,
    borderColor: colors.primarySurface,
  },
  serverError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.errorSurface,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
  },
  bottom: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral30,
  },
});
