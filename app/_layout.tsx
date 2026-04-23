import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FAB, Surface, Text } from 'react-native-paper';

import { AppThemeProvider, useAppTheme } from '../providers/AppThemeProvider';

type TabMeasurement = { x: number; width: number };

function useBouncyScale(pressedScale = 0.9) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pressIn = () => {
    scale.value = withSpring(pressedScale, { damping: 10, stiffness: 520, mass: 0.7 });
  };
  const pressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 320, mass: 0.7 });
  };

  return { animatedStyle, pressIn, pressOut };
}

function TabButton({
  route,
  index,
  label,
  options,
  isFocused,
  onLayout,
  onPress,
  onLongPress,
  theme,
}: {
  route: BottomTabBarProps['state']['routes'][number];
  index: number;
  label: string;
  options: BottomTabBarProps['descriptors'][string]['options'];
  isFocused: boolean;
  onLayout: (layout: TabMeasurement) => void;
  onPress: () => void;
  onLongPress: () => void;
  theme: ReturnType<typeof useAppTheme>;
}) {
  const { animatedStyle, pressIn, pressOut } = useBouncyScale(0.9);
  const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;
  const icon =
    options.tabBarIcon?.({
      focused: isFocused,
      color,
      size: 26,
    }) ?? <MaterialCommunityIcons name="shape" size={26} color={color} />;

  return (
    <Pressable
      onLayout={(e) =>
        onLayout({
          x: e.nativeEvent.layout.x,
          width: e.nativeEvent.layout.width,
        })
      }
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      onLongPress={onLongPress}
      style={{ flex: 1 }}
    >
      <Animated.View
        layout={Layout.springify().mass(1).damping(14).stiffness(240)}
        entering={FadeInDown.springify().mass(0.8).damping(12).stiffness(260)}
        style={[styles.navItem, animatedStyle]}
      >
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: withTiming(isFocused ? theme.colors.primaryContainer : 'transparent', {
                duration: 220,
              }),
              borderColor: withTiming(isFocused ? theme.colors.primary : theme.colors.outlineVariant, {
                duration: 220,
              }),
            },
          ]}
        >
          {icon}
        </Animated.View>
        <Text
          variant="titleSmall"
          style={{
            color,
            fontWeight: '800',
            letterSpacing: 0.25,
            marginTop: 6,
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
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const measurements = useRef<Record<string, TabMeasurement>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(88);
  const fabScale = useSharedValue(1);

  const tabs = useMemo(
    () =>
      state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;
        return { route, index, label, options };
      }),
    [descriptors, state.routes]
  );

  const updateIndicator = useCallback(
    (routeKey: string) => {
      const layout = measurements.current[routeKey];
      if (!layout) return;
      indicatorX.value = withSpring(layout.x - 10, {
        damping: 12,
        stiffness: 200,
        mass: 0.9,
      });
      indicatorWidth.value = withSpring(layout.width + 20, {
        damping: 14,
        stiffness: 220,
        mass: 0.9,
      });
    },
    [indicatorWidth, indicatorX]
  );

  useEffect(() => {
    const activeRoute = tabs[state.index]?.route.key;
    if (activeRoute) {
      updateIndicator(activeRoute);
    }
  }, [state.index, tabs, updateIndicator]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingBottom: Math.max(insets.bottom, 14),
        paddingTop: 10,
      }}
    >
      <Surface
        style={[
          styles.navSurface,
          {
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={4}
      >
        <Animated.View style={[styles.indicatorRail, { backgroundColor: theme.colors.surfaceVariant }]} />
        <Animated.View
          style={[
            styles.activePill,
            indicatorStyle,
            { backgroundColor: theme.colors.surfaceContainerHighest, shadowColor: theme.colors.primary },
          ]}
        />
        <View style={styles.navRow}>
          {tabs.map(({ route, index, label, options }) => (
            <TabButton
              key={route.key}
              route={route}
              index={index}
              label={label as string}
              options={options}
              isFocused={state.index === index}
              onLayout={(layout) => {
                measurements.current[route.key] = layout;
                if (state.index === index) {
                  updateIndicator(route.key);
                }
              }}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (state.index !== index && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
              }}
              onLongPress={() =>
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                })
              }
              theme={theme}
            />
          ))}
        </View>

        <Animated.View
          entering={FadeInDown.delay(80).springify().damping(10).stiffness(320)}
          style={[styles.fabContainer, { bottom: -42 }]}
        >
          <Pressable
            onPressIn={() => {
              fabScale.value = withSpring(0.86, { damping: 6, stiffness: 900, mass: 0.7 });
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1.02, { damping: 10, stiffness: 640, mass: 0.8 });
            }}
            onPress={() => {
              navigation.navigate('planning', { recurringOpen: 'true' } as never);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
              fabScale.value = withSpring(1.08, { damping: 7, stiffness: 760, mass: 0.75 });
            }}
          >
            <Animated.View style={[styles.fabWrapper, fabAnimatedStyle]}>
              <FAB
                size="large"
                accessibilityLabel="Open planning"
                icon="calendar-clock"
                style={{ backgroundColor: theme.colors.primary, transform: [{ translateY: 2 }] }}
                color={theme.colors.onPrimary}
              />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Surface>
    </View>
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
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
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
          title: 'Planning',
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
  navSurface: {
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 18,
    overflow: 'visible',
    position: 'relative',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 76,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorRail: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 16,
    bottom: 16,
    borderRadius: 28,
    opacity: 0.35,
  },
  activePill: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    borderRadius: 30,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  fabContainer: {
    position: 'absolute',
    alignSelf: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  fabWrapper: {
    borderRadius: 38,
    overflow: 'visible',
    transform: [{ translateY: 4 }],
  },
});
