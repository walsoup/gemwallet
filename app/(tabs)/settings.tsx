import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Alert, LayoutAnimation, Platform, SectionList, UIManager, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, List, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';

import { AppIcon } from '../../components/AppIcon';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTransactionStore } from '../../store/useTransactionStore';

const APP_VERSION = 'v1.0.0';

type SectionItem = 'api' | 'theme' | 'data' | 'about';

type SettingsSection = {
  title: string;
  data: SectionItem[];
};

export default function SettingsScreen() {
  const theme = useTheme();
  const [exportData, setExportData] = useState('');

  const gemmaApiKey = useSettingsStore((state) => state.gemmaApiKey);
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setGemmaApiKey = useSettingsStore((state) => state.setGemmaApiKey);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const transactions = useTransactionStore((state) => state.transactions);
  const clearTransactions = useTransactionStore((state) => state.clearTransactions);

  const sections = useMemo<SettingsSection[]>(
    () => [
      { title: 'Artificial Intelligence', data: ['api'] },
      { title: 'Appearance & Display', data: ['theme'] },
      { title: 'Data Management', data: ['data'] },
      { title: 'About', data: ['about'] },
    ],
    []
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const onSaveApiKey = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGemmaApiKey(gemmaApiKey.trim());
  };

  const onThemeChange = async (value: string) => {
    await Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThemePreference(value as 'system' | 'light' | 'dark');
  };

  const onExportData = async () => {
    await Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExportData(JSON.stringify(transactions, null, 2));
  };

  const onClearData = () => {
    Alert.alert('Clear all local data?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          clearTransactions();
          resetSettings();
          setExportData('');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderSectionHeader={({ section }) => (
          <List.Section style={{ marginBottom: 8 }}>
            <List.Subheader style={{ color: theme.colors.onSurfaceVariant }}>{section.title}</List.Subheader>
          </List.Section>
        )}
        renderItem={({ item }) => {
          if (item === 'api') {
            return (
              <View style={{ marginBottom: 20, gap: 10 }}>
                <List.Item
                  title="Gemini API Key"
                  description="Stored locally for on-device audit requests"
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  left={() => <AppIcon name="auditor" color={theme.colors.onSurfaceVariant} size={20} />}
                />
                <TextInput
                  mode="outlined"
                  secureTextEntry
                  value={gemmaApiKey}
                  onChangeText={setGemmaApiKey}
                  placeholder="Enter API key"
                />
                <Button mode="contained" onPress={onSaveApiKey}>
                  Save API Key
                </Button>
              </View>
            );
          }

          if (item === 'theme') {
            return (
              <View style={{ marginBottom: 20, gap: 10 }}>
                <List.Item
                  title="Theme Override"
                  description="System, Light, or Dark"
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  left={() => <AppIcon name="dashboard" color={theme.colors.onSurfaceVariant} size={20} />}
                />
                <SegmentedButtons
                  value={themePreference}
                  onValueChange={onThemeChange}
                  buttons={[
                    { label: 'System', value: 'system' },
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                  ]}
                />
              </View>
            );
          }

          if (item === 'data') {
            return (
              <View style={{ marginBottom: 20, gap: 10 }}>
                <List.Item
                  title="Data Management"
                  description="Export or clear local records"
                  titleStyle={{ color: theme.colors.onSurface }}
                  descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                  left={() => <AppIcon name="settings" color={theme.colors.onSurfaceVariant} size={20} />}
                />
                <Button mode="outlined" onPress={onExportData}>
                  Export Data
                </Button>
                <Button mode="contained" buttonColor={theme.colors.errorContainer} onPress={onClearData}>
                  Clear All Local Data
                </Button>
                {exportData ? (
                  <Card mode="contained">
                    <Card.Content>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }} selectable>
                        {exportData}
                      </Text>
                    </Card.Content>
                  </Card>
                ) : null}
              </View>
            );
          }

          return (
            <List.Item
              title="GemWallet"
              description={`App version ${APP_VERSION}`}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={() => <AppIcon name="settings" color={theme.colors.onSurfaceVariant} size={20} />}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}
