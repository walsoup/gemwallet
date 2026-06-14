import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useKeyboard } from '../../utils/useKeyboard';
import { AppTheme } from '../../../providers/AppThemeProvider';
import { useSettingsStore } from '../../../store/useSettingsStore';
import { BouncyButton } from '../UI/BouncyButton';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export function CustomBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const { isKeyboardVisible } = useKeyboard();
  const aiFeaturesEnabled = useSettingsStore((s) => s.aiFeaturesEnabled);

  const allowedTabs = ['index', 'analytics', 'chat', 'planning', 'settings'];
  const routes = state.routes.filter((r: any) => {
    if (!allowedTabs.includes(r.name)) return false;
    if (r.name === 'chat') return aiFeaturesEnabled;
    return true;
  });

  const CONTAINER_PADDING_H = 12; // inside container
  const POSITION_PADDING_H = 16; // outside container
  const totalNavWidth = width - (POSITION_PADDING_H * 2);
  const usableNavWidth = totalNavWidth - (CONTAINER_PADDING_H * 2);

  const INDICATOR_HEIGHT = 44;
  const INDICATOR_MARGIN = 4;
  
  const tabWidth = usableNavWidth / routes.length;
  const indicatorWidth = tabWidth - (INDICATOR_MARGIN * 2);

  // Calculate active index relative to the FILTERED routes
  const activeIndex = routes.findIndex(r => state.routes[state.index].name === r.name);
  // Base offset is the padding inside the container, plus the indicator margin, plus the active index tab width
  const translateX = useSharedValue(CONTAINER_PADDING_H + activeIndex * tabWidth + INDICATOR_MARGIN);

  useEffect(() => {
    translateX.value = withSpring(CONTAINER_PADDING_H + activeIndex * tabWidth + INDICATOR_MARGIN, {
      damping: 20,
      stiffness: 150,
      mass: 1
    });
  }, [activeIndex, tabWidth, translateX, INDICATOR_MARGIN, CONTAINER_PADDING_H]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View style={styles.positionContainer}>
      <BlurView
        intensity={80}
        tint={theme.dark ? "dark" : "light"}
        style={[
          styles.container, 
          { 
            marginBottom: Math.max(insets.bottom, 16),
            backgroundColor: theme.dark ? 'rgba(21, 19, 19, 0.65)' : 'rgba(255, 255, 255, 0.65)',
            borderColor: theme.colors.outlineVariant + '40'
          }
        ]}
      >
        <Animated.View 
          style={[
            styles.indicator, 
            indicatorStyle, 
            { height: INDICATOR_HEIGHT, width: indicatorWidth, backgroundColor: theme.colors.primaryContainer, borderRadius: 28 },
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
            <BouncyButton
              key={route.key}
              onPress={onPress}
              scaleTo={0.85}
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
            </BouncyButton>
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
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
  },
  indicator: {
    position: 'absolute',
    top: 12,
    left: 0,
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
