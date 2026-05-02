import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { AppTheme } from '../../../providers/AppThemeProvider';

export function CustomBottomNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

  const routes = state.routes.filter((r: any) => r.name !== 'onboarding' && r.name !== 'chat' && r.name !== '+not-found'); // Ignoring chat for now or including it conditionally

  return (
    <View style={styles.positionContainer}>
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        {routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          let iconName = 'help-circle-outline';
          if (route.name === 'index') iconName = 'home';
          if (route.name === 'analytics') iconName = 'chart-box';
          if (route.name === 'chat') iconName = 'message-text';
          if (route.name === 'planning') iconName = 'target';
          if (route.name === 'settings') iconName = 'cog';

          if (!isFocused && route.name === 'index') iconName = 'home-outline';
          if (!isFocused && route.name === 'analytics') iconName = 'chart-box-outline';
          if (!isFocused && route.name === 'chat') iconName = 'message-text-outline';
          if (!isFocused && route.name === 'settings') iconName = 'cog-outline';


          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={(options as any).tabBarTestID as string}
              onPress={onPress}
              onLongPress={onLongPress}
              style={[
                styles.tabItem,
                isFocused && { backgroundColor: theme.colors.primaryContainer + '20' } // 20 hex opacity
              ]}
            >
              <MaterialCommunityIcons
                name={iconName as any}
                size={24}
                color={isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant}
                style={styles.icon}
              />
              <Text
                variant="labelSmall"
                style={{ color: isFocused ? theme.colors.primary : theme.colors.onSurfaceVariant }}
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
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(21, 19, 19, 0.8)', // fallback for blur
    // Shadow for android and ios
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.3,
        shadowRadius: 40,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  icon: {
    marginBottom: 4,
  },
});
