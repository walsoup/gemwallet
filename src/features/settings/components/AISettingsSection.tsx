import React, { useState, useEffect } from 'react';
import { View, Pressable, Switch, Alert, LayoutChangeEvent } from 'react-native';
import { Text, useTheme, TextInput } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { styles } from './SettingsStyles';
import { downloadLiteRtModel, getLiteRtModel, isLiteRtModelCached } from '../../../nlp/services/liteRtModels';
import { getHuggingFaceToken } from '../../../../services/secureHuggingFaceToken';
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

interface AISettingsSectionProps {
  onLayout?: (event: LayoutChangeEvent) => void;
}

export function AISettingsSection({ onLayout }: AISettingsSectionProps) {
  const theme = useTheme<AppTheme>();

  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const setAiProvider = useSettingsStore((state) => state.setAiProvider);
  const aiFeaturesEnabled = useSettingsStore((state) => state.aiFeaturesEnabled);
  const setAiFeaturesEnabled = useSettingsStore((state) => state.setAiFeaturesEnabled);
  const smartCategorizationEnabled = useSettingsStore((state) => state.smartCategorizationEnabled);
  const setSmartCategorizationEnabled = useSettingsStore((state) => state.setSmartCategorizationEnabled);
  
  const localModelId = useSettingsStore((state) => state.localModelId);
  const localModelDownloaded = useSettingsStore((state) => state.localModelDownloaded);
  const setLocalModelDownloaded = useSettingsStore((state) => state.setLocalModelDownloaded);

  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [geminiKeyVisible, setGeminiKeyVisible] = useState(false);
  const [geminiKeyTestStatus, setGeminiKeyTestStatus] = useState<null | {
    kind: 'success' | 'error';
    message: string;
  }>(null);
  const [localModelStatus, setLocalModelStatus] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [localModelDownloadInFlight, setLocalModelDownloadInFlight] = useState(false);

  useEffect(() => {
    return () => {
      setGeminiKeyDraft('');
      setGeminiKeyVisible(false);
      setGeminiKeyTestStatus(null);
    };
  }, []);

  useEffect(() => {
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

  return (
    <View
      style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}
      onLayout={onLayout}
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
  );
}
