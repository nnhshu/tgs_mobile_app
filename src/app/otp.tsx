import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useOtpRequest, useOtpVerify, useRegisterOtpRequest, useRegisterOtpVerify } from '@/api/hooks';
import { profileFromCustomer } from '@/api/mappers';
import { AuthResponse } from '@/api/types';
import { icons } from '@/assets';
import { SuccessToast } from '@/components/overlays';
import { AppText, Button, Icon } from '@/components/ui';
import { useLeaveAuth } from '@/hooks/use-leave-auth';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { formatPhoneDisplay } from '@/utils/validation';

/** API gửi OTP 6 số. */
const OTP_LENGTH = 6;
/** Chờ trước khi cho gửi lại mã (Figma hiển thị "Gửi lại (01:28)"). */
const RESEND_SECONDS = 90;
/** Thời gian hiện thông báo "Đã xác nhận mã OTP thành công!" trước khi vào app. */
const SUCCESS_MS = 1200;

const mmss = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

/**
 * Nhập mã xác thực / Điền số / Mã OTP sai / OTP success (Figma "Lần đầu đăng nhập").
 * mode=register (SĐT chưa có tài khoản): POST /auth/register/verify; mode=login: POST /auth/otp/verify.
 * Cả hai trả { token, expires_at, customer } → đăng nhập luôn.
 */
export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string; mode?: 'login' | 'register'; redirect?: string; expiresIn?: string; channel?: string }>();
  const phone = params.phone;
  const isRegister = params.mode === 'register';
  const insets = useSafeAreaInsets();
  const { setSession } = useApp();
  const loginVerify = useOtpVerify();
  const registerVerify = useRegisterOtpVerify();
  const loginResend = useOtpRequest();
  const registerResend = useRegisterOtpRequest();
  const verify = isRegister ? registerVerify : loginVerify;
  const resend = isRegister ? registerResend : loginResend;
  const { leave, close } = useLeaveAuth();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [channel, setChannel] = useState(params.channel ?? '');
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const [expiresIn, setExpiresIn] = useState(Number(params.expiresIn) || 300);

  // Một đồng hồ chung cho thời gian chờ gửi lại và hạn của mã.
  useEffect(() => {
    const id = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // OTP success: hiện thông báo một lúc rồi đóng luồng đăng nhập, mở màn đang chờ (vd. Checkout).
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => leave(params.redirect), SUCCESS_MS);
    return () => clearTimeout(t);
  }, [success, leave, params.redirect]);

  const onVerified = (res: AuthResponse) => {
    if (!res.token) {
      setError('Máy chủ không trả phiên đăng nhập, vui lòng thử lại.');
      return;
    }
    setSession(res.token, { phone, ...profileFromCustomer(res.customer, res.email) }, res.expires_at);
    inputRef.current?.blur();
    setSuccess(true);
  };

  const submit = (value = code) => {
    if (value.length !== OTP_LENGTH || verify.isPending || success) return;
    if (expiresIn === 0) {
      setError('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
      return;
    }
    setError('');
    verify.mutate(
      { phone, code: value },
      {
        onSuccess: onVerified,
        // "Mã OTP sai": giữ các số đã nhập (viền đỏ) để người dùng thấy và sửa.
        onError: (e) => setError(e instanceof ApiError && e.status === 401 ? 'Mã OTP không chính xác' : e.message),
      },
    );
  };

  const resendCode = () => {
    if (resendIn > 0 || resend.isPending) return;
    setError('');
    resend.mutate(phone, {
      onSuccess: (res) => {
        setCode('');
        setResendIn(RESEND_SECONDS);
        setExpiresIn(res.expires_in ?? 300);
        if (res.channel) setChannel(res.channel);
        inputRef.current?.focus();
      },
      // 429: quá số lần gửi, 502: Zalo từ chối gửi.
      onError: (e) => setError(e.message),
    });
  };

  const canResend = resendIn === 0 && !resend.isPending;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Pressable onPress={close} hitSlop={10} style={[styles.close, { top: insets.top + 9 }]}>
        <Icon source={icons.close} size={24} />
      </Pressable>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.content, { paddingTop: insets.top + 120 }]}>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <AppText variant="h5" align="center">
              Nhập mã xác thực
            </AppText>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <AppText size={12} color={colors.neutral70} align="center">
                Mã OTP vừa được gửi {channel === 'zalo' ? 'qua Zalo ' : ''}đến số điện thoại
              </AppText>
              <AppText variant="bodySmallSemibold" align="center">
                {formatPhoneDisplay(phone ?? '')}
              </AppText>
            </View>
          </View>

          <View style={{ gap: 12, alignItems: 'center' }}>
            <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const filled = i < code.length;
                const active = i === code.length && !error;
                return (
                  <View key={i} style={[styles.box, filled && styles.boxFilled, active && styles.boxActive, !!error && styles.boxError]}>
                    <AppText size={24} weight="semibold" align="center">
                      {code[i] ?? ''}
                    </AppText>
                  </View>
                );
              })}
            </Pressable>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                const next = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
                setCode(next);
                setError('');
                if (next.length === OTP_LENGTH) submit(next);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoFocus
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
            />

            {!!error && (
              <AppText size={12} color={colors.error} align="center">
                {error}
              </AppText>
            )}

            <AppText align="center">
              Bạn không nhận được mã?{' '}
              <AppText color={colors.primary} onPress={canResend ? resendCode : undefined}>
                {resend.isPending ? 'Đang gửi...' : 'Gửi lại'}
              </AppText>
              {resendIn > 0 && ` (${mmss(resendIn)})`}
            </AppText>
          </View>

          <Button
            title={verify.isPending ? 'Đang xác thực...' : 'Xác nhận'}
            disabled={code.length !== OTP_LENGTH || verify.isPending || success}
            onPress={() => submit()}
            style={{ marginTop: 'auto' }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* OTP success: nền tối + thẻ thông báo */}
      <SuccessToast visible={success} message="Đã xác nhận mã OTP thành công!" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  close: { position: 'absolute', left: 12, zIndex: 1, backgroundColor: colors.background, borderRadius: 100, padding: 4 },
  content: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, gap: 32 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: { width: 44, height: 48, borderWidth: 1, borderColor: colors.neutral40, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  boxFilled: { borderColor: colors.neutral50 },
  boxActive: { borderColor: colors.primary },
  boxError: { borderColor: colors.error },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
