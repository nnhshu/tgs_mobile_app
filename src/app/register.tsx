import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLogin, useRegister } from '@/api/hooks';
import { profileFromCustomer } from '@/api/mappers';
import { AuthResponse } from '@/api/types';
import { icons, img } from '@/assets';
import { FormField } from '@/components/form';
import { ResultDialog } from '@/components/overlays';
import { AppText, Button, Checkbox, Icon, RIcon } from '@/components/ui';
import { useLeaveAuth } from '@/hooks/use-leave-auth';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { cleanPhone as clean, EMAIL, VN_PHONE } from '@/utils/validation';


/** Đăng ký tài khoản — POST /auth/register { phone, password, name, email? }. */
export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { redirect, phone: phoneParam } = useLocalSearchParams<{ redirect?: string; phone?: string }>();
  const { setSession } = useApp();
  const register = useRegister();
  const login = useLogin();
  const { leave, close } = useLeaveAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState(phoneParam ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<{ loggedIn: boolean } | null>(null);

  const cleanPhone = clean(phone);
  const errors = {
    name: name.trim().length < 2 ? 'Vui lòng nhập họ tên.' : '',
    phone: !VN_PHONE.test(cleanPhone) ? 'Số điện thoại Việt Nam không hợp lệ.' : '',
    email: email.trim() && !EMAIL.test(email.trim()) ? 'Email không hợp lệ.' : '',
    password: password.length < 8 ? 'Mật khẩu tối thiểu 8 ký tự.' : '',
    confirm: confirm !== password ? 'Mật khẩu nhập lại không khớp.' : '',
  };
  const err = (k: keyof typeof errors) => (submitted ? errors[k] : '');
  const serverError = register.error?.message;
  const busy = register.isPending || login.isPending;

  const startSession = (res: AuthResponse) => {
    if (!res.token) return false;
    setSession(res.token, { name: name.trim(), phone: cleanPhone, ...profileFromCustomer(res.customer, res.email) }, res.expires_at);
    return true;
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !agree || busy) return;
    register.mutate(
      { phone: cleanPhone, password, name: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) },
      {
        onSuccess: (res) => {
          if (startSession(res)) {
            setDone({ loggedIn: true });
            return;
          }
          // Đăng ký không trả token → đăng nhập luôn bằng SĐT + mật khẩu vừa tạo.
          login.mutate(
            { method: 'password', login: cleanPhone, password },
            {
              onSuccess: (r) => setDone({ loggedIn: startSession(r) }),
              onError: () => setDone({ loggedIn: false }),
            },
          );
        },
      },
    );
  };

  const finish = () => {
    const loggedIn = done?.loggedIn;
    setDone(null);
    if (loggedIn) {
      leave(redirect);
    } else {
      router.replace({ pathname: '/login', params: redirect ? { redirect } : {} });
    }
  };

  const eye = (
    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
      <RIcon name={showPassword ? 'eyeOffLine' : 'eyeLine'} size={20} color={colors.neutral60} />
    </Pressable>
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Image source={img.bgRadialHeader} style={StyleSheet.absoluteFill} contentFit="fill" />
        <Image source={img.logo} style={styles.logo} contentFit="contain" />
      </View>
      <Pressable onPress={close} hitSlop={10} style={[styles.close, { top: insets.top + 9 }]}>
        <Icon source={icons.close} size={24} />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetWrap}>
        <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]} keyboardShouldPersistTaps="handled">
          <AppText variant="h3" align="center" color="#181D25">
            Đăng ký tài khoản
          </AppText>

          <FormField
            label="Họ và tên"
            required
            icon="user3Line"
            placeholder="Nguyễn Văn A"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            value={name}
            onChangeText={setName}
            error={err('name')}
          />
          <FormField
            label="Số điện thoại"
            required
            icon="smartphoneLine"
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={13}
            value={phone}
            onChangeText={setPhone}
            error={err('phone')}
          />
          <FormField
            label="Email"
            icon="mailLine"
            placeholder="email@example.com (không bắt buộc)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            error={err('email')}
          />
          <FormField
            label="Mật khẩu"
            required
            icon="lockPasswordLine"
            placeholder="Tối thiểu 8 ký tự"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
            error={err('password')}
            right={eye}
          />
          <FormField
            label="Nhập lại mật khẩu"
            required
            icon="lockPasswordLine"
            placeholder="Nhập lại mật khẩu"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            textContentType="newPassword"
            value={confirm}
            onChangeText={setConfirm}
            onSubmitEditing={submit}
            error={err('confirm')}
            right={eye}
          />

          <Pressable style={styles.agree} onPress={() => setAgree((v) => !v)}>
            <Checkbox checked={agree} onPress={() => setAgree((v) => !v)} />
            <AppText size={13} style={{ flex: 1 }}>
              Tôi đồng ý với{' '}
              <AppText size={13} weight="semibold" color={colors.primary} onPress={() => router.push('/terms')}>
                Điều khoản sử dụng
              </AppText>{' '}
              và Chính sách bảo mật của Thế Giới Sữa
            </AppText>
          </Pressable>
          {submitted && !agree && (
            <AppText size={12} color={colors.error}>
              Vui lòng đồng ý với điều khoản để tiếp tục.
            </AppText>
          )}

          {serverError && (
            <View style={styles.serverError}>
              <RIcon name="errorWarningFill" size={18} color={colors.error} />
              <AppText color={colors.error} style={{ flex: 1 }}>
                {serverError}
              </AppText>
            </View>
          )}

          <Button title={busy ? 'Đang đăng ký...' : 'Đăng ký'} disabled={busy} onPress={submit} />

          <AppText align="center">
            Đã có tài khoản?{' '}
            <AppText weight="semibold" color={colors.primary} onPress={() => router.replace({ pathname: '/login', params: redirect ? { redirect } : {} })}>
              Đăng nhập
            </AppText>
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      <ResultDialog
        visible={!!done}
        title="Đăng ký thành công!"
        message={done?.loggedIn ? 'Chào mừng bạn đến với Thế Giới Sữa.' : 'Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.'}
        actionLabel={done?.loggedIn ? 'Bắt đầu mua sắm' : 'Đăng nhập'}
        onClose={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { height: 240, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  logo: { width: 233, height: 48 },
  close: { position: 'absolute', left: 12, backgroundColor: colors.background, borderRadius: 100, padding: 4 },
  sheetWrap: { flex: 1, marginTop: -40 },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetContent: { paddingTop: 24, paddingHorizontal: 12, gap: 16 },
  agree: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  serverError: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.errorSurface },
});
