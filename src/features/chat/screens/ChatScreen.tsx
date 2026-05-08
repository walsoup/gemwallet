import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { streamGeminiFinancialAnalysis, streamLocalFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';
import { getGeminiApiKey } from '../../../../services/secureGeminiKey';
import { downloadLiteRtModel, getLiteRtModel, isLiteRtModelCached } from '../../nlp/services/liteRtModels';
import { formatCurrency } from '../../../../utils/formatCurrency';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
};

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const transactions = useTransactionStore((s) => s.transactions);
  const addExpense = useTransactionStore((s) => s.addExpense);
  const addIncome = useTransactionStore((s) => s.addIncome);
  const categories = useTransactionStore((s) => s.categories);

  const addRecurringEvent = useRecurringStore((s) => s.addEvent);
  const setRecurringEnabled = useRecurringStore((s) => s.setRecurringEnabled);
  const addGoal = useGoalsStore((s) => s.addGoal);

  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const huggingFaceToken = useSettingsStore((s) => s.huggingFaceToken);
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
    const isLocal = settings.aiProvider === 'local';
    const geminiApiKey = isLocal ? null : await getGeminiApiKey();
    if (!isLocal) {
      setGeminiKeyExists(Boolean(geminiApiKey));
    }

    if (!isLocal && !geminiApiKey) {
      setGeminiKeyExists(false);
      return;
    }

    if (isLocal && !localModelReady) {
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
      const runner = settings.aiProvider === 'local'
        ? streamLocalFinancialAnalysis
        : streamGeminiFinancialAnalysis;
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
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
          AI Assistant
        </Text>
        <Surface
          style={[styles.providerBadge, { backgroundColor: theme.colors.surfaceVariant }]}
          elevation={0}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {activeModelLabel}
          </Text>
        </Surface>
      </View>

      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {aiProvider === 'google' && geminiKeyExists === false && (
          <Surface style={[styles.inlineNotice, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
            <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer }}>
              Cloud API is selected but no Gemini key is saved.
            </Text>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onErrorContainer, textDecorationLine: 'underline', marginTop: 6 }}
              onPress={() => router.push('/settings?section=ai')}
            >
              Open AI settings
            </Text>
          </Surface>
        )}

        {aiProvider === 'local' && !localModelReady && (
          <Surface style={[styles.inlineNotice, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
            <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
              Local model is not downloaded yet.
            </Text>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.onTertiaryContainer, textDecorationLine: 'underline', marginTop: 6 }}
              onPress={downloadLocalModel}
            >
              {isDownloadingLocalModel ? 'Downloading…' : 'Download model'}
            </Text>
          </Surface>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isSystem = message.role === 'system';
          return (
            <Surface
              key={message.id}
              style={[
                styles.messageBubble,
                isSystem ? styles.systemBubble : isUser ? styles.userBubble : styles.assistantBubble,
                {
                  backgroundColor: isSystem
                    ? theme.colors.tertiaryContainer
                    : isUser
                      ? theme.colors.primaryContainer
                      : theme.colors.secondaryContainer,
                },
              ]}
              elevation={0}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: isSystem
                    ? theme.colors.onTertiaryContainer
                    : isUser
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSecondaryContainer,
                }}
              >
                {isSystem ? 'System • ' : ''}
                {message.text || (message.role === 'assistant' && isSending ? '…' : '')}
              </Text>
            </Surface>
          );
        })}
      </ScrollView>

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 16, backgroundColor: theme.colors.surface }]}>
        <TextInput
          mode="outlined"
          placeholder="Ask me anything..."
          style={styles.input}
          outlineStyle={{ borderRadius: 24 }}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <IconButton
          icon="send"
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
          disabled={isSending || !inputText.trim()}
          onPress={onSend}
          accessibilityLabel="Send message"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    gap: 8,
  },
  providerBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatContent: {
    paddingVertical: 16,
    gap: 12,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 24,
    maxWidth: '80%',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  systemBubble: {
    alignSelf: 'center',
    borderRadius: 14,
    maxWidth: '92%',
  },
  inlineNotice: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    elevation: 4,
  },
  input: {
    flex: 1,
    marginRight: 8,
  },
});
