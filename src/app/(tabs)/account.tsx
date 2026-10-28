import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, ReactNode, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCustomerSummary, useDeleteAvatar, useUploadAvatar } from '@/api/hooks';
import { API_LOG_ENABLED } from '@/api/logger';
import { icons, img } from '@/assets';
import { PointsPill } from '@/components/points-pill';
import { BottomSheet, ConfirmDialog, useToast } from '@/components/overlays';
import { AppText, Button, Icon, IconBadgeButton, Photo, RIcon, Toggle } from '@/components/ui';
import { OrderStatus } from '@/data/mock-extra';
import { RemixName } from '@/remix-icons';
import { useApp } from '@/store/app-store';
import { goToLogin } from '@/utils/navigation';
import { blueGradient, colors } from '@/theme';

const ORDER_STATUSES: { label: OrderStatus; icon: number; size: number }[] = [
  { label: 'Chờ xác nhận', icon: img.orderPending, size: 32 },
  { label: 'Đang giao', icon: img.orderShipping, size: 32 },
  { label: 'Hoàn thành', icon: img.orderDone, size: 30 },
  { label: 'Đánh giá', icon: img.orderRating, size: 32 },
];

function GlassCard({ icon, title, onPress }: { icon: ReactNode; title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.glass} onPress={onPress}>
      <BlurView intensity={21} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0.2)']}
        locations={[0.14, 0.63]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glassIcon}>{icon}</View>
      <AppText weight="semibold" color={colors.white}>
        {title}
      </AppText>
    </Pressable>
  );
}

function MenuGroup({ title, titleSize = 18, children }: { title: string; titleSize?: number; children: ReactNode[] }) {
  return (
    <View style={styles.group}>
      <AppText weight="semibold" size={titleSize}>
        {title}
      </AppText>
      <View style={styles.groupBody}>
        {children.filter(Boolean).map((child, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={styles.menuDivider} />}
            {child}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

function MenuRow({ icon, label, right, textColor = colors.neutral90, onPress }: { icon: number | RemixName; label: string; right?: ReactNode; textColor?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      {typeof icon === 'string' ? <RIcon name={icon} size={20} color={colors.neutral90} /> : <Icon source={icon} size={20} />}
      <AppText variant="bodyMedium" color={textColor} style={{ flex: 1 }}>
        {label}
      </AppText>
      {right ?? <Icon source={icons.arrowRight} size={20} />}
    </Pressable>
  );
}

const SectionGap = () => <View style={styles.sectionGap} />;

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { isLoggedIn, logout, cartCount, profile, points, unreadCount } = useApp();
  const [notify, setNotify] = useState(false);
  const [faceId, setFaceId] = useState(true);
  const [language, setLanguage] = useState<'VIE' | 'ENG'>('VIE');
  const [sheet, setSheet] = useState<'avatar' | 'language' | null>(null);
  const [dialog, setDialog] = useState<'logout' | 'delete' | null>(null);

  const goLogin = () => router.push('/login');
  /** Mở màn cần đăng nhập; khách sẽ được chuyển sang Đăng nhập. */
  const guard = (fn: () => void) => () => (isLoggedIn ? fn() : goLogin());
  // Số liệu thật từ /customers/me/summary (điểm, số đơn theo trạng thái).
  const summary = useCustomerSummary();
  const SUMMARY_KEY = { 'Chờ xác nhận': 'pending', 'Đang giao': 'shipping', 'Hoàn thành': 'completed', 'Đánh giá': 'to_review' } as const;
  const countOf = (status: OrderStatus) => {
    const key = SUMMARY_KEY[status as keyof typeof SUMMARY_KEY];
    return summary.data && key ? summary.data.orders[key] : 0;
  };

  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const pickAvatar = async (source: 'camera' | 'library') => {
    setSheet(null);
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Bạn cần cấp quyền để đổi ảnh đại diện', 'errorWarningLine');
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled) return;
    const asset = res.assets[0];
    // POST /customers/me/avatar (multipart) — ảnh chỉ đổi sau khi server lưu thành công.
    uploadAvatar.mutate(
      { uri: asset.uri, name: asset.fileName, type: asset.mimeType },
      {
        onSuccess: () => toast('Đã cập nhật ảnh đại diện'),
        onError: (e) => toast(e.message, 'errorWarningLine'),
      },
    );
  };
  const removeAvatar = () => {
    setSheet(null);
    deleteAvatar.mutate(undefined, {
      onSuccess: () => toast('Đã xoá ảnh đại diện'),
      onError: (e) => toast(e.message, 'errorWarningLine'),
    });
  };
  const avatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          isLoggedIn ? <RefreshControl refreshing={summary.isRefetching} onRefresh={() => summary.refetch()} tintColor={colors.white} /> : undefined
        }>
        <LinearGradient {...blueGradient} style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={styles.headerRow}>
            <AppText variant="bodyMediumSemibold" color={colors.white}>
              Tài khoản
            </AppText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <IconBadgeButton icon={icons.notification} count={unreadCount} onPress={() => router.push('/notifications')} />
              <IconBadgeButton icon={icons.cart} count={cartCount} onPress={() => router.push('/cart')} />
            </View>
          </View>

          {isLoggedIn ? (
            <View style={styles.profile}>
              <Pressable onPress={() => setSheet('avatar')} disabled={avatarBusy}>
                <Photo source={profile.avatar ?? img.avatar} radius={36} style={styles.avatar} />
                {avatarBusy && (
                  <View style={styles.avatarBusy}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Icon source={icons.edit} size={16} />
                </View>
              </Pressable>
              <Pressable style={{ flex: 1, gap: 4 }} onPress={() => router.push('/profile-info')}>
                <AppText variant="h4" color={colors.white} numberOfLines={1}>
                  {profile.name || profile.phone || 'Khách hàng'}
                </AppText>
                <AppText weight="medium" color={colors.neutral40}>
                  {profile.phone}
                </AppText>
              </Pressable>
              <Pressable onPress={() => router.push('/points-history')}>
                <PointsPill compact points={points} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.profile}>
              <Photo source={img.avatar} radius={36} style={styles.avatar} />
              <View style={{ flex: 1, gap: 8 }}>
                <AppText variant="h4" color={colors.white}>
                  Xin chào!
                </AppText>
                <Button title="Đăng nhập / Đăng ký" onPress={goLogin} style={{ height: 40, alignSelf: 'flex-start' }} />
              </View>
            </View>
          )}

          <View style={styles.glassRow}>
            <GlassCard
              title={'Đánh giá\ncủa bạn'}
              icon={<Icon source={icons.starBig} size={48} style={{ marginTop: -8 }} />}
              onPress={guard(() => router.push({ pathname: '/orders', params: { tab: 'Đánh giá' } }))}
            />
            <GlassCard title={'Ưu đãi\ncủa bạn'} icon={<Icon source={icons.couponBig} width={48} height={41.6} />} onPress={guard(() => router.push('/my-vouchers'))} />
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          {/* Đơn hàng */}
          <View style={{ paddingHorizontal: 12, gap: 20 }}>
            <Pressable style={styles.ordersHeader} onPress={guard(() => router.push('/orders'))}>
              <AppText variant="h5">Đơn hàng của tôi</AppText>
              <Icon source={icons.seeMore} size={16} />
            </Pressable>
            <View style={styles.orderRow}>
              {ORDER_STATUSES.map((s) => {
                const count = isLoggedIn ? countOf(s.label) : 0;
                const active = s.label === 'Đang giao' && count > 0;
                return (
                <Pressable key={s.label} style={styles.orderItem} onPress={guard(() => router.push({ pathname: '/orders', params: { tab: s.label } }))}>
                  <View style={[styles.orderIcon, active && { backgroundColor: colors.primarySurface }]}>
                    <Icon source={s.icon} size={s.size} />
                    {count > 0 && (
                      <View style={styles.orderBadge}>
                        <AppText size={10} weight="semibold" color={colors.white} align="center">
                          {count}
                        </AppText>
                      </View>
                    )}
                  </View>
                  <AppText
                    size={12}
                    weight={active ? 'semibold' : 'medium'}
                    color={active ? colors.primary : colors.text}
                    align="center"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}>
                    {s.label}
                  </AppText>
                </Pressable>
                );
              })}
            </View>
          </View>
          <SectionGap />

          <MenuGroup title="Tài khoản">
            <MenuRow icon={icons.user} label="Thông tin cá nhân" onPress={guard(() => router.push('/profile-info'))} />
            <MenuRow icon={icons.address} label="Địa chỉ giao hàng" onPress={guard(() => router.push('/addresses'))} />
            <MenuRow icon={icons.payment} label="Quản lý Thanh toán" onPress={guard(() => router.push('/payment-methods'))} />
          </MenuGroup>
          <SectionGap />

          <MenuGroup title="Cài đặt" titleSize={16}>
            <MenuRow icon={icons.bell} label="Nhận thông báo" textColor={colors.text} right={<Toggle value={notify} onChange={(v) => { setNotify(v); toast(v ? 'Đã bật thông báo' : 'Đã tắt thông báo'); }} />} />
            <MenuRow icon={icons.faceId} label="Face ID" textColor={colors.text} right={<Toggle value={faceId} onChange={(v) => { setFaceId(v); toast(v ? 'Đã bật đăng nhập bằng Face ID' : 'Đã tắt Face ID'); }} />} />
            <MenuRow
              icon={icons.language}
              label="Ngôn ngữ"
              textColor={colors.text}
              onPress={() => setSheet('language')}
              right={
                <Pressable style={styles.language} onPress={() => setSheet('language')}>
                  <AppText size={12}>{language}</AppText>
                  <View style={{ width: 22, height: 22 }}>
                    <Icon source={img.flagVn1} size={22} style={StyleSheet.absoluteFill} />
                    <Icon source={img.flagVn2} size={22} style={StyleSheet.absoluteFill} />
                  </View>
                </Pressable>
              }
            />
            <MenuRow icon={icons.deleteAccount} label="Xoá tài khoản" textColor={colors.text} onPress={guard(() => setDialog('delete'))} />
          </MenuGroup>
          <SectionGap />

          <MenuGroup title="Hỗ trợ">
            <MenuRow icon={icons.help} label="Trung tâm trợ giúp" onPress={() => router.push('/help')} />
            <MenuRow icon={icons.terms} label="Điều khoản sử dụng" onPress={() => router.push('/terms')} />
            <MenuRow icon={icons.about} label="Về Thế Giới Sữa" onPress={() => router.push('/about')} />
            {API_LOG_ENABLED && <MenuRow icon={icons.terms} label="Nhật ký API (dev)" onPress={() => router.push('/api-logs')} />}
          </MenuGroup>

          <View style={{ paddingHorizontal: 12, paddingTop: 12, gap: 16 }}>
            {isLoggedIn && (
              <Pressable onPress={() => setDialog('logout')} style={styles.logout}>
                <Icon source={icons.logout} size={24} />
                <AppText variant="bodyMedium" color={colors.error}>
                  Đăng xuất
                </AppText>
                <Icon source={icons.arrowRightRed} size={20} style={{ marginLeft: 12 }} />
              </Pressable>
            )}
            <AppText color={colors.neutral90}>Phiên bản 1.0.0. Cập nhật ngày 25.8.2026</AppText>
          </View>
        </View>
      </ScrollView>

      {/* Change Profile: đổi ảnh đại diện */}
      <BottomSheet visible={sheet === 'avatar'} onClose={() => setSheet(null)} title="Ảnh đại diện">
        <SheetOption icon="cameraLine" label="Chụp ảnh mới" onPress={() => pickAvatar('camera')} />
        <SheetOption icon="imageAddLine" label="Chọn từ thư viện" onPress={() => pickAvatar('library')} />
        {profile.avatar && (
          <SheetOption
            icon="deleteBinLine"
            label="Xoá ảnh hiện tại"
            danger
            onPress={removeAvatar}
          />
        )}
      </BottomSheet>

      <BottomSheet visible={sheet === 'language'} onClose={() => setSheet(null)} title="Ngôn ngữ">
        {(['VIE', 'ENG'] as const).map((l) => (
          <SheetOption
            key={l}
            icon="globalLine"
            label={l === 'VIE' ? 'Tiếng Việt' : 'English'}
            selected={language === l}
            onPress={() => {
              setLanguage(l);
              setSheet(null);
              if (l === 'ENG') toast('Bản tiếng Anh sẽ sớm ra mắt', 'informationLine');
            }}
          />
        ))}
      </BottomSheet>

      {/* Log out */}
      <ConfirmDialog
        visible={dialog === 'logout'}
        title={'Bạn có chắc chắn muốn\nthoát không?'}
        confirmLabel="Thoát"
        cancelLabel="Huỷ bỏ"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          logout();
          toast('Đã đăng xuất');
          goToLogin();
        }}
      />
      <ConfirmDialog
        visible={dialog === 'delete'}
        title="Xoá tài khoản?"
        message="Toàn bộ điểm thưởng, voucher và lịch sử đơn hàng sẽ bị xoá vĩnh viễn. Hành động này không thể hoàn tác."
        confirmLabel="Xoá tài khoản"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null);
          logout();
          toast('Yêu cầu xoá tài khoản đã được ghi nhận', 'informationLine');
          goToLogin();
        }}
      />
    </View>
  );
}

function SheetOption({ icon, label, onPress, danger, selected }: { icon: Parameters<typeof RIcon>[0]['name']; label: string; onPress: () => void; danger?: boolean; selected?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.sheetOption}>
      <RIcon name={icon} size={22} color={danger ? colors.error : colors.primary} />
      <AppText variant="bodyMediumRegular" color={danger ? colors.error : colors.text} style={{ flex: 1 }}>
        {label}
      </AppText>
      {selected && <RIcon name="checkLine" size={20} color={colors.primary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { paddingBottom: 24 + 12 + 24 },
  headerRow: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  profile: { height: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  avatarBusy: { ...StyleSheet.absoluteFill, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 72, height: 72, borderWidth: 3.6, borderColor: colors.white, borderRadius: 36 },
  editBadge: {
    position: 'absolute',
    left: 48,
    top: 54,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, marginTop: 16, gap: 9 },
  glass: {
    flex: 1,
    height: 64,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: colors.white,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  glassIcon: { width: 40, height: 40, borderRadius: 96, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingTop: 24,
  },
  ordersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  orderItem: { width: 76, alignItems: 'center', gap: 8 },
  orderIcon: { width: 48, height: 48, borderRadius: 128, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  orderBadge: {
    position: 'absolute',
    top: -7,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: 'center',
  },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  sectionGap: { height: 4, backgroundColor: colors.background, marginTop: 16, marginBottom: 12 },
  group: { paddingHorizontal: 12, gap: 8 },
  groupBody: { paddingVertical: 16, gap: 12 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 24 },
  menuDivider: { height: 1, backgroundColor: colors.neutral30 },
  language: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 3,
    borderRadius: 128,
    borderWidth: 1,
    borderColor: colors.neutral40,
  },
  logout: {
    height: 40,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 128,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
});
