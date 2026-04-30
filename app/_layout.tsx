import * as Haptics from 'expo-haptics';
import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomNavigation, Provider as PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppThemeProvider, useAppTheme } from '../providers/AppThemeProvider';
import { useTransactionStore } from '../store/useTransactionStore';
import { useSettingsStore } from '../store/useSettingsStore';


function TabLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();
  const hasCompletedOnboarding = useTransactionStore((state) => state.walletMeta.hasCompletedOnboarding);
  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);



  useEffect(() => {
    if (!hasCompletedOnboarding && segments[0] !== 'onboarding') {
      router.replace('/onboarding');
    }
  }, [hasCompletedOnboarding, segments, router]);

  if (!hasCompletedOnboarding) {
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
      tabBar={({ navigation, state, descriptors }) => {
        const insets = { bottom: 0 };
        return (
          <BottomNavigation.Bar
            navigationState={state}
            safeAreaInsets={insets}
            style={{ backgroundColor: theme.colors.surfaceContainer }}
            onTabPress={({ route, preventDefault }) => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name, route.params);
              }
            }}
            renderIcon={({ route, focused, color }) => {
              const { options } = descriptors[route.key];
              if (options.tabBarIcon) {
                return options.tabBarIcon({ focused, color, size: 24 });
              }
              const iconName = focused
                ? routes.find((r) => r.key === route.name)?.focusedIcon
                : routes.find((r) => r.key === route.name)?.unfocusedIcon;
              return <MaterialCommunityIcons name={iconName as any} size={24} color={color} />;
            }}
            getLabelText={({ route }) => {
              const { options } = descriptors[route.key];
              const label =
                options.tabBarLabel !== undefined
                  ? options.tabBarLabel
                  : options.title !== undefined
                  ? options.title
                  : route.name;
              return typeof label === 'string' ? label : route.name;
            }}
          />
        );
      }}
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
