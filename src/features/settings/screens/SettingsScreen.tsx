import React from 'react';
import { ScrollView, StyleSheet, View, Pressable, Switch, Alert } from 'react-native';
import { Text, useTheme, TextInput } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { downloadLiteRtModel, getLiteRtModel, isLiteRtModelCached } from '../../../features/nlp/services/liteRtModels';
import { getHuggingFaceToken } from '../../../../services/secureHuggingFaceToken';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import type { ThemePreference } from '../../../../types/finance';
import { formatAppCurrency } from '../../../../utils/currency';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Linking from 'expo-linking';
import appConfig from '../../../../app.json';
import { exportTransactionsCsv } from '../../../../utils/exportTransactionsCsv';
import { deleteGeminiApiKey, getGeminiApiKey, setGeminiApiKey } from '../../../../services/secureGeminiKey';
import { GoogleGenerativeAI } from '@google/generative-ai';

function mapGeminiConnectionError(error: unknown) {
  const message = typeof (error as { message?: unknown })?.message === 'string'
    ? (error as { message: string }).message.toLowerCase()
    : '';

  if (message.includes('api key') || message.includes('permission') || message.includes('unauthenticated')) {
    return 'Invalid API key.';
  }
  if (message.includes('quota') || message.includes('resource') || message.includes('rate')) {
    return 'Quota exceeded or resource unavailable.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'Network error.';
  }
  return 'Connection failed. Please try again.';
}

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const scrollRef = React.useRef<ScrollView>(null);
  const [aiSectionY, setAiSectionY] = React.useState<number | null>(null);

  const [cloudSyncPopupDismissed, setCloudSyncPopupDismissed] = React.useState(false);

  const localModelId = useSettingsStore((state) => state.localModelId);
  const localModelDownloaded = useSettingsStore((state) => state.localModelDownloaded);
  const setLocalModelDownloaded = useSettingsStore((state) => state.setLocalModelDownloaded);
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const setAiProvider = useSettingsStore((state) => state.setAiProvider);
  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);
  const setAiFeaturesEnabled = useSettingsStore((state) => state.setAiFeaturesEnabled);

  const [geminiKeyDraft, setGeminiKeyDraft] = React.useState('');
  const [geminiKeyVisible, setGeminiKeyVisible] = React.useState(false);
  const [geminiKeyTestStatus, setGeminiKeyTestStatus] = React.useState<null | {
    kind: 'success' | 'error';
    message: string;
  }>(null);
  const [localModelStatus, setLocalModelStatus] = React.useState<'checking' | 'ready' | 'missing'>('checking');
  const [localModelDownloadInFlight, setLocalModelDownloadInFlight] = React.useState(false);

  const customGreetingName = useSettingsStore((state) => state.customGreetingName);
  const setCustomGreetingName = useSettingsStore((state) => state.setCustomGreetingName);
  const [greetingDraft, setGreetingDraft] = React.useState(customGreetingName);

  React.useEffect(() => {
    return () => {
      setGeminiKeyDraft('');
      setGeminiKeyVisible(false);
      setGeminiKeyTestStatus(null);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const syncStatus = async () => {
      setLocalModelStatus('checking');
      try {
        const cached = await isLiteRtModelCached(localModelId);
        if (cancelled) return;
        setLocalModelDownloaded(cached);
        setLocalModelStatus(cached ? 'ready' : 'missing');
      } catch {
        if (cancelled) return;
        console.warn('Failed to check local model cache status');
        setLocalModelDownloaded(false);
        setLocalModelStatus('missing');
      }
    };

    syncStatus();
    return () => {
      cancelled = true;
    };
  }, [localModelId, setLocalModelDownloaded]);

  const selectedLocalModel = getLiteRtModel(localModelId);
  const localModelStatusText =
    localModelStatus === 'checking'
      ? 'Checking local model status…'
      : localModelDownloaded
        ? `Downloaded • ${selectedLocalModel.sizeLabel}`
        : `Not downloaded • ${selectedLocalModel.sizeLabel}`;

  const handleDownloadLocalModel = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalModelDownloadInFlight(true);
    setLocalModelStatus('checking');
    try {
      const cached = await isLiteRtModelCached(selectedLocalModel.id);
      const hfToken = await getHuggingFaceToken();
      if (!cached) {
        await downloadLiteRtModel(selectedLocalModel.id, undefined, hfToken?.trim()
          ? { Authorization: `Bearer ${hfToken.trim()}` }
          : undefined);
      }
      setLocalModelDownloaded(true);
      setLocalModelStatus('ready');
    } catch {
      Alert.alert('Download failed', 'Could not download the local model. Please try again.');
      setLocalModelDownloaded(false);
      setLocalModelStatus('missing');
    } finally {
      setLocalModelDownloadInFlight(false);
    }
  };

  const smartCategorizationEnabled = useSettingsStore((state) => state.smartCategorizationEnabled);
  const setSmartCategorizationEnabled = useSettingsStore((state) => state.setSmartCategorizationEnabled);

  const biometricAuthEnabled = useSettingsStore((state) => state.biometricAuthEnabled);
  const setBiometricAuthEnabled = useSettingsStore((state) => state.setBiometricAuthEnabled);

  const themePrimary = useSettingsStore((state) => state.themePrimary);
  const setThemePrimary = useSettingsStore((state) => state.setThemePrimary);
  const themeSecondary = useSettingsStore((state) => state.themeSecondary);
  const setThemeSecondary = useSettingsStore((state) => state.setThemeSecondary);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const region = useSettingsStore((state) => state.region);

  const includeNotesInExport = useSettingsStore((state) => state.includeNotesInExport);

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const clearAllTransactions = useTransactionStore((state) => state.clearAllData);
  const clearAllGoals = useGoalsStore((state) => state.clearAllData);
  const clearAllRecurring = useRecurringStore((state) => state.clearAllData);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const notificationsTransactionAlerts = useSettingsStore((state) => state.notificationsTransactionAlerts);
  const setNotificationsTransactionAlerts = useSettingsStore((state) => state.setNotificationsTransactionAlerts);
  const notificationsWeeklySummary = useSettingsStore((state) => state.notificationsWeeklySummary);
  const setNotificationsWeeklySummary = useSettingsStore((state) => state.setNotificationsWeeklySummary);
  const notificationsSavingsGoalProgress = useSettingsStore((state) => state.notificationsSavingsGoalProgress);
  const setNotificationsSavingsGoalProgress = useSettingsStore((state) => state.setNotificationsSavingsGoalProgress);
  const notificationsBudgetWarnings = useSettingsStore((state) => state.notificationsBudgetWarnings);
  const setNotificationsBudgetWarnings = useSettingsStore((state) => state.setNotificationsBudgetWarnings);

  const colors = [
    '#ff6b6b', // Coral Pink
    '#06b6d4', // Vibrant Cyan
    '#8b5cf6', // Royal Purple
    '#f97316', // Sunset Orange
  ];

  const secondaryColors = [
    '#52dea2', // Mint Green
    '#fbbf24', // Amber
    '#38bdf8', // Sky Blue
    '#f472b6', // Pink
  ];

  React.useEffect(() => {
    if (params.section !== 'ai' || aiSectionY === null) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, aiSectionY - 24), animated: true });
    }, 0);
    return () => clearTimeout(timeout);
  }, [params.section, aiSectionY]);

  return (
    <ScreenLayout title="Settings" backgroundColor={theme.colors.background} contentContainerStyle={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>

        <View style={styles.header}>
          <Text variant="displayMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Settings
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular' }}>
            Manage your Kinetic experience.
          </Text>
        </View>

        {/* Security Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Security</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Protect your assets.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="fingerprint" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Biometric Authentication</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Require Face ID / Touch ID</Text>
                </View>
              </View>
              <Switch
                value={biometricAuthEnabled}
                onValueChange={async (val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (val) {
                    const hasHardware = await LocalAuthentication.hasHardwareAsync();
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    if (!hasHardware || !isEnrolled) {
                      Alert.alert('Biometrics Unavailable', 'This device does not have biometric hardware or it is not configured.');
                      setBiometricAuthEnabled(false);
                      return;
                    }
                  }
                  setBiometricAuthEnabled(val);
                }}
                trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/change-passcode');
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="lock-outline" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>{useSettingsStore().passcodePin ? 'Change Passcode' : 'Set Passcode'}</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{useSettingsStore().passcodePin ? 'Update your 6-digit pin' : 'Require a pin to open'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>

            {!!useSettingsStore().passcodePin && (
              <Pressable
                style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  useSettingsStore.getState().setPasscodePin('');
                  useSettingsStore.getState().setPasscodeEnabled(false);
                }}
              >
                <View style={styles.settingRowLeft}>
                  <MaterialCommunityIcons name="lock-off-outline" size={24} color={theme.colors.onSurfaceVariant} />
                  <View>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Remove Passcode</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Disable pin authentication</Text>
                  </View>
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Personalize your interface.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 12 }]}>
                <MaterialCommunityIcons name="account-edit" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Greeting Name</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Custom name for the Home tab</Text>
                </View>
              </View>
              <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: theme.colors.surfaceContainerLowest }}
                  mode="outlined"
                  dense
                  placeholder="e.g. John"
                  value={greetingDraft}
                  onChangeText={setGreetingDraft}
                />
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCustomGreetingName(greetingDraft);
                  }}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
                  })}
                >
                  <Text style={{ color: theme.colors.onPrimary, fontFamily: 'BeVietnamPro_600SemiBold' }}>Save</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
                <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Theme</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Light, Dark, or System default</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {([
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ] as const).map((option) => {
                  const selected = themePreference === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Set theme to ${option.label}`}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceContainerHighest
                              : theme.colors.surfaceContainerHigh,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemePreference(option.value as ThemePreference);
                      }}
                    >
                      <Text style={{
                        color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontFamily: 'BeVietnamPro_600SemiBold',
                        fontSize: 14,
                      }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
                <MaterialCommunityIcons name="palette" size={24} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Accent Color</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {colors.map(color => {
                  const isSelected = themePrimary === color || (themePrimary === '' && color === '#ff6b6b');
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && { borderWidth: 2, borderColor: color, transform: [{ scale: 1.1 }] }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemePrimary(color);
                      }}
                    >
                      {isSelected && <MaterialCommunityIcons name="check" size={24} color="#000000" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
                <MaterialCommunityIcons name="palette-swatch" size={24} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Secondary Accent</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {secondaryColors.map((color) => {
                  const isSelected = themeSecondary === color || (themeSecondary === '' && color === '#52dea2');
                  return (
                    <Pressable
                      key={color}
                      accessibilityRole="button"
                      accessibilityLabel="Set secondary accent color"
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && { borderWidth: 2, borderColor: color, transform: [{ scale: 1.1 }] },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemeSecondary(color);
                      }}
                    >
                      {isSelected && <MaterialCommunityIcons name="check" size={24} color="#000000" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="contrast" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>High Contrast</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Improve legibility</Text>
                </View>
              </View>
              <Switch
                value={highContrastEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHighContrastEnabled(value);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={highContrastEnabled ? 'Disable high contrast' : 'Enable high contrast'}
              />
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="brightness-4" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>True Black (OLED)</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Dark theme only</Text>
                </View>
              </View>
              <Switch
                value={oledTrueBlackEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOledTrueBlackEnabled(value);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={oledTrueBlackEnabled ? 'Disable true black' : 'Enable true black'}
              />
            </View>
          </View>
        </View>

        {/* AI & Assistant Section */}
        <View
          style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}
          onLayout={(event) => setAiSectionY(event.nativeEvent.layout.y)}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>AI &amp; Assistant</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Choose the model provider.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Model Provider</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                    Local model or Gemini API
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {([
                  { value: 'local', label: 'Local Model' },
                  { value: 'google', label: 'Cloud API (Gemini)' },
                ] as const).map((option) => {
                  const selected = aiProvider === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityLabel={`Set model provider to ${option.label}`}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceContainerHighest
                              : theme.colors.surfaceContainerHigh,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setAiProvider(option.value);
                      }}
                    >
                      <Text style={{
                        color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontFamily: 'BeVietnamPro_600SemiBold',
                        fontSize: 14,
                      }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="message-text-outline" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>AI Assistant</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                    Show Chat tab
                  </Text>
                </View>
              </View>
              <Switch
                value={aiFeaturesEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAiFeaturesEnabled(value);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={aiFeaturesEnabled ? 'Disable AI assistant' : 'Enable AI assistant'}
              />
            </View>

            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="auto-fix" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Smart Categorization</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Auto-tag local transactions</Text>
                </View>
              </View>
              <Switch
                value={smartCategorizationEnabled}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSmartCategorizationEnabled(val);
                }}
                trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            </View>

            {aiProvider === 'google' && (
              <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
                <View style={[styles.settingRowLeft, { marginBottom: 12 }]}>
                  <MaterialCommunityIcons name="key-outline" size={24} color={theme.colors.onSurfaceVariant} />
                  <View>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Gemini API Key</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                      Stored securely on-device
                    </Text>
                  </View>
                </View>

                <View style={{ width: '100%', gap: 10 }}>
                  <View style={{ width: '100%', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant + '4D',
                          borderRadius: 14,
                          paddingHorizontal: 12,
                          paddingVertical: 12,
                          backgroundColor: theme.colors.surfaceContainerLowest,
                        }}
                      >
                        <Text
                          style={{
                            color: theme.colors.onSurface,
                            fontFamily: 'BeVietnamPro_400Regular',
                          }}
                        >
                          {geminiKeyDraft
                            ? geminiKeyVisible
                              ? geminiKeyDraft
                              : '••••••••••••••••'
                            : 'Paste/type key below'}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={geminiKeyVisible ? 'Hide API key' : 'Show API key'}
                      style={({ pressed }) => ({
                        padding: 10,
                        borderRadius: 14,
                        backgroundColor: pressed
                          ? theme.colors.surfaceContainerHighest
                          : theme.colors.surfaceContainerHigh,
                      })}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGeminiKeyVisible((v) => !v);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={geminiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>

                  <TextInput
                    mode="outlined"
                    label="Gemini API Key"
                    value={geminiKeyDraft}
                    onChangeText={(value) => {
                      setGeminiKeyDraft(value);
                      setGeminiKeyTestStatus(null);
                    }}
                    secureTextEntry={!geminiKeyVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    placeholder="Paste your key"
                    right={
                      <TextInput.Icon
                        icon={geminiKeyVisible ? 'eye-off-outline' : 'eye-outline'}
                        accessibilityLabel={geminiKeyVisible ? 'Hide API key' : 'Show API key'}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setGeminiKeyVisible((v) => !v);
                        }}
                      />
                    }
                  />

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Save Gemini API key"
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
                      })}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGeminiKeyTestStatus(null);
                        try {
                          await setGeminiApiKey(geminiKeyDraft);
                          setGeminiKeyDraft('');
                        } catch {
                          setGeminiKeyTestStatus({ kind: 'error', message: 'Failed to save key.' });
                        }
                      }}
                    >
                      <Text style={{ color: theme.colors.onPrimary, fontFamily: 'BeVietnamPro_600SemiBold' }}>Save</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete saved Gemini API key"
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: pressed ? theme.colors.surfaceContainerHighest : theme.colors.surfaceContainerHigh,
                      })}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGeminiKeyTestStatus(null);
                        try {
                          await deleteGeminiApiKey();
                          setGeminiKeyDraft('');
                          setGeminiKeyVisible(false);
                          setGeminiKeyTestStatus({ kind: 'success', message: 'Saved key deleted.' });
                        } catch {
                          setGeminiKeyTestStatus({ kind: 'error', message: 'Failed to delete key.' });
                        }
                      }}
                    >
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold' }}>Delete Saved Key</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Test Gemini API connection"
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 14,
                        backgroundColor: pressed ? theme.colors.surfaceContainerHighest : theme.colors.surfaceContainerHigh,
                      })}
                      onPress={async () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setGeminiKeyTestStatus(null);
                        const key = await getGeminiApiKey();
                        if (!key) {
                          setGeminiKeyTestStatus({ kind: 'error', message: 'No saved key found. Tap Save first.' });
                          return;
                        }

                        try {
                          const genAI = new GoogleGenerativeAI(key);
                          const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
                          await model.generateContent({
                            contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
                            generationConfig: { maxOutputTokens: 1, temperature: 0 },
                          });
                          setGeminiKeyTestStatus({ kind: 'success', message: 'Connection ok.' });
                        } catch (error) {
                          setGeminiKeyTestStatus({ kind: 'error', message: mapGeminiConnectionError(error) });
                        }
                      }}
                    >
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold' }}>Test Connection</Text>
                    </Pressable>
                  </View>

                  {geminiKeyTestStatus && (
                    <Text
                      style={{
                        color: geminiKeyTestStatus.kind === 'success' ? theme.colors.tertiary : theme.colors.error,
                        fontFamily: 'BeVietnamPro_500Medium',
                        marginTop: 4,
                      }}
                    >
                      {geminiKeyTestStatus.message}
                    </Text>
                  )}
                </View>
              </View>
            )}
            {aiProvider === 'local' && (
              <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start', gap: 10 }]}>
                <View style={styles.settingRowLeft}>
                  <MaterialCommunityIcons name="cpu-64-bit" size={24} color={theme.colors.onSurfaceVariant} />
                  <View>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>
                      Local Model Status
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                      {localModelStatusText}
                    </Text>
                  </View>
                </View>
                {!localModelDownloaded && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Download local AI model"
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 14,
                      backgroundColor: pressed ? theme.colors.surfaceContainerHighest : theme.colors.surfaceContainerHigh,
                    })}
                    disabled={localModelDownloadInFlight}
                    onPress={handleDownloadLocalModel}
                  >
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold' }}>
                      {localModelDownloadInFlight ? 'Downloading…' : 'Download'}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Currency & Region Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Currency & Region</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Change formatting across the app.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/currency');
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="currency-usd" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Currency & Region</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                    {currencyCode} ({region})
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 12 }}>
                  {formatAppCurrency(123456)}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* Categories Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Categories</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Manage your spending labels.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/settings/categories');
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="tag-multiple" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Manage Categories</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Add custom expense categories</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Notifications</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Choose which alerts you want.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="bell" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Transaction Alerts</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>When money moves</Text>
                </View>
              </View>
              <Switch
                value={notificationsTransactionAlerts}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNotificationsTransactionAlerts(val);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={notificationsTransactionAlerts ? 'Disable transaction alerts' : 'Enable transaction alerts'}
              />
            </View>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="calendar-week" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Weekly Summary</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Spending recap</Text>
                </View>
              </View>
              <Switch
                value={notificationsWeeklySummary}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNotificationsWeeklySummary(val);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={notificationsWeeklySummary ? 'Disable weekly summary' : 'Enable weekly summary'}
              />
            </View>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="target" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Savings Goal Progress</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Goal milestones</Text>
                </View>
              </View>
              <Switch
                value={notificationsSavingsGoalProgress}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNotificationsSavingsGoalProgress(val);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={notificationsSavingsGoalProgress ? 'Disable savings goal alerts' : 'Enable savings goal alerts'}
              />
            </View>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="alert" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Budget Warnings</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Approaching limits</Text>
                </View>
              </View>
              <Switch
                value={notificationsBudgetWarnings}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setNotificationsBudgetWarnings(val);
                }}
                trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                thumbColor={theme.colors.onSurface}
                accessibilityLabel={notificationsBudgetWarnings ? 'Disable budget warnings' : 'Enable budget warnings'}
              />
            </View>
          </View>
        </View>

        {/* Data & Sync Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Data &amp; Sync</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Backups, sharing, and sync.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                if (cloudSyncPopupDismissed) {
                  setCloudSyncPopupDismissed(false);
                  return;
                }

                Alert.alert(
                  'Cloud Sync (needs infrastructure)',
                  'End-to-end encrypted cloud sync requires backend infrastructure (account identity + storage + conflict resolution).\n\nGemwallet currently runs fully on-device, so cloud sync is not available yet.',
                  [
                    {
                      text: 'Dismiss',
                      onPress: () => setCloudSyncPopupDismissed(true),
                    },
                    { text: 'OK', style: 'cancel' },
                  ]
                );
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="cloud-outline" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Cloud Sync</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                    Not available (tap to learn why)
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="information-outline" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Local Data Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Local Data</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Manage your offline vault.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                try {
                  const csv = exportTransactionsCsv({
                    transactions,
                    categories,
                    includeNotes: includeNotesInExport,
                  });
                  const fileUri = `${FileSystem.cacheDirectory}gemwallet-transactions.csv`;
                  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

                  const canShare = await Sharing.isAvailableAsync();
                  if (!canShare) {
                    Alert.alert('Sharing not available', 'This device does not support sharing files.');
                    return;
                  }

                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Export Transactions',
                    UTI: 'public.comma-separated-values-text',
                  });
                } catch {
                  Alert.alert('Export failed', 'Could not export transactions.');
                }
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="download" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Export Data</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Export transactions as CSV</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                Alert.alert(
                  'Clear all data?',
                  'This will delete all transactions, categories, and settings stored on this device.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Continue',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('Confirm delete', 'This action cannot be undone.', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              clearAllTransactions();
                              clearAllGoals();
                              clearAllRecurring();
                              resetSettings();
                            },
                          },
                        ]);
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="delete" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Clear All Data</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Reset stores on this device</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>About</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>App info and support.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="information" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Version</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{appConfig.expo.version}</Text>
                </View>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const subject = encodeURIComponent('GemWallet Feedback');
                const body = encodeURIComponent('');
                Linking.openURL(`mailto:me@itswal.me?subject=${subject}&body=${body}`);
              }}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="email" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Send Feedback</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Open your mail client</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 48,
    marginTop: 32,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  downloadButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionContent: {
    borderRadius: 12,
    gap: 2,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
});
