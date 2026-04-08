import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { AppIcon } from '../../components/AppIcon';

export default function TabLayout() {
  const theme = useTheme();

  const onTabPress = () => {
    void Haptics.selectionAsync();
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.onSurface,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        listeners={{ tabPress: onTabPress }}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <AppIcon name="dashboard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="graveyard"
        listeners={{ tabPress: onTabPress }}
        options={{
          title: 'Graveyard',
          tabBarIcon: ({ color, size }) => <AppIcon name="graveyard" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="auditor"
        listeners={{ tabPress: onTabPress }}
        options={{
          title: 'Auditor',
          tabBarIcon: ({ color, size }) => <AppIcon name="auditor" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        listeners={{ tabPress: onTabPress }}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <AppIcon name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
