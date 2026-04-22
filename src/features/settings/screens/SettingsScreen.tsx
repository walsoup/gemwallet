import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';

import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useBouncyPress } from '../../../hooks/useBouncyPress';

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
      style={{ flexGrow: 1 }}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

function TonalToggle({
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
      <View style={{ width: 160 }}>
        <View style={[styles.toggleShell, { borderColor: theme.colors.outlineVariant }]}>
          {(['off', 'on'] as const).map((key) => {
            const active = (value && key === 'on') || (!value && key === 'off');
            return (
              <BouncyPressable
                key={key}
                onPress={() => onChange(key === 'on')}
                scaleDown={0.9}
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: active ? theme.colors.secondaryContainer : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : 'transparent',
                  },
                ]}
              >
                <Text
                  variant="labelLarge"
                  style={{
                    color: active ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant,
                    fontWeight: '800',
                  }}
                >
                  {key === 'on' ? 'On' : 'Off'}
                </Text>
              </BouncyPressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function BouncyButton({
  haptic = 'medium',
  children,
  ...props
}: React.ComponentProps<typeof Button> & { haptic?: HapticWeight }) {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(0.94);
  return (
    <Animated.View style={animatedStyle}>
      <Button
        {...props}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={(...args) => {
          triggerHaptic(haptic);
          props.onPress?.(...args);
        }}
      >
        {children}
      </Button>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const theme = useAppTheme();
  const [exportPreview, setExportPreview] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showHfToken, setShowHfToken] = useState(false);
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const themeSegmentBounce = useBouncyPress(0.94);
  const aiSegmentBounce = useBouncyPress(0.94);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surfaceContainerLowest }}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            backgroundColor: theme.colors.surfaceContainerLowest,
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
            <BouncyPressable onPress={() => {}} scaleDown={0.94} style={{ flexGrow: 0 }}>
              <Chip mode="flat" style={{ backgroundColor: theme.colors.surface }} textStyle={{ color: theme.colors.onSurface }}>
                {currencyCode} • {region}
              </Chip>
            </BouncyPressable>
            <BouncyPressable onPress={() => {}} scaleDown={0.94} style={{ flexGrow: 0 }}>
              <Chip
                mode="flat"
                style={{ backgroundColor: theme.colors.surface }}
                textStyle={{ color: theme.colors.onSurface }}
              >
                Theme: {themePreference}
              </Chip>
            </BouncyPressable>
            <BouncyPressable onPress={() => {}} scaleDown={0.94} style={{ flexGrow: 0 }}>
              <Chip
                mode="flat"
                style={{ backgroundColor: theme.colors.surface }}
                textStyle={{ color: theme.colors.onSurface }}
                icon={secureAccessEnabled ? 'shield-check' : 'shield-off'}
              >
                {secureAccessEnabled ? 'Secure access' : 'Unlocked'}
              </Chip>
            </BouncyPressable>
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 30 }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Appearance"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  Primary color
                </Text>
                <TextInput
                  mode="outlined"
                  value={themePrimary}
                  onChangeText={(val) => setThemePrimary(val)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="#ff6b6b"
                  left={<TextInput.Icon icon="palette" />}
                />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  Secondary color
                </Text>
                <TextInput
                  mode="outlined"
                  value={themeSecondary}
                  onChangeText={(val) => setThemeSecondary(val)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="#52dea2"
                  left={<TextInput.Icon icon="palette-swatch" />}
                />
              </View>
            </View>

            <Animated.View style={themeSegmentBounce.animatedStyle}>
              <SegmentedButtons
                value={themePreference}
                onValueChange={(value) => {
                  triggerHaptic('medium');
                  setThemePreference(value as 'system' | 'light' | 'dark');
                }}
                buttons={[
                  { label: 'System', value: 'system' },
                  { label: 'Light', value: 'light' },
                  { label: 'Dark', value: 'dark' },
                ]}
                style={{ borderRadius: 18 }}
              />
            </Animated.View>
            <TonalToggle
              label="OLED true black"
              description="Use pure black backgrounds on OLED displays."
              value={oledTrueBlackEnabled}
              onChange={(next) => {
                triggerHaptic('medium');
                setOledTrueBlackEnabled(next);
              }}
            />
            <TonalToggle
              label="High contrast mode"
              description="Increase outline contrast for legibility."
              value={highContrastEnabled}
              onChange={(next) => {
                triggerHaptic('medium');
                setHighContrastEnabled(next);
              }}
            />
          </Card.Content>
        </Card>

        {/* AI Configuration Card */}
        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 30 }}
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
            <Animated.View style={aiSegmentBounce.animatedStyle}>
              <SegmentedButtons
                value={aiProvider}
                onValueChange={(value) => {
                  triggerHaptic('medium');
                  setAiProvider(value as 'google' | 'huggingface');
                }}
                buttons={[
                  { label: 'Google API', value: 'google' },
                  { label: 'HF API', value: 'huggingface' },
                ]}
              />
            </Animated.View>
            
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
                      accessibilityLabel={showApiKey ? 'Hide Gemini API key' : 'Show Gemini API key'}
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
                      accessibilityLabel={showHfToken ? 'Hide HuggingFace token' : 'Show HuggingFace token'}
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

            <Divider />

            <TonalToggle
              label="Smart Categorization"
              description="Use AI to automatically suggest categories for manual entries."
              value={smartCategorizationEnabled}
              onChange={(next) => {
                triggerHaptic('medium');
                setSmartCategorizationEnabled(next);
              }}
            />

            <TonalToggle
              label="Advanced summaries"
              description="Get deeper recommendations, trends, and next steps."
              value={advancedSummariesEnabled}
              onChange={(next) => {
                triggerHaptic('medium');
                setAdvancedSummariesEnabled(next);
              }}
            />
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 30 }}
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
                <BouncyPressable
                  key={option.code}
                  onPress={() => setLanguage(option.code)}
                  scaleDown={0.9}
                  style={{ flexGrow: 0 }}
                >
                  <Chip
                    mode="outlined"
                    selected={language === option.code}
                    selectedColor={theme.colors.onSecondaryContainer}
                    style={{
                      backgroundColor:
                        language === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                    }}
                  >
                    {option.label}
                  </Chip>
                </BouncyPressable>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Currency
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {currencyOptions.map((option) => (
                <BouncyPressable
                  key={option.code}
                  onPress={() => setCurrencyCode(option.code)}
                  scaleDown={0.9}
                  style={{ flexGrow: 0 }}
                >
                  <Chip
                    mode="outlined"
                    selected={currencyCode === option.code}
                    selectedColor={theme.colors.onSecondaryContainer}
                    style={{
                      backgroundColor:
                        currencyCode === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                    }}
                  >
                    {option.label}
                  </Chip>
                </BouncyPressable>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Region
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {regionOptions.map((option) => (
                <BouncyPressable
                  key={option.code}
                  onPress={() => setRegion(option.code)}
                  scaleDown={0.9}
                  style={{ flexGrow: 0 }}
                >
                  <Chip
                    mode="outlined"
                    selected={region === option.code}
                    selectedColor={theme.colors.onSecondaryContainer}
                    style={{
                      backgroundColor:
                        region === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                    }}
                  >
                    {option.label}
                  </Chip>
                </BouncyPressable>
              ))}
            </View>
            <Divider />
            <TonalToggle
              label="Include notes in CSV"
              description="Keep memo fields when exporting transactions."
              value={includeNotesInExport}
              onChange={(next) => {
                triggerHaptic('medium');
                setIncludeNotesInExport(next);
              }}
            />
            <BouncyButton
              mode="outlined"
              onPress={async () => {
                setExportPreview(exportRows);
                await Haptics.selectionAsync();
              }}
            >
              Generate local CSV preview
            </BouncyButton>
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
          style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 30 }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Backup & Security"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 12 }}>
            <TonalToggle
              label="Secure app access"
              description="Require a device lock or biometric check before opening."
              value={secureAccessEnabled}
              onChange={(next) => {
                triggerHaptic('medium');
                setSecureAccessEnabled(next);
              }}
            />
            <Divider />
            <TonalToggle
              label="Local passcode lock"
              description="Gate the app with a PIN stored only on-device."
              value={passcodeEnabled}
              onChange={(enabled) => {
                triggerHaptic('medium');
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
              }}
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
            <BouncyButton mode="contained" onPress={handleSavePasscode} disabled={passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm}>
              Save passcode
            </BouncyButton>
            <Divider />
            
            <BouncyButton
              mode="contained"
              buttonColor={theme.colors.errorContainer}
              textColor={theme.colors.onErrorContainer}
              haptic="heavy"
              onPress={async () => {
                clearAllData();
                resetSettings();
                setExportPreview('');
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }}
            >
              Reset all local wallet data
            </BouncyButton>
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
    borderRadius: 32,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleShell: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 22,
    padding: 4,
    gap: 6,
  },
  togglePill: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
