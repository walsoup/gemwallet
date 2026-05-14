import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { AppTheme } from '../../../providers/AppThemeProvider';
import { useSettingsStore } from '../../../store/useSettingsStore';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export function CustomBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const aiFeaturesEnabled = useSettingsStore((s) => s.aiFeaturesEnabled);

  const allowedTabs = ['index', 'analytics', 'chat', 'planning', 'settings'];
  const routes = state.routes.filter((r: any) => {
    if (!allowedTabs.includes(r.name)) return false;
    if (r.name === 'chat') return aiFeaturesEnabled;
    return true;
  });

  const tabWidth = (width - 32) / routes.length;
  // Calculate active index relative to the FILTERED routes
  const activeIndex = routes.findIndex(r => state.routes[state.index].name === r.name);
  const translateX = useSharedValue(activeIndex * tabWidth);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * tabWidth, {
      damping: 20,
      stiffness: 150,
      mass: 1
    });
  }, [activeIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.positionContainer}>
      <BlurView
        intensity={80}
        tint={theme.dark ? "dark" : "light"}
        style={[
          styles.container, 
          { 
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: theme.dark ? 'rgba(21, 19, 19, 0.4)' : 'rgba(255, 255, 255, 0.4)',
            borderColor: theme.colors.outlineVariant + '33'
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.indicator, 
            indicatorStyle, 
            { width: tabWidth, backgroundColor: theme.colors.primaryContainer + '4D' }
          ]} 
        />
        
        {routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = activeIndex === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          let iconName = 'help-circle-outline';
          if (route.name === 'index') iconName = isFocused ? 'home' : 'home-outline';
          if (route.name === 'analytics') iconName = isFocused ? 'chart-box' : 'chart-box-outline';
          if (route.name === 'chat') iconName = isFocused ? 'message-text' : 'message-text-outline';
          if (route.name === 'planning') iconName = isFocused ? 'target' : 'target-account';
          if (route.name === 'settings') iconName = isFocused ? 'cog' : 'cog-outline';

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
            >
              <MaterialCommunityIcons
                name={iconName as any}
                size={24}
                color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="labelSmall"
                style={{ 
                  color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant,
                  marginTop: 4,
                  fontWeight: isFocused ? '600' : '400'
                }}
              >
                {label as string}
              </Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  positionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
  },
  indicator: {
    position: 'absolute',
    top: 8,
    height: 52,
    borderRadius: 26,
    left: 16,
    zIndex: -1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1,
  },
});
