import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, IconButton, useTheme, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { streamFinancialAnalysis, streamLocalFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const transactions = useTransactionStore((s) => s.transactions);
  const addExpense = useTransactionStore((s) => s.addExpense);
  const addIncome = useTransactionStore((s) => s.addIncome);
  const categories = useTransactionStore((s) => s.categories);

  const aiProvider = useSettingsStore((s) => s.aiProvider);
  const geminiApiKey = useSettingsStore((s) => s.geminiApiKey);
  const huggingFaceToken = useSettingsStore((s) => s.huggingFaceToken);
  const currencyCode = useSettingsStore((s) => s.currencyCode);
  const locale = useSettingsStore((s) => s.language);
  const region = useSettingsStore((s) => s.region);
  const model = useSettingsStore((s) => s.gemmaModel);
  const localModelDownloaded = useSettingsStore((s) => s.localModelDownloaded);
  const localModelId = useSettingsStore((s) => s.localModelId);
  const advanced = useSettingsStore((s) => s.advancedSummariesEnabled);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
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
      geminiApiKey,
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
      geminiApiKey,
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

  const resolveCategoryId = (categoryHint: string, kind: 'expense' | 'income') => {
    const cleaned = categoryHint.trim().toLowerCase();
    const match = categories.find((c) => c.kind === kind && c.name.toLowerCase() === cleaned);
    if (match) return match.id;
    return kind === 'income' ? 'income-custom' : 'expense-misc';
  };

  const onSend = async () => {
    const question = inputText.trim();
    if (!question || isSending) return;

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
      const runner = settings.aiProvider === 'local' ? streamLocalFinancialAnalysis : streamFinancialAnalysis;

      for await (const chunk of runner(
        transactions,
        settings,
        {
          onCommand: ({ amountCents, categoryHint, note }) => {
            addExpense({
              amountCents,
              categoryId: resolveCategoryId(categoryHint, 'expense'),
              note,
            });
          },
          onIncome: ({ amountCents, categoryHint, note }) => {
            addIncome({
              amountCents,
              categoryId: resolveCategoryId(categoryHint, 'income'),
              note,
            });
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
      </View>

      <ScrollView
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <Surface
              key={message.id}
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.assistantBubble,
                {
                  backgroundColor: isUser ? theme.colors.primaryContainer : theme.colors.secondaryContainer,
                },
              ]}
              elevation={0}
            >
              <Text
                variant="bodyMedium"
                style={{ color: isUser ? theme.colors.onPrimaryContainer : theme.colors.onSecondaryContainer }}
              >
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
