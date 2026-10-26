import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { img } from '@/assets';

/**
 * Splash Screen_01 → 04: chấm trắng xuất hiện, hai vòng tròn lan rộng (986px trong Figma),
 * rồi logo + hình cam ở góc dưới phải.
 */
export default function Splash() {
  const dot = useSharedValue(0);
  const ring = useSharedValue(0);
  const logo = useSharedValue(0);

  useEffect(() => {
    dot.value = withSequence(withTiming(1, { duration: 350, easing: Easing.out(Easing.back(2)) }), withDelay(250, withTiming(0, { duration: 200 })));
    ring.value = withDelay(700, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    logo.value = withDelay(1150, withTiming(1, { duration: 450 }));
    const timer = setTimeout(() => router.replace('/(tabs)'), 2400);
    return () => clearTimeout(timer);
  }, [dot, ring, logo]);

  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }], opacity: dot.value }));
  const ringOuter = useAnimatedStyle(() => ({ transform: [{ scale: ring.value }], opacity: 0.18 * (1 - ring.value * 0.6) }));
  const ringInner = useAnimatedStyle(() => ({ transform: [{ scale: ring.value * 0.62 }], opacity: 0.22 * (1 - ring.value * 0.5) }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.9 + logo.value * 0.1 }] }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image source={img.bgRadialSplash} style={StyleSheet.absoluteFill} contentFit="fill" />
      <Animated.View style={[styles.ring, ringOuter]} />
      <Animated.View style={[styles.ring, ringInner]} />
      <Animated.View style={[styles.dot, dotStyle]} />
      <Animated.View style={logoStyle}>
        <Image source={img.logo} style={styles.logo} contentFit="contain" />
      </Animated.View>
      <Animated.View entering={SlideInRight.delay(1300).duration(700)} style={styles.shape}>
        <Animated.View entering={FadeIn.delay(1300)} style={StyleSheet.absoluteFill}>
          <Image source={img.splashShape} style={StyleSheet.absoluteFill} contentFit="contain" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#0042BC' },
  dot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF' },
  ring: { position: 'absolute', width: 986, height: 986, borderRadius: 493, backgroundColor: '#FFFFFF' },
  logo: { width: 233, height: 48, marginTop: -24 },
  // inset-[57.04%_-31.3%_-10.24%_16.03%] trên khung 393x852
  shape: { position: 'absolute', left: '16.03%', top: '57.04%', width: '115.27%', aspectRatio: 453 / 453.24 },
});
