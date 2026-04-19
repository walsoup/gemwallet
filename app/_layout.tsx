import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FAB, Surface, Text } from 'react-native-paper';

import { AppThemeProvider, useAppTheme } from '../providers/AppThemeProvider';

function BouncyPressable({
  onPress,
  onLongPress,
  children,
}: {
  onPress: () => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();

  return (
    <TouchableWithoutFeedback
      onPressIn={() => animateTo(0.96)}
      onPressOut={() => animateTo(1)}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </TouchableWithoutFeedback>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

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

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 8 }}>
      <Surface
        style={[
          styles.navSurface,
          {
            backgroundColor: theme.colors.surfaceContainerHigh,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        elevation={3}
      >
        <View style={styles.navRow}>
          {tabs.map(({ route, index, label, options }) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
                Haptics.selectionAsync().catch(() => {});
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const color = isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant;
            const icon =
              options.tabBarIcon?.({
                focused: isFocused,
                color,
                size: 24,
              }) ?? <MaterialCommunityIcons name="shape" size={24} color={color} />;

            return (
              <BouncyPressable key={route.key} onPress={onPress} onLongPress={onLongPress}>
                <View style={styles.navItem}>
                  <View style={[styles.iconWrapper, isFocused && { backgroundColor: theme.colors.surface }]}>
                    {icon}
                  </View>
                  <Text
                    variant="labelMedium"
                    style={{
                      color,
                      fontWeight: '700',
                      marginTop: 4,
                      letterSpacing: 0.15,
                    }}
                  >
                    {label as string}
                  </Text>
                </View>
              </BouncyPressable>
            );
          })}
        </View>

        <View style={styles.fabContainer}>
          <BouncyPressable
            onPress={() => {
              navigation.navigate('planning');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }}
          >
            <FAB
              size="medium"
              icon="plus"
              style={{ backgroundColor: theme.colors.primary }}
              color={theme.colors.onPrimary}
            />
          </BouncyPressable>
        </View>
      </Surface>
    </View>
  );
}

function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBar: (props) => <CustomTabBar {...props} />,
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
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    overflow: 'visible',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    minWidth: 70,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabContainer: {
    position: 'absolute',
    top: -26,
    alignSelf: 'center',
  },
});
