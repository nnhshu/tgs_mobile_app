import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, useSyncExternalStore } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '@/api/client';
import { ApiLogEntry, clearApiLogs, formatLogPath, getApiLogs, subscribeApiLogs } from '@/api/logger';
import { ScreenHeader } from '@/components/headers';
import { useToast } from '@/components/overlays';
import { AppText, RIcon } from '@/components/ui';
import { colors, fonts } from '@/theme';

const FILTERS = ['Tất cả', 'Lỗi', 'Đang chạy', 'Thành công'] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_COLOR: Record<ApiLogEntry['status'], string> = {
  pending: colors.warning,
  success: colors.success,
  error: colors.error,
};

const time = (ms: number) => new Date(ms).toTimeString().slice(0, 8);

/** Lọc sẵn qua deep link: /api-logs?filter=error | pending | success */
const FILTER_PARAM: Record<string, Filter> = { error: 'Lỗi', pending: 'Đang chạy', success: 'Thành công' };

/** Nhật ký API (chỉ bản dev) — theo dõi request, mã trạng thái, thời gian, lỗi. */
export default function ApiLogsScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const logs = useSyncExternalStore(subscribeApiLogs, getApiLogs);
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<Filter>(FILTER_PARAM[params.filter ?? ''] ?? 'Tất cả');
  const [open, setOpen] = useState<number | null>(null);

  const list = logs.filter((l) =>
    filter === 'Tất cả' ? true : filter === 'Lỗi' ? l.status === 'error' : filter === 'Đang chạy' ? l.status === 'pending' : l.status === 'success',
  );
  const errors = logs.filter((l) => l.status === 'error').length;
  const done = logs.filter((l) => l.durationMs !== undefined);
  const avg = done.length ? Math.round(done.reduce((s, l) => s + (l.durationMs ?? 0), 0) / done.length) : 0;

  const copy = async (l: ApiLogEntry) => {
    await Clipboard.setStringAsync(JSON.stringify({ ...l, url: `${API_URL}${formatLogPath(l.path, l.query)}` }, null, 2));
    toast('Đã sao chép log');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScreenHeader
        title="Nhật ký API"
        right={
          <Pressable onPress={clearApiLogs} hitSlop={8}>
            <RIcon name="deleteBinLine" size={22} color={colors.error} />
          </Pressable>
        }
      />
      <View style={styles.stats}>
        <Stat label="Request" value={String(logs.length)} />
        <Stat label="Lỗi" value={String(errors)} color={errors ? colors.error : colors.text} />
        <Stat label="TB thời gian" value={`${avg}ms`} />
      </View>
      <AppText size={11} color={colors.neutral60} style={styles.base} numberOfLines={1}>
        {API_URL}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterActive]}>
            <AppText weight={filter === f ? 'semibold' : 'regular'} color={filter === f ? colors.primary : colors.text}>
              {f}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={list}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListEmptyComponent={
          <AppText color={colors.neutral70} align="center" style={{ marginTop: 48 }}>
            Chưa có request nào. Dùng app để xem log tại đây.
          </AppText>
        }
        renderItem={({ item: l }) => {
          const expanded = open === l.id;
          return (
            <Pressable onPress={() => setOpen(expanded ? null : l.id)} onLongPress={() => copy(l)} style={styles.item}>
              <View style={styles.row}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLOR[l.status] }]} />
                <AppText size={12} weight="semibold" style={styles.method}>
                  {l.method}
                </AppText>
                <AppText size={13} weight="medium" style={{ flex: 1 }} numberOfLines={expanded ? undefined : 1}>
                  {formatLogPath(l.path, l.query)}
                </AppText>
              </View>
              <View style={styles.meta}>
                <AppText size={12} weight="semibold" color={STATUS_COLOR[l.status]}>
                  {l.status === 'pending' ? 'Đang chạy...' : l.httpStatus ?? 'ERR'}
                </AppText>
                {l.durationMs !== undefined && (
                  <AppText size={12} color={l.durationMs > 3000 ? colors.warning : colors.neutral70}>
                    {l.durationMs}ms
                  </AppText>
                )}
                <AppText size={12} color={colors.neutral60}>
                  {time(l.startedAt)}
                </AppText>
              </View>
              {(l.error || l.summary) && (
                <AppText size={12} color={l.error ? colors.error : colors.neutral90} numberOfLines={expanded ? undefined : 2}>
                  {l.error ?? l.summary}
                </AppText>
              )}
              {expanded && (
                <View style={{ gap: 8 }}>
                  {l.body !== undefined && <Block title="Request body" value={l.body} />}
                  {l.response !== undefined && <Block title="Response (rút gọn)" value={l.response} />}
                  <AppText size={11} color={colors.neutral60}>
                    Giữ để sao chép toàn bộ log
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h5" color={color}>
        {value}
      </AppText>
      <AppText size={12} color={colors.neutral70}>
        {label}
      </AppText>
    </View>
  );
}

function Block({ title, value }: { title: string; value: unknown }) {
  return (
    <View style={styles.block}>
      <AppText size={11} weight="semibold" color={colors.neutral70}>
        {title}
      </AppText>
      <AppText size={11} style={styles.code}>
        {JSON.stringify(value, null, 2)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  stats: { flexDirection: 'row', gap: 8, padding: 12 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: colors.backgroundAlt },
  base: { paddingHorizontal: 12 },
  filters: { gap: 8, padding: 12 },
  filter: { height: 32, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: colors.neutral40, justifyContent: 'center' },
  filterActive: { borderColor: colors.primary, backgroundColor: colors.primarySurface },
  item: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  method: { width: 40 },
  meta: { flexDirection: 'row', gap: 12, paddingLeft: 56 },
  block: { gap: 4, padding: 8, borderRadius: 6, backgroundColor: colors.backgroundAlt },
  code: { fontFamily: fonts.regular, color: colors.neutral90 },
});
