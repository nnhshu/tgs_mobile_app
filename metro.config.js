// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Watchman bị hỏng (vd. sau khi Homebrew nâng cấp boost) khiến Metro không thấy file thay đổi.
// Chạy `METRO_NO_WATCHMAN=1 npx expo start` để dùng bộ theo dõi file của Node thay thế.
if (process.env.METRO_NO_WATCHMAN === '1') {
  config.resolver.useWatchman = false;
}

module.exports = config;
