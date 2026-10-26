import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuthCheck, useLogin, useOtpRequest } from '@/api/hooks';
import { profileFromCustomer } from '@/api/mappers';
import { AuthCheckResponse } from '@/api/types';
import { icons, img } from '@/assets';
import { useToast } from '@/components/overlays';
import { AppText, Button, Icon, RIcon } from '@/components/ui';
import { useLeaveAuth } from '@/hooks/use-leave-auth';
import { useApp } from '@/store/app-store';
import { colors, fonts } from '@/theme';
import { cleanPhone, VN_PHONE } from '@/utils/validation';

/**
 * Đăng ký/Đăng nhập theo từng bước:
 * 1. Nhập SĐT → POST /auth/check
 * 2a. Chưa có tài khoản → màn Đăng ký (điền sẵn SĐT)
 * 2b. Có mật khẩu → nhập mật khẩu → POST /auth/login { method: "password" }
 * 2c. Chỉ OTP (hoặc người dùng chọn OTP) → POST /auth/otp/request → màn OTP
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  const { setSession } = useApp();
  const toast = useToast();
  const check = useAuthCheck();
  const otpRequest = useOtpRequest();
  const login = useLogin();
  const { leave, close } = useLeaveAuth();

  const [phone, setPhone] = useState('');
  const [account, setAccount] = useState<AuthCheckResponse | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const p = cleanPhone(phone);
  const busy = check.isPending || otpRequest.isPending || login.isPending;
  const step: 'phone' | 'password' = account?.methods.password ? 'password' : 'phone';

  const goRegister = () => router.push({ pathname: '/register', params: { ...(redirect ? { redirect } : {}), phone: p } });

  const editPhone = (t: string) => {
    setPhone(t);
    setError('');
    // Đổi số → quay lại bước kiểm tra.
    if (account) {
      setAccount(null);
      setPassword('');
    }
  };

  const sendOtp = () => {
    setError('');
    otpRequest.mutate(p, {
      onSuccess: (res) =>
        router.push({
          pathname: '/otp',
          params: { phone: p, redirect, expiresIn: String(res.expires_in ?? 300), channel: res.channel ?? '', message: res.message ?? '' },
        }),
      // 404 chưa có tài khoản, 429 quá giới hạn, 502 Zalo từ chối gửi.
      onError: (e) => (e instanceof ApiError && e.status === 404 ? goRegister() : setError(e.message)),
    });
  };

  const checkPhone = () => {
    if (!VN_PHONE.test(p)) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam 10 số.');
      return;
    }
    setError('');
    check.mutate(p, {
      onSuccess: (res) => {
        if (res.status === 'not_registered') {
          if (res.can_register) {
            toast(res.message ?? 'Số điện thoại chưa có tài khoản', 'informationLine');
            goRegister();
          } else {
            setError(res.message ?? 'Số điện thoại này chưa thể đăng ký.');
          }
          return;
        }
        if (res.methods.password) {
          setAccount(res);
          return;
        }
        if (res.methods.otp) {
          setAccount(res);
          sendOtp();
          return;
        }
        setError(res.message ?? 'Tài khoản chưa có phương thức đăng nhập. Vui lòng liên hệ hỗ trợ.');
      },
      onError: (e) => setError(e.message),
    });
  };

  const loginWithPassword = () => {
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }
    setError('');
    login.mutate(
      { method: 'password', login: p, password },
      {
        onSuccess: (res) => {
          if (!res.token) {
            setError('Máy chủ không trả phiên đăng nhập, vui lòng thử lại.');
            return;
          }
          setSession(res.token, { phone: p, ...profileFromCustomer(res.customer, res.email) }, res.expires_at);
          toast('Đăng nhập thành công');
          leave(redirect);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  const submit = step === 'password' ? loginWithPassword : checkPhone;

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
          <View style={{ gap: 20 }}>
            <View style={{ gap: 6 }}>
              <AppText variant="h3" align="center" color="#181D25">
                {step === 'password' ? 'Nhập mật khẩu' : 'Đăng ký/Đăng nhập'}
              </AppText>
              {step === 'password' && (
                <AppText color={colors.neutral70} align="center">
                  Đăng nhập tài khoản {p}
                </AppText>
              )}
            </View>

            <View style={{ gap: 16 }}>
              <View style={{ gap: 8 }}>
                <AppText variant="bodyMedium">Số điện thoại</AppText>
                <View style={[styles.input, !!error && step === 'phone' && { borderColor: colors.error }]}>
                  <Icon source={icons.phone} size={20} />
                  <TextInput
                    value={phone}
                    onChangeText={editPhone}
                    placeholder="Nhập số điện thoại"
                    placeholderTextColor={colors.neutral60}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    maxLength={13}
                    returnKeyType="done"
                    onSubmitEditing={step === 'phone' ? checkPhone : undefined}
                    style={styles.inputText}
                  />
                  {phone.length > 0 && (
                    <Pressable onPress={() => editPhone('')} hitSlop={8}>
                      <Icon source={icons.clear} size={20} />
                    </Pressable>
                  )}
                </View>
              </View>

              {step === 'password' && (
                <View style={{ gap: 8 }}>
                  <AppText variant="bodyMedium">Mật khẩu</AppText>
                  <View style={[styles.input, !!error && { borderColor: colors.error }]}>
                    <RIcon name="lockPasswordLine" size={20} color={colors.neutral60} />
                    <TextInput
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        setError('');
                      }}
                      placeholder="Nhập mật khẩu"
                      placeholderTextColor={colors.neutral60}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      textContentType="password"
                      autoComplete="password"
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={loginWithPassword}
                      style={styles.inputText}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <RIcon name={showPassword ? 'eyeOffLine' : 'eyeLine'} size={20} color={colors.neutral60} />
                    </Pressable>
                  </View>
                </View>
              )}

              {account?.multiple_accounts && (
                <View style={styles.notice}>
                  <RIcon name="informationLine" size={16} color={colors.warning} />
                  <AppText size={13} color={colors.warning} style={{ flex: 1 }}>
                    Số điện thoại này gắn với nhiều tài khoản. Nếu không đăng nhập được, vui lòng liên hệ hỗ trợ.
                  </AppText>
                </View>
              )}

              {!!error && (
                <View style={styles.errorBox}>
                  <RIcon name="errorWarningFill" size={16} color={colors.error} />
                  <AppText size={13} color={colors.error} style={{ flex: 1 }}>
                    {error}
                  </AppText>
                </View>
              )}

              <Button
                title={busy ? 'Đang xử lý...' : step === 'password' ? 'Đăng nhập' : 'Tiếp tục'}
                disabled={busy || p.length < 9}
                onPress={submit}
              />

              {step === 'password' && account?.methods.otp && (
                <Pressable onPress={sendOtp} disabled={busy} style={styles.altLink}>
                  <RIcon name="smartphoneLine" size={18} color={colors.primary} />
                  <AppText weight="semibold" color={colors.primary}>
                    Đăng nhập bằng mã OTP
                  </AppText>
                </Pressable>
              )}

              {step === 'phone' && (
                <View style={{ gap: 16, marginTop: 20 }}>
                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <AppText size={11} color="#929FB1">
                      Hoặc đăng nhập nhanh với
                    </AppText>
                    <View style={styles.dividerLine} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <SocialButton icon={icons.zalo} label="Zalo" onPress={() => toast('Đăng nhập bằng Zalo sẽ sớm ra mắt', 'informationLine')} />
                    <SocialButton icon={icons.google} label="Google" onPress={() => toast('Đăng nhập bằng Google sẽ sớm ra mắt', 'informationLine')} />
                  </View>
                </View>
              )}
            </View>
          </View>
          <View style={{ gap: 16 }}>
            <AppText align="center">
              Chưa có tài khoản?{' '}
              <AppText weight="semibold" color={colors.primary} onPress={goRegister}>
                Đăng ký ngay
              </AppText>
            </AppText>
            <AppText size={12} align="center" style={{ lineHeight: 18 }}>
              Khi tiếp tục, bạn đồng ý với{' '}
              <AppText size={12} weight="bold" onPress={() => router.push('/terms')}>
                Điều khoản Chính sách bảo mật
              </AppText>
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SocialButton({ icon, label, onPress }: { icon: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.social, pressed && { opacity: 0.7 }]}>
      <Icon source={icon} size={22} />
      <AppText size={15} weight="semibold" color="#181D25" style={{ lineHeight: 23 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  hero: { height: 333, alignItems: 'center', justifyContent: 'center', paddingBottom: 47 },
  logo: { width: 233, height: 48 },
  close: { position: 'absolute', left: 12, backgroundColor: colors.background, borderRadius: 100, padding: 4 },
  sheetWrap: { flex: 1, marginTop: -47 },
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  sheetContent: { flexGrow: 1, justifyContent: 'space-between', paddingTop: 24, paddingHorizontal: 12, gap: 24 },
  input: { height: 48, borderWidth: 1, borderColor: colors.neutral40, borderRadius: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputText: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.text, padding: 0 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: '#FFF4EC' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.errorSurface },
  altLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EDF0F2', borderRadius: 80 },
  social: { flex: 1, height: 48, borderWidth: 1, borderColor: '#E1E5EA', borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
