import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  List,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  ProgressBar,
} from 'react-native-paper';

import { useSettingsStore } from '../../../../store/useSettingsStore';
import type { AiProvider } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatCurrency } from '../../../../utils/formatCurrency';

const currencyOptions = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'MAD', label: 'MAD (د.م.)' },
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
  { code: 'MA', label: 'Morocco' },
] as const;

export default function SettingsScreen() {
  const theme = useAppTheme();
  const downloadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [exportPreview, setExportPreview] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showHfToken, setShowHfToken] = useState(false);
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const huggingFaceToken = useSettingsStore((state) => state.huggingFaceToken);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const localModelDownloaded = useSettingsStore((state) => state.localModelDownloaded);

  const smartCategorizationEnabled = useSettingsStore((state) => state.smartCategorizationEnabled);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const includeNotesInExport = useSettingsStore((state) => state.includeNotesInExport);
  
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);
  const setPasscodeEnabled = useSettingsStore((state) => state.setPasscodeEnabled);
  const setPasscodePin = useSettingsStore((state) => state.setPasscodePin);
  const setCurrencyCode = useSettingsStore((state) => state.setCurrencyCode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setRegion = useSettingsStore((state) => state.setRegion);
  const setAiProvider = useSettingsStore((state) => state.setAiProvider);
  const setGeminiApiKey = useSettingsStore((state) => state.setGeminiApiKey);
  const setHuggingFaceToken = useSettingsStore((state) => state.setHuggingFaceToken);
  const setGemmaModel = useSettingsStore((state) => state.setGemmaModel);
  const setLocalModelDownloaded = useSettingsStore((state) => state.setLocalModelDownloaded);
  const setSmartCategorizationEnabled = useSettingsStore((state) => state.setSmartCategorizationEnabled);
  const setAdvancedSummariesEnabled = useSettingsStore((state) => state.setAdvancedSummariesEnabled);
  const setIncludeNotesInExport = useSettingsStore((state) => state.setIncludeNotesInExport);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const locale = language || 'en-US';

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
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

  const handleSavePasscode = () => {
    if (passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm) {
      setPasscodeEnabled(false);
      return;
    }
    setPasscodePin(passcodeDraft);
    setPasscodeEnabled(true);
    setPasscodeDraft('');
    setPasscodeConfirm('');
  };

  const handleSimulateDownload = () => {
    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = null;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    downloadIntervalRef.current = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 1) {
          if (downloadIntervalRef.current) {
            clearInterval(downloadIntervalRef.current);
            downloadIntervalRef.current = null;
          }
          setIsDownloading(false);
          setLocalModelDownloaded(true);
          return 1;
        }
        return prev + 0.1;
      });
    }, 500);
  };

  const handleDeleteLocalModel = () => {
    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = null;
    }

    setIsDownloading(false);
    setLocalModelDownloaded(false);
    setDownloadProgress(0);
  };

  useEffect(() => {
    return () => {
      if (downloadIntervalRef.current) {
        clearInterval(downloadIntervalRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
            Settings
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Tune your wallet visuals, privacy, and intelligence.
          </Text>
        </View>

        <Card
          mode="contained"
          style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}
          contentStyle={{ gap: 10, paddingVertical: 14 }}
        >
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Control center
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Offline-first, local-only. Quick glance at your current preferences.
            </Text>
          </Card.Content>
          <Card.Content style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip mode="flat" style={{ backgroundColor: theme.colors.surface }} textStyle={{ color: theme.colors.onSurface }}>
              {currencyCode} • {region}
            </Chip>
            <Chip
              mode="flat"
              style={{ backgroundColor: theme.colors.surface }}
              textStyle={{ color: theme.colors.onSurface }}
            >
              Theme: {themePreference}
            </Chip>
            <Chip
              mode="flat"
              style={{ backgroundColor: theme.colors.surface }}
              textStyle={{ color: theme.colors.onSurface }}
              icon={secureAccessEnabled ? 'shield-check' : 'shield-off'}
            >
              {secureAccessEnabled ? 'Secure access' : 'Unlocked'}
            </Chip>
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Appearance"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
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

        {/* AI Configuration Card */}
        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="AI Intelligence"
            subtitle="Configure Gemma analysis and providers"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
            <SegmentedButtons
              value={aiProvider}
              onValueChange={(value) => setAiProvider(value as AiProvider)}
              buttons={[
                { label: 'Google API', value: 'google' },
                { label: 'HF API', value: 'huggingface' },
                { label: 'Local Device', value: 'local' },
              ]}
            />
            
            {aiProvider === 'google' && (
              <View style={{ gap: 12 }}>
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
                  Uses the @google/generative-ai SDK. Your key is stored locally.
                </HelperText>
              </View>
            )}

            {aiProvider === 'huggingface' && (
              <View style={{ gap: 12 }}>
                <TextInput
                  mode="outlined"
                  label="HuggingFace Token"
                  placeholder="hf_..."
                  value={huggingFaceToken}
                  secureTextEntry={!showHfToken}
                  onChangeText={setHuggingFaceToken}
                  autoCapitalize="none"
                  autoCorrect={false}
                  right={
                    <TextInput.Icon
                      icon={showHfToken ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowHfToken((prev) => !prev)}
                    />
                  }
                />
                <TextInput
                  mode="outlined"
                  label="Model ID"
                  placeholder="google/gemma-2-2b-it"
                  value={gemmaModel}
                  onChangeText={setGemmaModel}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <HelperText type="info" visible>
                  Uses the HuggingFace Inference API. Requires a valid token.
                </HelperText>
              </View>
            )}

            {aiProvider === 'local' && (
              <View style={{ gap: 12 }}>
                {!localModelDownloaded ? (
                  <>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      Download Qwen 1.5 0.5B (Quantized)
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Size: ~450MB. This model runs entirely on-device for maximum privacy.
                    </Text>
                    {isDownloading ? (
                      <View style={{ gap: 8 }}>
                        <ProgressBar progress={downloadProgress} color={theme.colors.primary} />
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'right' }}>
                          {Math.round(downloadProgress * 100)}%
                        </Text>
                      </View>
                    ) : (
                      <Button mode="contained" onPress={handleSimulateDownload} icon="download">
                        Download Model
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                      Local model is active.
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      All analysis will be performed on-device without network requests.
                    </Text>
                    <Button mode="outlined" onPress={handleDeleteLocalModel} textColor={theme.colors.error}>
                      Delete downloaded model
                    </Button>
                  </>
                )}
              </View>
            )}

            <Divider />

            <List.Item
              title="Smart Categorization"
              description="Use AI to automatically suggest categories for manual entries."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={smartCategorizationEnabled} onValueChange={setSmartCategorizationEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />

            <List.Item
              title="Advanced summaries"
              description="Get deeper recommendations, trends, and next steps."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => (
                <Switch value={advancedSummariesEnabled} onValueChange={setAdvancedSummariesEnabled} />
              )}
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
            title="Locale & Export"
            subtitle="Currency, language, and data management"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
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
            <Divider />
            <List.Item
              title="Include notes in CSV"
              description="Keep memo fields when exporting transactions."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={includeNotesInExport} onValueChange={setIncludeNotesInExport} />}
              style={{ paddingHorizontal: 0 }}
            />
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
            ) : null}
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Backup & Security"
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
              title="Local passcode lock"
              description="Gate the app with a PIN stored only on-device."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={passcodeEnabled} onValueChange={(enabled) => {
                if (!enabled) {
                  setPasscodeEnabled(false);
                  setPasscodePin('');
                  setPasscodeDraft('');
                  setPasscodeConfirm('');
                } else {
                  if (passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm) {
                    setPasscodeEnabled(false);
                  } else {
                    setPasscodePin(passcodeDraft);
                    setPasscodeEnabled(true);
                    setPasscodeDraft('');
                    setPasscodeConfirm('');
                  }
                }
              }} />}
              style={{ paddingHorizontal: 0 }}
            />
            {passcodeEnabled ? (
              <HelperText type="info" visible style={{ marginLeft: 0 }}>
                Passcode required on next app open.
              </HelperText>
            ) : null}
            <TextInput
              mode="outlined"
              label="New passcode"
              value={passcodeDraft}
              onChangeText={setPasscodeDraft}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TextInput
              mode="outlined"
              label="Confirm passcode"
              value={passcodeConfirm}
              onChangeText={setPasscodeConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <Button mode="contained" onPress={handleSavePasscode} disabled={passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm}>
              Save passcode
            </Button>
            <Divider />
            
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
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    gap: 4,
    paddingHorizontal: 4,
  },
  heroCard: {
    borderRadius: 20,
  },
});
