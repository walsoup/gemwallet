import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Divider,
  IconButton,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { useSettingsStore } from '../store/useSettingsStore';
import { useTransactionStore } from '../store/useTransactionStore';

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🧩');
  const [exportPreview, setExportPreview] = useState('');

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);
  const clearAllData = useTransactionStore((state) => state.clearAllData);

  const exportRows = useMemo(() => {
    const byId = new Map(categories.map((item) => [item.id, item]));
    const header = 'Transaction ID,Date,Time,Type,Category,Item Name,Amount,Currency';
    const lines = transactions.map((item) => {
      const date = new Date(item.timestamp);
      const category = byId.get(item.categoryId);
      const iso = date.toISOString();
      const [day, timeWithZone] = iso.split('T');
      const time = timeWithZone?.slice(0, 8) ?? '';
      const label = category ? `${category.emoji} ${category.name}` : 'Uncategorized';
      const note = (item.note ?? '').replaceAll('"', '""');

      return [
        item.id,
        day,
        time,
        item.type.toUpperCase(),
        `"${label}"`,
        `"${note}"`,
        formatCurrency(item.amountCents),
        'USD',
      ].join(',');
    });

    return [header, ...lines].join('\n');
  }, [categories, transactions]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
            Settings
          </Text>
        </View>

        <Card mode="contained">
          <Card.Title title="Theme" />
          <Card.Content style={{ gap: 12 }}>
            <SegmentedButtons
              value={themePreference}
              onValueChange={(value) => setThemePreference(value as 'system' | 'light' | 'dark')}
              buttons={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">OLED true black</Text>
              <Switch value={oledTrueBlackEnabled} onValueChange={setOledTrueBlackEnabled} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">High contrast mode</Text>
              <Switch value={highContrastEnabled} onValueChange={setHighContrastEnabled} />
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Title title="Security" />
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="bodyLarge">Secure app access</Text>
              <Switch value={secureAccessEnabled} onValueChange={setSecureAccessEnabled} />
            </View>
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Title title="Category management" />
          <Card.Content style={{ gap: 10 }}>
            <TextInput
              mode="outlined"
              label="Category name (max 14)"
              value={categoryName}
              onChangeText={setCategoryName}
              maxLength={14}
            />
            <TextInput
              mode="outlined"
              label="Emoji"
              value={categoryEmoji}
              onChangeText={setCategoryEmoji}
              maxLength={2}
            />
            <Button
              mode="contained"
              onPress={async () => {
                addCustomCategory({ name: categoryName, emoji: categoryEmoji });
                setCategoryName('');
                setCategoryEmoji('🧩');
                await Haptics.selectionAsync();
              }}
            >
              Create category
            </Button>
            <Divider />
            {categories
              .filter((item) => item.kind === 'expense')
              .map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <Text variant="bodyLarge">
                    {item.emoji} {item.name}
                  </Text>
                  {!item.isLocked ? (
                    <IconButton icon="delete-outline" accessibilityLabel="Delete category" onPress={() => deleteCategory(item.id)} />
                  ) : (
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      locked
                    </Text>
                  )}
                </View>
              ))}
          </Card.Content>
        </Card>

        <Card mode="contained">
          <Card.Title title="Data export" />
          <Card.Content style={{ gap: 12 }}>
            <Button
              mode="outlined"
              onPress={async () => {
                setExportPreview(exportRows);
                await Haptics.selectionAsync();
              }}
            >
              Generate local CSV preview
            </Button>
            {exportPreview ? (
              <Text variant="bodySmall" selectable style={{ color: theme.colors.onSurface }}>
                {exportPreview}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={theme.colors.errorContainer}
          textColor={theme.colors.onErrorContainer}
          onPress={async () => {
            clearAllData();
            resetSettings();
            setExportPreview('');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }}
        >
          Reset all local wallet data
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
