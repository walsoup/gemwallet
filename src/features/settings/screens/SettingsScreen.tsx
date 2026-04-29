import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  Divider,
  HelperText,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';

import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useBouncyPress } from '../../../hooks/useBouncyPress';
import {
  DEFAULT_LITERT_MODEL_ID,
  LITERT_MODELS,
  downloadLiteRtModel,
  getLiteRtModel,
  isLiteRtModelCached,
} from '../../nlp/services/liteRtModels';

const currencyOptions = [
  { code: 'USD', label: 'USD' },
  { code: 'EUR', label: 'EUR' },
  { code: 'GBP', label: 'GBP' },
  { code: 'JPY', label: 'JPY' },
  { code: 'AUD', label: 'AUD' },
  { code: 'CAD', label: 'CAD' },
  { code: 'MAD', label: 'MAD' },
] as const;

const languageOptions = [
  { code: 'en-US', label: 'English' },
  { code: 'en-GB', label: 'UK English' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
] as const;

const regionOptions = [
  { code: 'US', label: 'US' },
  { code: 'EU', label: 'EU' },
  { code: 'UK', label: 'UK' },
  { code: 'JP', label: 'JP' },
  { code: 'AU', label: 'AU' },
  { code: 'CA', label: 'CA' },
  { code: 'MA', label: 'MA' },
] as const;

type HapticWeight = 'light' | 'medium' | 'heavy';

function triggerHaptic(weight: HapticWeight = 'medium') {
  const style =
    weight === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : weight === 'light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

function BouncyPressable({
  children,
  onPress,
  scaleDown = 0.92,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scaleDown?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(scaleDown);
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        triggerHaptic('medium');
        onPress?.();
      }}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Surface style={[styles.sectionCard, { backgroundColor: theme.colors.surfaceContainerHigh }]} elevation={3}>
      <View style={styles.sectionHeader}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '800', letterSpacing: -0.2 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 14 }}>{children}</View>
    </Surface>
  );
}

function OptionChipRow<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly { code: T; label: string }[];
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option.code === value;
        return (
          <BouncyPressable
            key={option.code}
            onPress={() => onChange(option.code)}
            scaleDown={0.94}
            style={[
              styles.choiceChip,
              {
                backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surfaceContainer,
                borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
              },
            ]}
          >
            <Text
              variant="labelLarge"
              style={{ color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant, fontWeight: '800' }}
            >
              {option.label}
            </Text>
          </BouncyPressable>
        );
      })}
    </View>
  );
}

function SelectableModelCard({
  modelId,
  selected,
  downloaded,
  onSelect,
}: {
  modelId: string;
  selected: boolean;
  downloaded: boolean;
  onSelect: () => void;
}) {
  const theme = useAppTheme();
  const model = getLiteRtModel(modelId);

  return (
    <BouncyPressable
      onPress={onSelect}
      scaleDown={0.96}
      style={[
        styles.modelCard,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surfaceContainer,
          borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.modelCardTopRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="titleMedium" style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface, fontWeight: '800' }}>
            {model.label}
          </Text>
          <Text variant="bodySmall" style={{ color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }}>
            {model.description}
          </Text>
        </View>
        <Chip compact style={{ backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surface }} textStyle={{ color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }}>
          {model.sizeLabel}
        </Chip>
      </View>
      <View style={styles.modelMetaRow}>
        <Chip compact icon={downloaded ? 'check' : 'download'} style={{ backgroundColor: selected ? theme.colors.surface : theme.colors.surfaceContainerHigh }} textStyle={{ color: selected ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
          {downloaded ? 'Downloaded' : 'Not downloaded'}
        </Chip>
        <Chip compact style={{ backgroundColor: selected ? theme.colors.surface : theme.colors.surfaceContainerHigh }} textStyle={{ color: selected ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}>
          {model.fileName}
        </Chip>
      </View>
    </BouncyPressable>
  );
}

export default function SettingsScreen() {
  const theme = useAppTheme();
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);
  const [showHfToken, setShowHfToken] = useState(false);
  const [exportPreview, setExportPreview] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [downloadError, setDownloadError] = useState('');

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const themePrimary = useSettingsStore((state) => state.themePrimary);
  const themeSecondary = useSettingsStore((state) => state.themeSecondary);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const huggingFaceToken = useSettingsStore((state) => state.huggingFaceToken);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const localModelId = useSettingsStore((state) => state.localModelId);
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
  const setThemePrimary = useSettingsStore((state) => state.setThemePrimary);
  const setThemeSecondary = useSettingsStore((state) => state.setThemeSecondary);
  const setCurrencyCode = useSettingsStore((state) => state.setCurrencyCode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setRegion = useSettingsStore((state) => state.setRegion);
  const setAiProvider = useSettingsStore((state) => state.setAiProvider);
  const setGeminiApiKey = useSettingsStore((state) => state.setGeminiApiKey);
  const setHuggingFaceToken = useSettingsStore((state) => state.setHuggingFaceToken);
  const setGemmaModel = useSettingsStore((state) => state.setGemmaModel);
  const setLocalModelId = useSettingsStore((state) => state.setLocalModelId);
  const setLocalModelDownloaded = useSettingsStore((state) => state.setLocalModelDownloaded);
  const setSmartCategorizationEnabled = useSettingsStore((state) => state.setSmartCategorizationEnabled);
  const setAdvancedSummariesEnabled = useSettingsStore((state) => state.setAdvancedSummariesEnabled);
  const setIncludeNotesInExport = useSettingsStore((state) => state.setIncludeNotesInExport);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const clearAllData = useTransactionStore((state) => state.clearAllData);

  const locale = language || 'en-US';
  const localeSummary = useMemo(() => `${currencyCode} • ${language || 'system'} • ${region}`, [currencyCode, language, region]);
  const formattedBalanceSample = useMemo(() => formatCurrency(125000, { currencyCode, locale }), [currencyCode, locale]);

  const exportRows = useMemo(() => {
    const byId = new Map(categories.map((item) => [item.id, item]));
    const dateFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const header = includeNotesInExport
      ? ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Note', 'Amount', 'Currency', 'Region']
      : ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Amount', 'Currency', 'Region'];

    const lines = transactions.map((item) => {
      const date = new Date(item.timestamp);
      const category = byId.get(item.categoryId);
      const label = category ? `${category.emoji} ${category.name}` : 'Uncategorized';
      const note = (item.note ?? '').replaceAll('"', '""');
      const amount = formatCurrency(item.amountCents, { currencyCode, locale });

      const columns = [item.id, dateFormatter.format(date), timeFormatter.format(date), item.type.toUpperCase(), `"${label}"`];

      if (includeNotesInExport) {
        columns.push(`"${note}"`);
      }

      columns.push(`"${amount}"`, currencyCode, region);
      return columns.join(',');
    });

    return [header.join(','), ...lines].join('\n');
  }, [categories, currencyCode, includeNotesInExport, locale, region, transactions]);

  useEffect(() => {
    setExportPreview(exportRows.slice(0, 1200));
  }, [exportRows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await isLiteRtModelCached(localModelId || DEFAULT_LITERT_MODEL_ID);
        if (cancelled) return;
        if (cached) {
          setLocalModelDownloaded(true);
          setDownloadStatus('ready');
        }
      } catch {
        if (!cancelled) {
          setDownloadStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localModelId, setLocalModelDownloaded]);

  const startLiteRtDownload = async () => {
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    setDownloadError('');

    try {
      await downloadLiteRtModel(localModelId || DEFAULT_LITERT_MODEL_ID, setDownloadProgress);
      setLocalModelDownloaded(true);
      setDownloadStatus('ready');
    } catch (error) {
      setDownloadStatus('error');
      setDownloadError(error instanceof Error ? error.message : 'LiteRT download failed.');
    }
  };

  const confirmReset = () => {
    Alert.alert('Reset everything?', 'This clears all wallet data and restores the default settings.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('heavy');
          clearAllData();
          resetSettings();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Surface style={[styles.heroShell, { backgroundColor: theme.colors.surfaceContainerHigh }]} elevation={4}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '900', letterSpacing: -0.4 }}>
                Control center
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                One place for appearance, AI, offline Gemma, locale, and security.
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: '800' }}>{formattedBalanceSample}</Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                Sample format
              </Text>
            </View>
          </View>

          <View style={styles.heroChips}>
            <Chip compact style={{ backgroundColor: theme.colors.secondaryContainer }} textStyle={{ color: theme.colors.onSecondaryContainer }}>
              {localeSummary}
            </Chip>
            <Chip compact style={{ backgroundColor: theme.colors.surface }} textStyle={{ color: theme.colors.onSurface }}>
              {smartCategorizationEnabled ? 'Smart rules on' : 'Smart rules off'}
            </Chip>
            <Chip compact style={{ backgroundColor: theme.colors.surface }} textStyle={{ color: theme.colors.onSurface }}>
              {advancedSummariesEnabled ? 'Advanced AI on' : 'Advanced AI off'}
            </Chip>
          </View>
        </Surface>

        <SectionCard title="Appearance" subtitle="Keep the app warm, high-contrast, or true black.">
          <SegmentedButtons
            value={themePreference}
            onValueChange={(next) => {
              triggerHaptic('light');
              setThemePreference(next as 'system' | 'light' | 'dark');
            }}
            buttons={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />

          <View style={styles.toggleRows}>
            <ToggleRow
              label="OLED true black"
              description="Push dark surfaces all the way down to black."
              value={oledTrueBlackEnabled}
              onChange={setOledTrueBlackEnabled}
            />
            <ToggleRow
              label="High contrast"
              description="Boost separators and text contrast for readability."
              value={highContrastEnabled}
              onChange={setHighContrastEnabled}
            />
            <View style={styles.colorRow}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                Accent colors
              </Text>
              <TextInput
                mode="outlined"
                label="Primary"
                value={themePrimary}
                onChangeText={setThemePrimary}
                style={styles.colorInput}
              />
              <TextInput
                mode="outlined"
                label="Secondary"
                value={themeSecondary}
                onChangeText={setThemeSecondary}
                style={styles.colorInput}
              />
            </View>
          </View>
        </SectionCard>

        <SectionCard title="AI Provider" subtitle="Choose the cloud backend that powers assistant features.">
          <SegmentedButtons
            value={aiProvider}
            onValueChange={(next) => {
              triggerHaptic('light');
              setAiProvider(next as 'google' | 'huggingface');
            }}
            buttons={[
              { value: 'google', label: 'Google' },
              { value: 'huggingface', label: 'Hugging Face' },
            ]}
          />

          {aiProvider === 'google' ? (
            <View style={{ gap: 10 }}>
              <TextInput
                mode="outlined"
                label="Gemini API key"
                value={geminiApiKey}
                secureTextEntry={!showGeminiApiKey}
                autoCapitalize="none"
                onChangeText={setGeminiApiKey}
                right={
                  <TextInput.Icon
                    icon={showGeminiApiKey ? 'eye-off' : 'eye'}
                    accessibilityLabel={showGeminiApiKey ? 'Hide Gemini API Key' : 'Show Gemini API Key'}
                    onPress={() => setShowGeminiApiKey((current) => !current)}
                  />
                }
              />
              <HelperText type="info" visible>
                The key stays on device. It is only used when Google AI is selected.
              </HelperText>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <TextInput
                mode="outlined"
                label="Hugging Face token"
                value={huggingFaceToken}
                secureTextEntry={!showHfToken}
                autoCapitalize="none"
                onChangeText={setHuggingFaceToken}
                right={
                  <TextInput.Icon
                    icon={showHfToken ? 'eye-off' : 'eye'}
                    accessibilityLabel={showHfToken ? 'Hide Hugging Face token' : 'Show Hugging Face token'}
                    onPress={() => setShowHfToken((current) => !current)}
                  />
                }
              />
              <TextInput
                mode="outlined"
                label="Cloud Gemma model"
                value={gemmaModel}
                onChangeText={setGemmaModel}
                autoCapitalize="none"
              />
              <HelperText type="info" visible>
                Hugging Face unlocks Gemma-hosted prompts and model variants.
              </HelperText>
            </View>
          )}
        </SectionCard>

        <SectionCard title="LiteRT Gemma" subtitle="Download the on-device model and keep it ready offline.">
          <View style={{ gap: 12 }}>
            {LITERT_MODELS.map((model) => (
              <SelectableModelCard
                key={model.id}
                modelId={model.id}
                selected={localModelId === model.id}
                downloaded={localModelDownloaded && localModelId === model.id}
                onSelect={() => {
                  triggerHaptic('light');
                  setLocalModelId(model.id);
                }}
              />
            ))}
          </View>

          <View style={styles.downloadPanel}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
                {getLiteRtModel(localModelId || DEFAULT_LITERT_MODEL_ID).label}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Downloads into the app sandbox so the runtime can load it without asking the user again.
              </Text>
            </View>
            <Chip compact icon={localModelDownloaded ? 'check' : 'download'} style={{ backgroundColor: theme.colors.surface }} textStyle={{ color: theme.colors.onSurface }}>
              {localModelDownloaded ? 'Ready' : 'Offline not ready'}
            </Chip>
          </View>

          {downloadStatus === 'downloading' ? (
            <View style={{ gap: 8 }}>
              <ProgressBar progress={downloadProgress} color={theme.colors.primary} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Downloading {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          ) : null}

          {downloadStatus === 'error' && downloadError ? (
            <HelperText type="error" visible>
              {downloadError}
            </HelperText>
          ) : null}

          <BouncyPressable
            onPress={() => {
              triggerHaptic('medium');
              void startLiteRtDownload();
            }}
            scaleDown={0.94}
            style={[styles.primaryAction, { backgroundColor: theme.colors.primaryContainer }]}
          >
            <Text style={{ color: theme.colors.onPrimaryContainer, fontWeight: '900' }}>
              {localModelDownloaded ? 'Refresh LiteRT download' : 'Download LiteRT Gemma'}
            </Text>
          </BouncyPressable>
        </SectionCard>

        <SectionCard title="Locale" subtitle="Match formats to the region you work in.">
          <View style={{ gap: 12 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Currency
            </Text>
            <OptionChipRow value={currencyCode} onChange={setCurrencyCode} options={currencyOptions} />

            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Language
            </Text>
            <OptionChipRow value={language || 'en-US'} onChange={setLanguage} options={languageOptions} />

            <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              Region
            </Text>
            <OptionChipRow value={region} onChange={setRegion} options={regionOptions} />
          </View>
        </SectionCard>

        <SectionCard title="Data and security" subtitle="Protect access and control how exports behave.">
          <ToggleRow
            label="Secure access"
            description="Require the app to re-authenticate before revealing sensitive screens."
            value={secureAccessEnabled}
            onChange={setSecureAccessEnabled}
          />
          <ToggleRow
            label="Passcode lock"
            description="Require a passcode before the home wallet can open."
            value={passcodeEnabled}
            onChange={(next) => {
              setPasscodeEnabled(next);
              if (!next) {
                setPasscodePin('');
              }
            }}
          />
          <ToggleRow
            label="Smart categorization"
            description="Let the app classify transactions automatically when possible."
            value={smartCategorizationEnabled}
            onChange={setSmartCategorizationEnabled}
          />
          <ToggleRow
            label="Advanced summaries"
            description="Allow richer AI explanations and recommendations."
            value={advancedSummariesEnabled}
            onChange={setAdvancedSummariesEnabled}
          />
          <ToggleRow
            label="Include notes in export"
            description="Add memo fields to CSV exports."
            value={includeNotesInExport}
            onChange={setIncludeNotesInExport}
          />

          <Divider />

          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
            Export preview
          </Text>
          <TextInput
            mode="outlined"
            multiline
            numberOfLines={8}
            value={exportPreview}
            editable={false}
            style={styles.previewBox}
          />

          <View style={styles.actionRow}>
            <Button mode="outlined" onPress={confirmReset}>
              Reset all data
            </Button>
          </View>
        </SectionCard>

        <View style={styles.footerNote}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            The UI now emphasizes the controls you actually use instead of a long settings wall.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {label}
        </Text>
        {description ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        ) : null}
      </View>
      <BouncyPressable
        onPress={() => onChange(!value)}
        scaleDown={0.96}
        style={[
          styles.togglePill,
          {
            backgroundColor: value ? theme.colors.secondaryContainer : theme.colors.surfaceContainer,
            borderColor: value ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        <Text variant="labelLarge" style={{ color: value ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant, fontWeight: '900' }}>
          {value ? 'On' : 'Off'}
        </Text>
      </BouncyPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroShell: {
    borderRadius: 28,
    padding: 18,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroBadge: {
    minWidth: 120,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionCard: {
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  sectionHeader: {
    gap: 2,
  },
  toggleRows: {
    gap: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  togglePill: {
    minWidth: 86,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  colorRow: {
    gap: 12,
  },
  colorInput: {
    backgroundColor: 'transparent',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modelCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 12,
  },
  modelCardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  downloadPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryAction: {
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  previewBox: {
    backgroundColor: 'transparent',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  footerNote: {
    paddingVertical: 8,
  },
});