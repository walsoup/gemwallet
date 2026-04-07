import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="graveyard"
        options={{
          title: 'Graveyard',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="skull" color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="auditor"
        options={{
          title: 'Auditor',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="emoticon-devil" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
