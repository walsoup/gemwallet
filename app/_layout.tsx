import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Surface, Text } from 'react-native-paper';

import { AppThemeProvider, useAppTheme } from '../providers/AppThemeProvider';

type NavItemProps = {
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  icon: React.ReactNode;
};

function NavItem({ label, focused, onPress, onLongPress, icon }: NavItemProps) {
  const theme = useAppTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={styles.navItemPressable}
      onPressIn={() => {
        scale.value = withSpring(0.92, { damping: 12, stiffness: 520, mass: 0.6 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 360, mass: 0.75 });
      }}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View
        style={[
          styles.navItem,
          style,
          {
            backgroundColor: focused ? theme.colors.primaryContainer : 'transparent',
            borderColor: focused ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        {icon}
        <Text
          variant="labelMedium"
          style={{
            color: focused ? theme.colors.primary : theme.colors.onSurfaceVariant,
            marginTop: 4,
            fontWeight: focused ? '800' : '600',
            letterSpacing: 0.3,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <Animated.View
      entering={FadeInUp.springify().mass(0.8).stiffness(260).damping(16)}
      style={{
        paddingHorizontal: 12,
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 10),
      }}
    >
      <Surface
        style={[
          styles.navShell,
          {
            backgroundColor: theme.colors.surfaceContainerLow,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={2}
      >
        <View style={styles.navRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : typeof options.title === 'string'
                  ? options.title
                  : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            };

            const onLongPress = () => {
              navigation.emit({ type: 'tabLongPress', target: route.key });
            };

            const color = focused ? theme.colors.primary : theme.colors.onSurfaceVariant;
            const icon =
              options.tabBarIcon?.({ focused, color, size: 22 }) ?? (
                <MaterialCommunityIcons name="circle-outline" color={color} size={22} />
              );

            return (
              <NavItem
                key={route.key}
                label={label}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
                icon={icon}
              />
            );
          })}
        </View>
      </Surface>
    </Animated.View>
  );
}

function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-variant-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-box-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="target" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <TabLayout />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  navShell: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  navItemPressable: {
    flex: 1,
  },
  navItem: {
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingTop: 4,
  },
});
