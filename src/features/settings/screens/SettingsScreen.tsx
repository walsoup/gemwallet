import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, List, Switch, useTheme, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);

  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);
  const setAiFeaturesEnabled = useSettingsStore((state) => state.setAiFeaturesEnabled);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Settings
        </Text>

        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="OLED True Black"
            description="Use pure black for dark theme backgrounds"
            right={() => (
              <Switch
                value={oledTrueBlackEnabled}
                onValueChange={(val) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setOledTrueBlackEnabled(val);
                }}
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>AI Features</List.Subheader>
          <List.Item
            title="Enable AI Assistant"
            description="Toggle AI features across the app"
            right={() => (
              <Switch
                value={aiFeaturesEnabled}
                onValueChange={(val) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setAiFeaturesEnabled(val);
                }}
              />
            )}
          />
        </List.Section>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
});
