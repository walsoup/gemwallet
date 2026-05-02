import * as Haptics from 'expo-haptics';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { CustomBottomNav } from '../src/components/Navigation/CustomBottomNav';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppThemeProvider, useAppTheme } from '../providers/AppThemeProvider';
import { useTransactionStore } from '../store/useTransactionStore';
import { useSettingsStore } from '../store/useSettingsStore';

import { useFonts } from 'expo-font';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { BeVietnamPro_300Light, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold, BeVietnamPro_900Black } from '@expo-google-fonts/be-vietnam-pro';
import { SplashScreen } from 'expo-router';

SplashScreen.preventAutoHideAsync();



function TabLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const hasCompletedOnboarding = useTransactionStore((state) => state.walletMeta.hasCompletedOnboarding);
  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold,
    BeVietnamPro_300Light, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold, BeVietnamPro_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);




  useEffect(() => {
    if (!hasCompletedOnboarding && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding, segments, router]);

  if (!hasCompletedOnboarding || !fontsLoaded) {
    return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }} />;
  }

  const routes = [
    { key: 'index', title: 'Home', focusedIcon: 'home', unfocusedIcon: 'home-outline' },
    { key: 'analytics', title: 'Insights', focusedIcon: 'chart-box', unfocusedIcon: 'chart-box-outline' },
    { key: 'chat', title: 'Chat', focusedIcon: 'message-text', unfocusedIcon: 'message-text-outline' },
    { key: 'planning', title: 'Plan', focusedIcon: 'target', unfocusedIcon: 'target' },
    { key: 'settings', title: 'Settings', focusedIcon: 'cog', unfocusedIcon: 'cog-outline' },
  ];

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomBottomNav {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'home' : 'home-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Insights', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'chart-box' : 'chart-box-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', href: aiFeaturesEnabled ? '/chat' : null, tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'message-text' : 'message-text-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="planning" options={{ title: 'Plan', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name="target" size={24} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, focused }) => <MaterialCommunityIcons name={focused ? 'cog' : 'cog-outline'} size={24} color={color} /> }} />
      <Tabs.Screen name="onboarding" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <PaperProvider>
            <TabLayout />
          </PaperProvider>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
