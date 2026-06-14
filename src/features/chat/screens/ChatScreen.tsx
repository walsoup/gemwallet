import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';
import { getGeminiApiKey } from '../../../../services/secureGeminiKey';
import { getHuggingFaceToken } from '../../../../services/secureHuggingFaceToken';
import { downloadLiteRtModel, getLiteRtModel, isLiteRtModelCached } from '../../nlp/services/liteRtModels';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import Animated, { FadeInLeft, FadeInRight, FadeInUp, Layout } from 'react-native-reanimated';
import { BouncyButton } from '../../../components/UI/BouncyButton';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();

  const transactions = useTransactionStore((s) => s.transactions);
  const addExpense = useTransactionStore((s) => s.addExpense);
  const addIncome = useTransactionStore((s) => s.addIncome);
  const categories = useTransactionStore((s) => s.categories);

  const addRecurringEvent = useRecurringStore((s) => s.addEvent);
  const setRecurringEnabled = useRecurringStore((s) => s.setRecurringEnabled);
  const addGoal = useGoalsStore((s) => s.addGoal);

  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const setLocalModelDownloaded = useSettingsStore((s) => s.setLocalModelDownloaded);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const locale = useSettingsStore((s) => s.language);
  const region = useSettingsStore((s) => s.region);
  const model = useSettingsStore((s) => s.gemmaModel);
  const localModelDownloaded = useSettingsStore((s) => s.localModelDownloaded);
  const localModelId = useSettingsStore((s) => s.localModelId);
  const advanced = useSettingsStore((s) => s.advancedSummariesEnabled);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDownloadingLocalModel, setIsDownloadingLocalModel] = useState(false);
  const [geminiKeyExists, setGeminiKeyExists] = useState<boolean | null>(null);
  const [huggingFaceToken, setHuggingFaceToken] = useState<string | null>(null);
  const [localModelReady, setLocalModelReady] = useState(localModelDownloaded);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your AI financial assistant. How can I help you today?',
    },
  ]);

  const settings = useMemo(
    () => ({
      aiProvider,
      huggingFaceToken,
      currencyCode,
      locale,
      region,
      model,
      localModelDownloaded,
      localModelId,
      advanced,
    }),
    [
      aiProvider,
      huggingFaceToken,
      currencyCode,
      locale,
      region,
      model,
      localModelDownloaded,
      localModelId,
      advanced,
    ]
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const refresh = async () => {
        const hfToken = await getHuggingFaceToken();
        if (!active) return;
        setHuggingFaceToken(hfToken);

        if (aiProvider === 'google') {
          const key = await getGeminiApiKey();
          if (!active) return;
          setGeminiKeyExists(Boolean(key));
        } else {
          setGeminiKeyExists(null);
        }

        if (aiProvider === 'local') {
          try {
            const cached = await isLiteRtModelCached(localModelId);
            if (!active) return;
            setLocalModelDownloaded(cached);
            setLocalModelReady(cached);
          } catch {
            if (!active) return;
            setLocalModelDownloaded(false);
            setLocalModelReady(false);
          }
        }
      };

      refresh();
      return () => {
        active = false;
      };
    }, [aiProvider, localModelId, setLocalModelDownloaded])
  );

  const pushSystemMessage = React.useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `system-${Date.now()}-${Math.random()}`,
        role: 'system',
        text,
      },
    ]);
  }, []);

  const downloadLocalModel = async () => {
    if (isDownloadingLocalModel) return;
    setIsDownloadingLocalModel(true);
    try {
      const modelMeta = getLiteRtModel(localModelId);
      const cached = await isLiteRtModelCached(modelMeta.id);
      if (!cached) {
        await downloadLiteRtModel(modelMeta.id, undefined, huggingFaceToken?.trim()
          ? { Authorization: `Bearer ${huggingFaceToken.trim()}` }
          : undefined);
      }
      setLocalModelDownloaded(true);
      setLocalModelReady(true);
    } catch {
      setLocalModelDownloaded(false);
      setLocalModelReady(false);
      pushSystemMessage('Local model download failed. Please try again from AI Settings.');
    } finally {
      setIsDownloadingLocalModel(false);
    }
  };

  const activeModelLabel = aiProvider === 'local' ? `Local • ${localModelId}` : 'Cloud • Gemini';

  const resolveCategoryId = (categoryHint: string, kind: 'expense' | 'income') => {
    const cleaned = categoryHint.trim().toLowerCase();
    const match = categories.find((c) => c.kind === kind && c.name.toLowerCase() === cleaned);
    if (match) return match.id;
    return kind === 'income' ? 'income-custom' : 'expense-misc';
  };

  const onSend = async () => {
    const question = inputText.trim();
    if (!question || isSending) return;
    const isLocalProvider = settings.aiProvider === 'local';
    const geminiApiKey = isLocalProvider ? null : await getGeminiApiKey();
    if (!isLocalProvider) {
      setGeminiKeyExists(Boolean(geminiApiKey));
    }

    if (!isLocalProvider && !geminiApiKey) {
      setGeminiKeyExists(false);
      return;
    }

    if (isLocalProvider && !localModelReady) {
      return;
    }

    setInputText('');
    setIsSending(true);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
    };

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: 'assistant',
        text: '',
      },
    ]);

    try {
      let assembled = '';
      const runner = streamFinancialAnalysis;
      const runtimeOptions = settings.aiProvider === 'google'
        ? { ...settings, geminiApiKey: geminiApiKey ?? undefined }
        : settings;

      for await (const chunk of runner(
        transactions,
        runtimeOptions,
        {
          onCommand: ({ amountCents, categoryHint, note }) => {
            addExpense({
              amountCents,
              categoryId: resolveCategoryId(categoryHint, 'expense'),
              note,
            });
            pushSystemMessage(
              `Logged expense: ${formatCurrency(amountCents, { currencyCode, locale })} - ${note?.trim() || categoryHint}`
            );
          },
          onIncome: ({ amountCents, categoryHint, note }) => {
            addIncome({
              amountCents,
              categoryId: resolveCategoryId(categoryHint, 'income'),
              note,
            });
            pushSystemMessage(
              `Logged income: ${formatCurrency(amountCents, { currencyCode, locale })} - ${note?.trim() || categoryHint}`
            );
          },
          onRecurring: ({ name, amountCents, type, interval, categoryHint, startDate }) => {
            addRecurringEvent({
              name,
              amountCents,
              type,
              interval,
              categoryId: resolveCategoryId(categoryHint ?? (type === 'income' ? 'Custom' : 'Misc'), type),
              startDate,
            });
            setRecurringEnabled(true);
            pushSystemMessage(
              `Added recurring ${type}: ${formatCurrency(amountCents, { currencyCode, locale })} - ${name} (${interval})`
            );
          },
          onGoal: ({ name, targetCents, dueDate }) => {
            addGoal({ name, targetCents, dueDate });
            pushSystemMessage(
              `Added goal: ${name} - ${formatCurrency(targetCents, { currencyCode, locale })}`
            );
          },
        },
        question
      )) {
        assembled += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: assembled } : m))
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ScreenLayout title="AI Assistant" backgroundColor={theme.colors.background} contentContainerStyle={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.providerHeader}>
          <View style={[styles.providerBadge, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
            <MaterialCommunityIcons name={aiProvider === 'local' ? 'cpu-64-bit' : 'cloud'} size={14} color={theme.colors.onSurfaceVariant} style={{ marginRight: 6 }} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_500Medium', fontSize: 12 }}>
              {activeModelLabel}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {aiProvider === 'google' && geminiKeyExists === false && (
            <Animated.View entering={FadeInUp.springify()}>
              <Surface style={[styles.inlineNotice, { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error + '40', borderWidth: 1 }]} elevation={0}>
                <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.onErrorContainer} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onErrorContainer, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>
                    No Gemini key saved.
                  </Text>
                  <Text
                    style={{ color: theme.colors.onErrorContainer, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, textDecorationLine: 'underline', marginTop: 4 }}
                    onPress={() => router.push('/settings?section=ai')}
                  >
                    Open AI settings
                  </Text>
                </View>
              </Surface>
            </Animated.View>
          )}

          {aiProvider === 'local' && !localModelReady && (
            <Animated.View entering={FadeInUp.springify()}>
              <Surface style={[styles.inlineNotice, { backgroundColor: theme.colors.tertiaryContainer, borderColor: theme.colors.tertiary + '40', borderWidth: 1 }]} elevation={0}>
                <MaterialCommunityIcons name="download" size={20} color={theme.colors.onTertiaryContainer} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.onTertiaryContainer, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>
                    Local model is not downloaded yet.
                  </Text>
                  <Text
                    style={{ color: theme.colors.onTertiaryContainer, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 14, textDecorationLine: 'underline', marginTop: 4 }}
                    onPress={downloadLocalModel}
                  >
                    {isDownloadingLocalModel ? 'Downloading…' : 'Download model'}
                  </Text>
                </View>
              </Surface>
            </Animated.View>
          )}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const isSystem = message.role === 'system';
            return (
              <Animated.View
                key={message.id}
                entering={isUser ? FadeInRight.springify() : FadeInLeft.springify()}
                layout={Layout.springify()}
                style={[
                  styles.messageBubbleContainer,
                  isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer
                ]}
              >
                {isUser ? (
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.tertiary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.messageBubble, styles.userBubble]}
                  >
                    <Text style={{ color: theme.colors.onPrimary, fontFamily: 'BeVietnamPro_400Regular', fontSize: 15, lineHeight: 22 }}>
                      {message.text}
                    </Text>
                  </LinearGradient>
                ) : isSystem ? (
                  <View style={[styles.messageBubble, styles.systemBubble, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_500Medium', fontSize: 13, textAlign: 'center' }}>
                      {message.text}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.messageBubble, styles.assistantBubble, { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant + '30', borderWidth: 1 }]}>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_400Regular', fontSize: 15, lineHeight: 24 }}>
                      {message.text || (isSending ? 'Thinking…' : '')}
                    </Text>
                  </View>
                )}
              </Animated.View>
            );
          })}
        </ScrollView>

        <BlurView intensity={80} tint="dark" style={styles.floatingInputWrapper}>
          <View style={[styles.floatingInputContainer, { backgroundColor: theme.colors.surfaceContainerHigh + 'E6', borderColor: theme.colors.outlineVariant + '40', borderWidth: 1 }]}>
            <TextInput
              placeholder="Ask me anything..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              style={[styles.customInput, { color: theme.colors.onSurface }]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              theme={{ colors: { primary: 'transparent', background: 'transparent' } }}
            />
            <BouncyButton 
              disabled={isSending || !inputText.trim()} 
              onPress={onSend}
              style={[
                styles.sendButton,
                (isSending || !inputText.trim()) && { opacity: 0.5 }
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.tertiary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendButtonGradient}
              >
                <MaterialCommunityIcons name="send" size={20} color={theme.colors.onPrimary} />
              </LinearGradient>
            </BouncyButton>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  providerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
    paddingBottom: 160, // space for floating input
    gap: 16,
  },
  messageBubbleContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  userBubbleContainer: {
    justifyContent: 'flex-end',
  },
  assistantBubbleContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    maxWidth: '85%',
  },
  assistantBubble: {
    borderTopLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    alignSelf: 'center',
    borderRadius: 14,
    maxWidth: '92%',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  floatingInputWrapper: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    borderRadius: 32,
    overflow: 'hidden',
  },
  floatingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 32,
    minHeight: 64,
  },
  customInput: {
    flex: 1,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: 'transparent',
  },
  sendButton: {
    marginLeft: 12,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
