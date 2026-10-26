import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useCustomerMe } from '@/api/hooks';
import { genderFromApi } from '@/api/mappers';
import { icons } from '@/assets';
import { Skeleton } from '@/components/form';
import { ScreenHeader } from '@/components/headers';
import { BottomSheet } from '@/components/overlays';
import { StateView } from '@/components/state-view';
import { AppText, Icon, RIcon } from '@/components/ui';
import { useApp } from '@/store/app-store';
import { colors } from '@/theme';
import { formatPhoneIntl } from '@/utils/validation';

/**
 * Thông tin cá nhân (Figma "Account & Password" 7120:14806) — chỉ xem, dữ liệu GET /customers/me.
 * "Chỉnh sửa" → Chỉnh sửa thông tin; nút "…" → đổi mật khẩu / số điện thoại.
 */
export default function ProfileInfoScreen() {
  const { profile, isLoggedIn } = useApp();
  const me = useCustomerMe();
  const [menu, setMenu] = useState(false);

  const rows = [
    { label: 'Tên của bạn', value: me.data?.name || profile.name },
    { label: 'Email', value: me.data?.email || profile.email },
    { label: 'Giới tính', value: genderFromApi(me.data?.gender) ?? (me.data ? '' : profile.gender) },
    { label: 'Số điện thoại', value: formatPhoneIntl(me.data?.phone || profile.phone) },
  ];

  const openMenu = (path: 'password' | 'phone') => {
    setMenu(false);
    router.push({ pathname: '/account-security', params: path === 'password' ? { open: 'password' } : {} });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Thông tin cá nhân"
        shadow
        right={
          isLoggedIn ? (
            <Pressable onPress={() => setMenu(true)} hitSlop={10}>
              <Icon source={icons.moreFill} size={24} />
            </Pressable>
          ) : null
        }
      />

      {!isLoggedIn ? (
        <View style={styles.center}>
          <StateView
            type="empty"
            title="Bạn chưa đăng nhập"
            message="Đăng nhập để xem thông tin cá nhân"
            actionLabel="Đăng nhập"
            onAction={() => router.replace({ pathname: '/login', params: { redirect: '/profile-info' } })}
          />
        </View>
      ) : me.isError && !me.data ? (
        <View style={styles.center}>
          <StateView type="offline" title="Không tải được thông tin" message={me.error.message} actionLabel="Thử lại" onAction={() => me.refetch()} />
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={() => me.refetch()} tintColor={colors.primary} />}>
          <View style={styles.titleRow}>
            <AppText variant="bodyMediumSemibold" style={{ flex: 1 }} numberOfLines={1}>
              Thông tin cá nhân
            </AppText>
            <Pressable onPress={() => router.push('/profile-edit')} hitSlop={8} style={styles.editBtn}>
              <Icon source={icons.editPrimary} size={16} />
              <AppText variant="bodySmallSemibold" color={colors.primary}>
                Chỉnh sửa
              </AppText>
            </Pressable>
          </View>
          <View style={styles.list}>
            {rows.map((r, i) => (
              <Fragment key={r.label}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.row}>
                  <AppText variant="bodyMediumRegular" color={colors.neutral70} style={styles.label}>
                    {r.label}
                  </AppText>
                  {me.isLoading ? (
                    <Skeleton style={{ width: 140, height: 18 }} />
                  ) : (
                    <AppText variant="bodyMedium" style={styles.value} numberOfLines={1}>
                      {r.value || '—'}
                    </AppText>
                  )}
                </View>
              </Fragment>
            ))}
          </View>
        </ScrollView>
      )}

      <BottomSheet visible={menu} onClose={() => setMenu(false)} title="Tài khoản">
        <Pressable style={styles.menuItem} onPress={() => openMenu('password')}>
          <RIcon name="lockPasswordLine" size={22} color={colors.primary} />
          <AppText variant="bodyMedium" style={{ flex: 1 }}>
            Đổi mật khẩu
          </AppText>
          <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
        </Pressable>
        <Pressable style={styles.menuItem} onPress={() => openMenu('phone')}>
          <RIcon name="smartphoneLine" size={22} color={colors.primary} />
          <AppText variant="bodyMedium" style={{ flex: 1 }}>
            Đổi số điện thoại
          </AppText>
          <RIcon name="arrowRightSLine" size={20} color={colors.neutral60} />
        </Pressable>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', backgroundColor: colors.white },
  body: { flex: 1, backgroundColor: colors.white, marginTop: 4 },
  content: { paddingTop: 16, paddingHorizontal: 12, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 16 },
  list: { paddingVertical: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { width: 108 },
  value: { flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.neutral30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
});
