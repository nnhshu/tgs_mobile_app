import { createContext, PropsWithChildren, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { icons } from '@/assets';
import { AppText, Button, Icon, RIcon } from '@/components/ui';
import { RemixName } from '@/remix-icons';
import { colors } from '@/theme';

/* ---------- Bottom sheet ("PopUp" trượt từ dưới) ---------- */

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '85%',
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: `${number}%` | number;
}) {
  const insets = useSafeAreaInsets();
  // Modal của màn bên dưới không được đè lên màn mới mở.
  const focused = useIsFocused();
  return (
    <Modal visible={visible && focused} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight, paddingBottom: footer ? 0 : Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          {title && (
            <View style={styles.sheetHeader}>
              <AppText variant="h5" style={{ flex: 1 }} align="center">
                {title}
              </AppText>
              <Pressable onPress={onClose} hitSlop={10} style={styles.sheetClose}>
                <RIcon name="closeLine" size={24} />
              </Pressable>
            </View>
          )}
          <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 12 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer && <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>{footer}</View>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- Hộp thoại xác nhận (Log out, Xoá địa chỉ, Huỷ đơn...) ---------- */

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Huỷ',
  destructive,
  icon,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  destructive?: boolean;
  icon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const focused = useIsFocused();
  return (
    <Modal visible={visible && focused} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.dialogRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View entering={FadeInDown.duration(220)} style={styles.dialog}>
          <Pressable onPress={onCancel} hitSlop={10} style={styles.dialogClose}>
            <Icon source={icons.closeLine} size={24} />
          </Pressable>
          {icon}
          <View style={{ gap: 8, alignItems: 'center' }}>
            <AppText variant="h5" align="center">
              {title}
            </AppText>
            {message && (
              <AppText color={colors.neutral70} align="center">
                {message}
              </AppText>
            )}
          </View>
          {children}
          <View style={styles.dialogActions}>
            {cancelLabel && <Button title={cancelLabel} variant="outline" onPress={onCancel} style={[styles.dialogBtn, styles.dialogBtnOutline]} />}
            <Button title={confirmLabel} onPress={onConfirm} style={[styles.dialogBtn, !cancelLabel && { flex: 1 }, destructive && { backgroundColor: colors.error }]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Popup kết quả (OTP success, Đổi điểm thành công, Cập nhật thông tin...). */
export function ResultDialog({
  visible,
  title,
  message,
  actionLabel = 'Đóng',
  onClose,
  tone = 'success',
}: {
  visible: boolean;
  title: string;
  message?: string;
  actionLabel?: string;
  onClose: () => void;
  tone?: 'success' | 'error';
}) {
  return (
    <ConfirmDialog
      visible={visible}
      title={title}
      message={message}
      confirmLabel={actionLabel}
      cancelLabel={null}
      onConfirm={onClose}
      onCancel={onClose}
      icon={
        tone === 'success' ? (
          <Icon source={icons.success} size={56} />
        ) : (
          <RIcon name="closeCircleFill" size={64} color={colors.error} />
        )
      }
    />
  );
}

/* ---------- Toast ---------- */

type ToastState = { message: string; icon?: RemixName } | null;
const ToastContext = createContext<(message: string, icon?: RemixName) => void>(() => {});

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, icon: RemixName = 'checkboxCircleFill') => {
    clearTimeout(timer.current);
    setToast({ message, icon });
    timer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOutUp}
          style={[styles.toast, { top: insets.top + 60, pointerEvents: 'none' }]}>
          {toast.icon && <RIcon name={toast.icon} size={22} color={colors.white} />}
          <AppText weight="medium" color={colors.white} style={{ flexShrink: 1 }}>
            {toast.message}
          </AppText>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/* ---------- Loader toàn màn ("Payment Processing") ---------- */

export function LoadingOverlay({ visible, label }: { visible: boolean; label?: string }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loading}>
      <View style={styles.loadingBox}>
        <SpinningLoader />
        {label && <AppText weight="medium">{label}</AppText>}
      </View>
    </Animated.View>
  );
}

export function SpinningLoader({ size = 40, color = colors.primary }: { size?: number; color?: string }) {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
  }, [rotation]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View style={style}>
      <RIcon name="loader4Fill" size={size} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral40, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8 },
  sheetClose: { position: 'absolute', right: 16 },
  sheetFooter: {
    paddingTop: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral30,
    backgroundColor: colors.white,
  },
  // Figma "Log out" (7120:15375): nền mờ 35%, thẻ 341px bo 16, nút X 24px góc phải, 2 nút 131px căn giữa.
  dialogRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 26 },
  dialog: { width: '100%', maxWidth: 341, backgroundColor: colors.white, borderRadius: 16, paddingTop: 8, paddingBottom: 24, paddingHorizontal: 12, gap: 12, alignItems: 'center' },
  dialogClose: { alignSelf: 'flex-end' },
  dialogActions: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  dialogBtn: { width: 131, height: 48 },
  dialogBtnOutline: { height: 44, borderColor: colors.neutral40 },
  loginSheet: { alignItems: 'center', gap: 20, paddingTop: 8, paddingBottom: 8 },
  loginIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  loginLater: { height: 48, alignItems: 'center', justifyContent: 'center' },
  successRoot: { ...StyleSheet.absoluteFill, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successCard: { alignSelf: 'stretch', alignItems: 'center', gap: 10, padding: 16, borderRadius: 8, backgroundColor: 'rgba(30,30,30,0.9)' },
  successIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,10,10,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  loading: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { alignItems: 'center', gap: 12 },
});

/**
 * Thông báo thành công giữa màn hình: nền mờ + thẻ tối có dấu ✓ xanh
 * (Figma "02_Toast Noti_Đã thêm vào giỏ", "OTP success").
 */
export function SuccessToast({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null;
  return (
    <Animated.View entering={FadeIn.duration(150)} style={[styles.successRoot, { pointerEvents: 'none' }]}>
      <Animated.View entering={ZoomIn.springify()} style={styles.successCard}>
        <View style={styles.successIcon}>
          <RIcon name="checkLine" size={16} color={colors.white} />
        </View>
        <AppText size={12} weight="medium" color={colors.white} align="center">
          {message}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Yêu cầu đăng nhập (Figma "02_Khách bấm Mua ngay - Login", "Login Required khi Checkout"):
 * icon tròn xanh, tiêu đề, mô tả, nút "Đăng nhập / Đăng ký" và "Để sau".
 */
export function LoginPromptSheet({ visible, title, message, onLogin, onClose }: { visible: boolean; title: string; message: string; onLogin: () => void; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.loginSheet}>
        <View style={styles.loginIcon}>
          <RIcon name="loginBoxLine" size={28} color={colors.white} />
        </View>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <AppText variant="h5" align="center">
            {title}
          </AppText>
          <AppText color={colors.neutral70} align="center">
            {message}
          </AppText>
        </View>
        <View style={{ alignSelf: 'stretch', gap: 4 }}>
          <Button title="Đăng nhập / Đăng ký" onPress={onLogin} />
          <Pressable onPress={onClose} style={styles.loginLater}>
            <AppText variant="bodyMedium">Để sau</AppText>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
