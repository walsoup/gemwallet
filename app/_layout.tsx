import { Tabs, useRouter, useSegments, SplashScreen } from 'expo-router';
import React, { useEffect } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomBottomNav } from '../src/components/Navigation/CustomBottomNav';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppThemeProvider } from '../providers/AppThemeProvider';
import { BiometricGate } from '../providers/BiometricGate';
import { useTransactionStore } from '../store/useTransactionStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useRecurringStore } from '../store/useRecurringStore';

import { useFonts } from 'expo-font';
import { SpaceGrotesk_300Light, SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { BeVietnamPro_300Light, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold, BeVietnamPro_900Black } from '@expo-google-fonts/be-vietnam-pro';

SplashScreen.preventAutoHideAsync();



function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  useSafeAreaInsets();
  const hasCompletedOnboarding = useTransactionStore((state) => state.walletMeta.hasCompletedOnboarding);
  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);
  const applyDueEvents = useRecurringStore((state) => state.applyDueEvents);
  const recurringEnabled = useRecurringStore((state) => state.recurringEnabled);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);

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

  useEffect(() => {
    if (!hasCompletedOnboarding || !recurringEnabled) return;

    const apply = () => {
      applyDueEvents(Date.now(), (event) => {
        if (event.type === 'income') {
          addIncome({
            amountCents: event.amountCents,
            categoryId: event.categoryId,
            note: `${event.name} (recurring)`,
          });
          return;
        }

        addExpense({
          amountCents: event.amountCents,
          categoryId: event.categoryId,
          note: `${event.name} (recurring)`,
        });
      });
    };

    apply();
    const interval = setInterval(apply, 60_000);
    return () => clearInterval(interval);
  }, [addExpense, addIncome, applyDueEvents, hasCompletedOnboarding, recurringEnabled]);

  if (!hasCompletedOnboarding || !fontsLoaded) {
    return <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }} />;
  }

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
          <BiometricGate>
            <TabLayout />
          </BiometricGate>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
