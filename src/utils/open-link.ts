import { Linking } from 'react-native';

/** Mở link ngoài (tel:, mailto:, maps...) — trả về false nếu thiết bị không hỗ trợ (vd. gọi điện trên Simulator). */
export async function openLink(url: string, fallback?: string) {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    if (fallback) return openLink(fallback);
    return false;
  }
}
