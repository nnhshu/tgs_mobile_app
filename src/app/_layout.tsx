import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/hooks';
import { ToastProvider } from '@/components/overlays';
import { SessionWatcher } from '@/components/session-watcher';
import { AppProvider } from '@/store/app-store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
        <AppProvider>
          <ToastProvider>
          <SessionWatcher />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="login" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-success" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="order-failed" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="payment-processing" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="search" options={{ animation: 'fade' }} />
          </Stack>
          </ToastProvider>
        </AppProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
