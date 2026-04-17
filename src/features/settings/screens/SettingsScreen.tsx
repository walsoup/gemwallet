import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  List,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatCurrency } from '../../../../utils/formatCurrency';

const currencyOptions = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' },
] as const;

const languageOptions = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
] as const;

const regionOptions = [
  { code: 'US', label: 'United States' },
  { code: 'EU', label: 'Europe' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'JP', label: 'Japan' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
] as const;

const modelOptions = [
  { value: 'gemma-4-31b-it', label: 'Gemma 4 31B (default)' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (fallback)' },
  { value: 'gemma-2-9b-it', label: 'Gemma 2 9B' },
] as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🧩');
  const [exportPreview, setExportPreview] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const includeNotesInExport = useSettingsStore((state) => state.includeNotesInExport);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);
  const setCurrencyCode = useSettingsStore((state) => state.setCurrencyCode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setRegion = useSettingsStore((state) => state.setRegion);
  const setGeminiApiKey = useSettingsStore((state) => state.setGeminiApiKey);
  const setGemmaModel = useSettingsStore((state) => state.setGemmaModel);
  const setAdvancedSummariesEnabled = useSettingsStore((state) => state.setAdvancedSummariesEnabled);
  const setIncludeNotesInExport = useSettingsStore((state) => state.setIncludeNotesInExport);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const locale = language || 'en-US';

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);
  const clearAllData = useTransactionStore((state) => state.clearAllData);

  const exportRows = useMemo(() => {
    const byId = new Map(categories.map((item) => [item.id, item]));
    const dateFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const headerColumns = includeNotesInExport
      ? ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Note', 'Amount', 'Currency', 'Region']
      : ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Amount', 'Currency', 'Region'];
    const header = headerColumns.join(',');

    const lines = transactions.map((item) => {
      const date = new Date(item.timestamp);
      const category = byId.get(item.categoryId);
      const label = category ? `${category.emoji} ${category.name}` : 'Uncategorized';
      const note = (item.note ?? '').replaceAll('"', '""');
      const amount = formatCurrency(item.amountCents, { currencyCode, locale });

      const columns = [
        item.id,
        dateFormatter.format(date),
        timeFormatter.format(date),
        item.type.toUpperCase(),
        `"${label}"`,
      ];

      if (includeNotesInExport) {
        columns.push(`"${note}"`);
      }

      columns.push(`"${amount}"`, currencyCode, region);

      return columns.join(',');
    });

    return [header, ...lines].join('\n');
  }, [categories, currencyCode, includeNotesInExport, locale, region, transactions]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
            Settings
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Material 3 expressive layout with tonal surfaces, dynamic color, and AI controls.
          </Text>
        </View>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Appearance"
            subtitle="Material Design 3 expressive surfaces"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
            <SegmentedButtons
              value={themePreference}
              onValueChange={(value) => setThemePreference(value as 'system' | 'light' | 'dark')}
              buttons={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
            <List.Item
              title="OLED true black"
              description="Use pure black backgrounds on OLED displays."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={oledTrueBlackEnabled} onValueChange={setOledTrueBlackEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            <List.Item
              title="High contrast mode"
              description="Increase outline contrast for legibility."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={highContrastEnabled} onValueChange={setHighContrastEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Gemma & Locale"
            subtitle="Connect Gemini API access and region defaults"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
            <TextInput
              mode="outlined"
              label="Gemini API key"
              placeholder="AIza..."
              value={geminiApiKey}
              secureTextEntry={!showApiKey}
              onChangeText={setGeminiApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              right={
                <TextInput.Icon
                  icon={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowApiKey((prev) => !prev)}
                />
              }
            />
            <HelperText type="info" visible>
              Stored locally and used only to call the Gemma model for insights.
            </HelperText>
            <SegmentedButtons
              value={gemmaModel}
              onValueChange={(value) => setGemmaModel(value)}
              buttons={modelOptions.map((option) => ({ label: option.label, value: option.value }))}
              density="regular"
            />
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Language
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {languageOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={language === option.code}
                  onPress={() => setLanguage(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      language === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Currency
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {currencyOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={currencyCode === option.code}
                  onPress={() => setCurrencyCode(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      currencyCode === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Region
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {regionOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={region === option.code}
                  onPress={() => setRegion(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      region === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Security & advanced"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 12 }}>
            <List.Item
              title="Secure app access"
              description="Require a device lock or biometric check before opening."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={secureAccessEnabled} onValueChange={setSecureAccessEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            <Divider />
            <List.Item
              title="Advanced Gemma summaries"
              description="Get deeper recommendations, trends, and next steps."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => (
                <Switch value={advancedSummariesEnabled} onValueChange={setAdvancedSummariesEnabled} />
              )}
              style={{ paddingHorizontal: 0 }}
            />
            <List.Item
              title="Include notes in CSV"
              description="Keep memo fields when exporting transactions."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={includeNotesInExport} onValueChange={setIncludeNotesInExport} />}
              style={{ paddingHorizontal: 0 }}
            />
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Category management"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 14 }}>
            <TextInput
              mode="outlined"
              label="Category name (max 14)"
              value={categoryName}
              onChangeText={setCategoryName}
              maxLength={14}
              placeholder="Snacks, Gym, Pets..."
            />
            <TextInput
              mode="outlined"
              label="Emoji"
              value={categoryEmoji}
              onChangeText={setCategoryEmoji}
              maxLength={2}
              placeholder="🧩"
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
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Expense categories
            </Text>
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
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    {item.emoji} {item.name}
                  </Text>
                  {!item.isLocked ? (
                    <IconButton icon="delete-outline" onPress={() => deleteCategory(item.id)} />
                  ) : (
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      locked
                    </Text>
                  )}
                </View>
              ))}
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Data export"
            subtitle="Generate a CSV preview without leaving the device"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 14 }}>
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
              <View
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 12,
                  padding: 12,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                }}
              >
                <Text variant="bodySmall" selectable style={{ color: theme.colors.onSurface }}>
                  {exportPreview}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Preview stays on-device. Use export after choosing your locale, currency, and region.
              </Text>
            )}
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
