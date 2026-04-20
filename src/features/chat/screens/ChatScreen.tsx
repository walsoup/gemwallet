import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Button, Card, Chip, IconButton, Surface, Text, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';
import { useBouncyPress } from '../../../hooks/useBouncyPress';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type VoiceAttachment = {
  uri: string;
  durationMs: number;
  note: string;
};

type ImageAttachment = {
  uri: string;
  note: string;
};

function generateId() {
  return Math.random().toString(36).slice(2);
}

export default function ChatScreen() {
  const theme = useAppTheme();
  const sendBounce = useBouncyPress(0.9);

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const addEvent = useRecurringStore((state) => state.addEvent);
  const setRecurringEnabled = useRecurringStore((state) => state.setRecurringEnabled);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const huggingFaceToken = useSettingsStore((state) => state.huggingFaceToken);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const [input, setInput] = useState('');
  const [voiceAttachment, setVoiceAttachment] = useState<VoiceAttachment | null>(null);
  const [imageAttachment, setImageAttachment] = useState<ImageAttachment | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'intro',
      role: 'assistant',
      text: 'Ask anything about your spending, income, or saving plan. I can summarize trends, find categories, and suggest next steps.',
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const locale = language || 'en-US';
  const [voiceNoteHint, setVoiceNoteHint] = useState('');
  const [imageNoteHint, setImageNoteHint] = useState('');

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const appendSystemMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', text }]);
    scrollToBottom();
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
      const status = await recording.getStatusAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (uri && status.isDoneRecording) {
        setVoiceAttachment({
          uri,
          durationMs: status.durationMillis ?? 0,
          note: voiceNoteHint,
        });
      }
      return uri;
    } catch {
      setRecording(null);
      return null;
    }
  }, [recording, voiceNoteHint]);

  const startRecording = useCallback(async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        appendSystemMessage('Microphone permission denied.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const result = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(result.recording);
    } catch {
      appendSystemMessage('Unable to start recording.');
    }
  }, [appendSystemMessage]);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      appendSystemMessage('Gallery permission denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length) {
      setImageAttachment({ uri: result.assets[0].uri, note: imageNoteHint });
    }
  }, [appendSystemMessage, imageNoteHint]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;
    const attachments: string[] = [];
    if (voiceAttachment) {
      attachments.push(
        `Voice note (${Math.round(voiceAttachment.durationMs / 1000)}s): ${voiceAttachment.note || 'no note'}`
      );
    }
    if (imageAttachment) {
      attachments.push(`Receipt photo: ${imageAttachment.note || imageAttachment.uri}`);
    }

    const userText = [input.trim(), attachments.length ? `\n\nAttachments:\n${attachments.join('\n')}` : '']
      .filter(Boolean)
      .join('');
    setInput('');
    setVoiceAttachment((current) => (current ? { ...current, note: voiceNoteHint } : null));
    setImageAttachment((current) => (current ? { ...current, note: imageNoteHint } : null));
    const userMessage: ChatMessage = { id: generateId(), role: 'user', text: userText };
    const assistantMessage: ChatMessage = { id: generateId(), role: 'assistant', text: '' };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsStreaming(true);
    await Haptics.selectionAsync();

    try {
      const generator = streamFinancialAnalysis(
        transactions,
        {
          aiProvider,
          geminiApiKey,
          huggingFaceToken,
          currencyCode,
          locale,
          region,
          model: gemmaModel,
          advanced: advancedSummariesEnabled,
        },
        {
          onCommand: (command) => {
            const category = categories.find((c) =>
              c.name.toLowerCase().includes(command.categoryHint.toLowerCase())
            );
            addExpense({
              amountCents: command.amountCents,
              categoryId: category?.id ?? categories.find((c) => c.kind === 'expense')?.id ?? 'expense-misc',
              note: command.note || 'AI-added expense',
            });
            appendSystemMessage(
              `Logged ${formatCurrency(command.amountCents, { currencyCode, locale })} in ${category?.name ?? 'Expense'}`
            );
          },
          onRecurring: (command) => {
            const category = categories.find((c) =>
              c.name.toLowerCase().includes((command.categoryHint ?? '').toLowerCase())
            );
            addEvent({
              name: command.name,
              amountCents: command.amountCents,
              type: command.type,
              interval: command.interval,
              categoryId: category?.id ?? categories.find((c) => c.kind === command.type)?.id ?? '',
              startDate: command.startDate,
            });
            setRecurringEnabled(true);
            appendSystemMessage(
              `Created ${command.interval} ${command.type} "${command.name}" for ${formatCurrency(command.amountCents, { currencyCode, locale })}`
            );
          },
          onGoal: (command) => {
            addGoal({
              name: command.name,
              targetCents: command.targetCents,
              dueDate: command.dueDate,
            });
            appendSystemMessage(
              `Added goal "${command.name}" for ${formatCurrency(command.targetCents, { currencyCode, locale })}`
            );
          },
          onIncome: (command) => {
            const category = categories.find((c) =>
              c.name.toLowerCase().includes(command.categoryHint.toLowerCase())
            );
            addIncome({
              amountCents: command.amountCents,
              categoryId: category?.id ?? categories.find((c) => c.kind === 'income')?.id ?? 'income-misc',
              note: command.note || 'AI-added income',
            });
            appendSystemMessage(
              `Logged income ${formatCurrency(command.amountCents, { currencyCode, locale })} in ${category?.name ?? 'Income'}`
            );
          },
        },
        userText
      );

      let text = '';
      for await (const chunk of generator) {
        text += chunk;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, text } : msg))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, text: 'I hit a snag answering that. Check your AI settings and try again.' }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
      scrollToBottom();
    }
  }, [
    input,
    isStreaming,
    transactions,
    aiProvider,
    geminiApiKey,
    huggingFaceToken,
    currencyCode,
    locale,
    region,
    gemmaModel,
    advancedSummariesEnabled,
    categories,
    addExpense,
    addIncome,
    addEvent,
    setRecurringEnabled,
    addGoal,
    appendSystemMessage,
    voiceAttachment,
    imageAttachment,
    voiceNoteHint,
    imageNoteHint,
  ]);

  const totalSpend = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amountCents, 0);

  const topCategory = categories
    .map((c) => ({
      category: c.name,
      amount: transactions
        .filter((t) => t.categoryId === c.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amountCents, 0),
    }))
    .sort((a, b) => b.amount - a.amount)[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.surfaceContainerLowest }}>
      <Surface style={[styles.container, { backgroundColor: theme.colors.surfaceContainerHighest }]} elevation={2}>
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
              AI Chat
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Gemma-powered insights on your wallet.
            </Text>
          </View>
          <Chip
            mode="outlined"
            style={{ backgroundColor: theme.colors.surface }}
            textStyle={{ color: theme.colors.onSurface }}
          >
            {transactions.length} entries • {formatCurrency(totalSpend, { currencyCode, locale })}
          </Chip>
        </View>

        {topCategory ? (
          <Card mode="elevated" style={{ marginBottom: 12, borderRadius: 20, backgroundColor: theme.colors.surfaceContainerHigh }}>
            <Card.Content style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>Top category</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {topCategory.category}
                </Text>
              </View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                {formatCurrency(topCategory.amount, { currencyCode, locale })}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
          showsVerticalScrollIndicator={false}
        >
          {(voiceAttachment || imageAttachment) ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {voiceAttachment ? (
                <Chip
                  icon="microphone"
                  onClose={() => setVoiceAttachment(null)}
                  style={{ backgroundColor: theme.colors.surfaceVariant }}
                >
                  Voice • {Math.round(voiceAttachment.durationMs / 1000)}s
                </Chip>
              ) : null}
              {imageAttachment ? (
                <Chip
                  icon="image"
                  onClose={() => setImageAttachment(null)}
                  style={{ backgroundColor: theme.colors.surfaceVariant }}
                >
                  Photo attached
                </Chip>
              ) : null}
            </View>
          ) : null}

          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.message,
                msg.role === 'user'
                  ? { alignSelf: 'flex-end', backgroundColor: theme.colors.primaryContainer }
                  : { alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text style={{ color: theme.colors.onSurface }}>{msg.text || (msg.role === 'assistant' ? 'Thinking…' : '')}</Text>
            </View>
          ))}
          {isStreaming ? (
            <View style={{ alignSelf: 'flex-start', padding: 8 }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            mode="outlined"
            placeholder="Ask about savings, spending, or trends"
            value={input}
            onChangeText={setInput}
            style={{ flex: 1 }}
            outlineStyle={{ borderRadius: 18 }}
          />
          <View style={{ width: 12 }} />
          <IconButton
            mode={recording ? 'contained' : 'outlined'}
            icon={recording ? 'stop' : 'microphone'}
            onPress={() => {
              if (recording) {
                void stopRecording();
              } else {
                void startRecording();
              }
            }}
          />
          <IconButton
            mode="outlined"
            icon="image-plus"
            onPress={() => {
              void pickImage();
            }}
          />
          <View style={{ width: 4 }} />
          <Button
            mode="contained"
            icon="send"
            disabled={!input.trim() || isStreaming}
            onPress={() => {
              sendBounce.onPressIn();
              setTimeout(() => sendBounce.onPressOut(), 120);
              void handleSend();
            }}
            onPressIn={sendBounce.onPressIn}
            onPressOut={sendBounce.onPressOut}
          >
            Send
          </Button>
        </View>
      </Surface>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chat: {
    flex: 1,
  },
  message: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
