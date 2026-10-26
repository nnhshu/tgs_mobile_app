import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useOtpRequest, useOtpVerify } from '@/api/hooks';
import { profileFromCustomer } from '@/api/mappers';
import { ScreenHeader } from '@/components/headers';
import { ResultDialog } from '@/components/overlays';
import { AppText, Button, RIcon } from '@/components/ui';
import { useLeaveAuth } from '@/hooks/use-leave-auth';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';

/** API gửi OTP 6 số. */
const OTP_LENGTH = 6;
/** Chờ trước khi cho gửi lại mã. */
const RESEND_SECONDS = 60;

const mmss = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

/**
 * Nhập mã xác thực / Mã OTP sai / OTP success.
 * POST /auth/otp/verify { phone, code } → { token, expires_at, customer }.
 */
export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone: string; redirect?: string; expiresIn?: string; channel?: string; message?: string }>();
  const phone = params.phone;
  const { setSession } = useApp();
  const verify = useOtpVerify();
  const resend = useOtpRequest();
  const { leave } = useLeaveAuth();
  const inputRef = useRef<TextInput>(null);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [channel, setChannel] = useState(params.channel ?? '');
  const [info, setInfo] = useState(params.message ?? '');
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

  const submit = (value = code) => {
    if (value.length !== OTP_LENGTH || verify.isPending) return;
    if (expiresIn === 0) {
      setError('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
      return;
    }
    setError('');
    verify.mutate(
      { phone, code: value },
      {
        onSuccess: (res) => {
          if (!res.token) {
            setError('Máy chủ không trả phiên đăng nhập, vui lòng thử lại.');
            return;
          }
          setSession(res.token, { phone, ...profileFromCustomer(res.customer, res.email) }, res.expires_at);
          setSuccess(true);
        },
        // "Mã OTP sai" — 401 kèm thông báo của server.
        onError: (e) => {
          setError(e.message);
          setCode('');
          inputRef.current?.focus();
        },
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
        setInfo(res.message ?? 'Đã gửi lại mã xác thực.');
      },
      // 429: quá số lần gửi, 502: Zalo từ chối gửi.
      onError: (e) => setError(e.message),
    });
  };

  const finish = () => {
    setSuccess(false);
    // Đóng Đăng nhập + OTP rồi mở tiếp màn đang chờ (vd. Checkout).
    leave(params.redirect);
  };

  const via = channel === 'zalo' ? 'qua Zalo' : 'qua tin nhắn SMS';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader title="Xác thực tài khoản" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={{ gap: 12 }}>
            <AppText variant="h4" align="center">
              Nhập mã xác thực
            </AppText>
            <AppText color={colors.neutral70} align="center">
              Mã gồm {OTP_LENGTH} chữ số đã được gửi {via} đến số <AppText weight="semibold">{phone}</AppText>
            </AppText>
            {channel === 'zalo' && (
              <View style={styles.channel}>
                <RIcon name="chat1Line" size={16} color={colors.primary} />
                <AppText size={12} color={colors.primary}>
                  Kiểm tra tin nhắn từ Zalo OA Thế Giới Sữa
                </AppText>
              </View>
            )}
          </View>

          <View style={{ gap: 16, alignItems: 'center' }}>
            <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
              {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                const active = i === code.length;
                return (
                  <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError]}>
                    <AppText variant="h3" align="center">
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

            {error ? (
              <AppText color={colors.error} align="center">
                {error}
              </AppText>
            ) : info ? (
              <AppText size={12} color={colors.neutral70} align="center">
                {info}
              </AppText>
            ) : null}

            <AppText size={12} color={expiresIn > 0 ? colors.neutral60 : colors.error} align="center">
              {expiresIn > 0 ? `Mã hết hạn sau ${mmss(expiresIn)}` : 'Mã đã hết hạn'}
            </AppText>

            <AppText variant="bodyMediumRegular" align="center">
              Bạn không nhận được mã?{' '}
              <AppText variant="bodyMediumRegular" weight="semibold" color={resendIn > 0 || resend.isPending ? colors.neutral60 : colors.primary} onPress={resendCode}>
                {resend.isPending ? 'Đang gửi...' : 'Gửi lại'}
              </AppText>
              {resendIn > 0 && ` (${mmss(resendIn)})`}
            </AppText>
          </View>

          <Button
            title={verify.isPending ? 'Đang xác thực...' : 'Xác nhận'}
            disabled={code.length !== OTP_LENGTH || verify.isPending}
            onPress={() => submit()}
            style={{ marginTop: 'auto' }}
          />
        </View>
      </KeyboardAvoidingView>
      <ResultDialog visible={success} title="Đăng nhập thành công!" message="Chào mừng bạn đến với Thế Giới Sữa." actionLabel="Bắt đầu mua sắm" onClose={finish} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, paddingTop: 48, paddingHorizontal: 12, paddingBottom: 16, gap: 28 },
  channel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  boxes: { flexDirection: 'row', gap: 8 },
  box: { width: 48, height: 52, borderWidth: 1, borderColor: colors.neutral40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  boxActive: { borderColor: colors.primary },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorSurface },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
