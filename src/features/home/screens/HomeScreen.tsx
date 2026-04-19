import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  FAB,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  SegmentedButtons,
  TouchableRipple,
  ActivityIndicator,
  Card
} from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import type { Category } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { generatePersonalGreeting, streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

function formatTime(timestamp: number, locale: string) {
  return new Date(timestamp).toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit' });
}

function categoryById(categories: Category[], categoryId: string) {
  return categories.find((item) => item.id === categoryId);
}

function amountTextToCents(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function applyOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(opacity, 0), 1)})`;
}

function fallbackGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const huggingFaceToken = useSettingsStore((state) => state.huggingFaceToken);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const localModelDownloaded = useSettingsStore((state) => state.localModelDownloaded);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const passcodePin = useSettingsStore((state) => state.passcodePin);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const walletMeta = useTransactionStore((state) => state.walletMeta);
  const balanceCents = useTransactionStore(selectBalanceCents);
  const completeOnboarding = useTransactionStore((state) => state.completeOnboarding);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const undoTransaction = useTransactionStore((state) => state.undoTransaction);
  const clearAllData = useTransactionStore((state) => state.clearAllData);
  const locale = language || 'en-US';
  const formatAmount = useCallback(
    (value: number) => formatCurrency(value, { currencyCode, locale }),
    [currencyCode, locale]
  );

  const [search, setSearch] = useState('');
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<string | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPhase, setManualPhase] = useState<'amount' | 'category'>('amount');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [receiptText, setReceiptText] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  const [personalGreeting, setPersonalGreeting] = useState(fallbackGreeting());
  const [isGreetingLoading, setIsGreetingLoading] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<'balance' | 'voice'>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });

  const [gemmaVisible, setGemmaVisible] = useState(false);
  const [gemmaText, setGemmaText] = useState('');
  const [isGemmaLoading, setIsGemmaLoading] = useState(false);

  const [sessionUnlocked, setSessionUnlocked] = useState(!passcodeEnabled || !passcodePin);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const rawGemmaOutput = useRef('');
  const greetingRefreshRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (passcodeEnabled && passcodePin) {
      setSessionUnlocked(false);
    } else {
      setSessionUnlocked(true);
    }
    setPasscodeInput('');
    setPasscodeError('');
  }, [passcodeEnabled, passcodePin]);

  useEffect(() => {
    const hasKey =
      (aiProvider === 'google' && geminiApiKey?.trim()) ||
      (aiProvider === 'huggingface' && huggingFaceToken?.trim()) ||
      (aiProvider === 'local' && localModelDownloaded);

    if (!hasKey) {
      setPersonalGreeting(fallbackGreeting());
      setIsGreetingLoading(false);
      return;
    }
    const now = Date.now();
    if (now - greetingRefreshRef.current < 4 * 60 * 1000) {
      return;
    }
    let cancelled = false;
    setIsGreetingLoading(true);
    (async () => {
      try {
        const greetingText = await generatePersonalGreeting(transactions, {
          aiProvider,
          geminiApiKey,
          huggingFaceToken,
          localModelDownloaded,
          currencyCode,
          locale,
          region,
          model: gemmaModel,
        });
        if (cancelled) {
          return;
        }
        setPersonalGreeting(greetingText || fallbackGreeting());
      } catch {
        if (cancelled) return;
        setPersonalGreeting(fallbackGreeting());
      } finally {
        if (!cancelled) {
          greetingRefreshRef.current = Date.now();
          setIsGreetingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aiProvider, currencyCode, geminiApiKey, huggingFaceToken, localModelDownloaded, gemmaModel, locale, region, transactions]);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(() => categories.filter((item) => item.kind === 'income'), [categories]);

  const activeCategories = txType === 'expense' ? expenseCategories : incomeCategories;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const category = categoryById(categories, item.categoryId);
      const text = [item.note ?? '', category?.name ?? '', category?.emoji ?? '', formatAmount(item.amountCents)]
        .join(' ')
        .toLowerCase();

      const matchesQuery = search.trim() ? text.includes(search.trim().toLowerCase()) : true;
      const matchesCategory = selectedExpenseCategoryId
        ? item.type === 'expense' && item.categoryId === selectedExpenseCategoryId
        : true;

      return matchesQuery && matchesCategory;
    });
  }, [categories, formatAmount, search, selectedExpenseCategoryId, transactions]);

  const pushSnackbar = (text: string, txId: string) => {
    setSnackbar({ visible: true, text, txId });
  };

  const handleUnlock = async () => {
    if (passcodeInput === passcodePin) {
      setSessionUnlocked(true);
      setPasscodeInput('');
      setPasscodeError('');
      await Haptics.selectionAsync();
    } else {
      setPasscodeError('Incorrect passcode.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleKeypadInput = async (key: (typeof keypadRows)[number][number], setValue: (next: string) => void, value: string) => {
    if (key === '⌫') {
      setValue(value.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (value.includes('.') || value.length === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setValue(`${value}.`);
      return;
    }
    const [whole, decimal] = value.split('.');
    if (whole.length >= 8 && !decimal) return;
    if (decimal && decimal.length >= 2) return;
    setValue(`${value}${key}`);
    await Haptics.selectionAsync();
  };

  const openManualFlow = async () => {
    setManualAmount('');
    setManualNote('');
    setReceiptText('');
    setManualPhase('amount');
    setTxType('expense');
    setManualVisible(true);
    await Haptics.selectionAsync();
  };

  const saveManual = async (categoryId: string) => {
    const amountCents = amountTextToCents(manualAmount);
    if (amountCents <= 0) return;

    const category = categoryById(categories, categoryId);
    let tx;
    const note = [manualNote, receiptText].filter(Boolean).join(' • ').trim() || undefined;
    if (txType === 'expense') {
      tx = addExpense({ amountCents, categoryId, note });
    } else {
      tx = addIncome({ amountCents, categoryId, note });
    }

    setManualVisible(false);
    setManualAmount('');
    setManualNote('');
    setReceiptText('');
    setManualPhase('amount');
    pushSnackbar(`Logged ${formatAmount(amountCents)} for ${category?.name ?? 'category'}`, tx.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const askGemma = async () => {
    setGemmaVisible(true);
    setGemmaText('');
    setIsGemmaLoading(true);
    rawGemmaOutput.current = '';
    try {
      const generator = streamFinancialAnalysis(
        transactions,
        {
          aiProvider,
          geminiApiKey,
          huggingFaceToken,
          localModelDownloaded,
          currencyCode,
          locale,
          region,
          model: gemmaModel,
          advanced: advancedSummariesEnabled,
        },
        {
          onCommand: (command) => {
            const category = expenseCategories.find((c) =>
              c.name.toLowerCase().includes(command.categoryHint.toLowerCase())
            );
            const tx = addExpense({
              amountCents: command.amountCents,
              categoryId: category?.id ?? expenseCategories[0]?.id ?? 'expense-misc',
              note: command.note || 'AI-added expense',
            });
            pushSnackbar(`AI added ${formatAmount(command.amountCents)} for ${category?.name ?? 'expense'}`, tx.id);
          },
        }
      );
      for await (const chunk of generator) {
        rawGemmaOutput.current = `${rawGemmaOutput.current}${chunk}`;
        setGemmaText(rawGemmaOutput.current.trim());
      }
    } catch {
      setGemmaText('Oops, the AI had an issue processing this request.');
    } finally {
      setIsGemmaLoading(false);
    }
  };

  if (passcodeEnabled && passcodePin && !sessionUnlocked) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', padding: 24 }]}>
        <View style={{ gap: 16 }}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Unlock wallet
          </Text>
          <TextInput
            mode="outlined"
            label="Passcode"
            value={passcodeInput}
            onChangeText={(val) => {
              setPasscodeInput(val);
              setPasscodeError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
          {passcodeError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {passcodeError}
            </Text>
          ) : null}
          <Button mode="contained" onPress={() => void handleUnlock()} disabled={!passcodeInput}>
            Unlock
          </Button>
          <Button
            mode="text"
            onPress={async () => {
              clearAllData();
              resetSettings();
              setSessionUnlocked(true);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }}
          >
            Reset all data (clears passcode)
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!walletMeta.hasCompletedOnboarding) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.onboardingContainer}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Welcome to GemWallet
          </Text>

          {onboardingPhase === 'balance' ? (
            <>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                How much cash is in your pocket right now?
              </Text>
              <Text variant="displaySmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                {openingBalance ? `$${openingBalance}` : '$0.00'}
              </Text>

              <View style={styles.keypadGrid}>
                {keypadRows.map((row) => (
                  <View key={row.join('')} style={styles.keypadRow}>
                    {row.map((key) => (
                      <TouchableRipple
                        key={key}
                        onPress={() => {
                          void handleKeypadInput(key, setOpeningBalance, openingBalance);
                        }}
                        style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceVariant }]}
                        borderless
                      >
                        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                          {key}
                        </Text>
                      </TouchableRipple>
                    ))}
                  </View>
                ))}
              </View>

              <Button
                mode="contained"
                disabled={amountTextToCents(openingBalance) <= 0}
                onPress={() => setOnboardingPhase('voice')}
                style={styles.pillButton}
              >
                Set balance
              </Button>
            </>
          ) : (
            <Card style={[styles.voiceCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Card.Content style={{ gap: 14 }}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                  Enable AI assistant?
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Log expenses seamlessly with AI insights.
                </Text>
                <View style={styles.voiceButtons}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      completeOnboarding({
                        initialBalanceCents: amountTextToCents(openingBalance),
                        voiceAssistantEnabled: true,
                      });
                    }}
                    style={styles.pillButton}
                  >
                    Enable features
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      completeOnboarding({
                        initialBalanceCents: amountTextToCents(openingBalance),
                        voiceAssistantEnabled: false,
                      });
                    }}
                    style={styles.pillButton}
                  >
                    Skip for now
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
              {personalGreeting}
            </Text>
            {isGreetingLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
          </View>
          <IconButton
            icon="cog"
            size={24}
            iconColor={theme.colors.onSurfaceVariant}
            onPress={() => router.push('/settings')}
          />
        </View>

        <View style={styles.heroSection}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Available Cash
          </Text>
          <View style={styles.balanceContainer}>
            <View style={[styles.balanceGlow, { backgroundColor: applyOpacity(theme.colors.primary, 0.15) }]} />
            <Text
              variant="displayLarge"
              style={{
                color: theme.colors.onSurface,
                fontWeight: 'bold',
                fontSize: 48,
              }}
            >
              {formatAmount(balanceCents)}
            </Text>
          </View>
          <View style={styles.quickActionsRow}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => void openManualFlow()}
              style={[styles.heroButton, { backgroundColor: theme.colors.primary }]}
              labelStyle={{ color: theme.colors.onPrimary }}
            >
              Add Funds
            </Button>
            <Button
              mode="contained"
              icon="send"
              onPress={() => void openManualFlow()}
              style={[styles.heroButton, { backgroundColor: theme.colors.surfaceContainerHigh }]}
              labelStyle={{ color: theme.colors.onSurface }}
            >
              Send
            </Button>
          </View>
        </View>
      </View>

      <View style={[styles.bottomSheet, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <TextInput
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            placeholder="Search transactions"
            left={<TextInput.Icon icon="magnify" color={theme.colors.onSurfaceVariant} />}
            right={search ? <TextInput.Icon icon="close-circle" onPress={() => setSearch('')} /> : null}
            style={styles.searchBar}
            outlineStyle={{ borderRadius: 20, borderColor: theme.colors.outlineVariant }}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Chip
              selected={!selectedExpenseCategoryId}
              onPress={() => setSelectedExpenseCategoryId(null)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: !selectedExpenseCategoryId
                    ? theme.colors.secondaryContainer
                    : theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              selectedColor={theme.colors.onSecondaryContainer}
            >
              All
            </Chip>
            {expenseCategories.map((item) => (
              <Chip
                key={item.id}
                selected={selectedExpenseCategoryId === item.id}
                onPress={() => setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id))}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedExpenseCategoryId === item.id
                        ? theme.colors.secondaryContainer
                        : theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                selectedColor={theme.colors.onSecondaryContainer}
              >
                {item.emoji} {item.name}
              </Chip>
            ))}
          </ScrollView>

          <View style={styles.transactionsList}>
            {filteredTransactions.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 40 }}>
                No recent transactions
              </Text>
            ) : (
              filteredTransactions.map((item) => {
                const category = categoryById(categories, item.categoryId);
                const isIncome = item.type === 'income';
                return (
                  <View key={item.id} style={[styles.txRow, { borderBottomColor: theme.colors.outlineVariant }]}>
                    <View style={[styles.txIconContainer, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                      <Text style={{ fontSize: 20 }}>{category?.emoji ?? '💸'}</Text>
                    </View>
                    <View style={styles.txDetails}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
                        {item.note || category?.name || 'Transaction'}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatTime(item.timestamp, locale)} • {category?.name ?? 'General'}
                      </Text>
                    </View>
                    <Text
                      variant="titleMedium"
                      style={{
                        color: isIncome ? theme.colors.tertiary : theme.colors.onSurface,
                        fontWeight: '700',
                      }}
                    >
                      {isIncome ? '+' : '-'}{formatAmount(item.amountCents)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>

      <FAB
        icon="sparkles"
        style={[styles.aiFab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => void askGemma()}
      />

      <Modal visible={manualVisible} transparent animationType="slide" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => setManualVisible(false)}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.onSurfaceVariant }]} />

            <SegmentedButtons
              value={txType}
              onValueChange={async (val) => {
                setTxType(val as 'expense' | 'income');
                await Haptics.selectionAsync();
              }}
              buttons={[
                { value: 'expense', label: 'Expense', icon: 'minus' },
                { value: 'income', label: 'Income', icon: 'plus' },
              ]}
              style={{ marginBottom: 16 }}
            />

            {manualPhase === 'amount' ? (
              <>
                <Text variant="displayMedium" style={{ color: txType === 'income' ? theme.colors.tertiary : theme.colors.onSurface, textAlign: 'center', fontWeight: 'bold', marginVertical: 16 }}>
                  {txType === 'income' ? '+' : '-'}{manualAmount ? `$${manualAmount}` : '$0.00'}
                </Text>

                <View style={styles.keypadGrid}>
                  {keypadRows.map((row) => (
                    <View key={row.join('')} style={styles.keypadRow}>
                      {row.map((key) => (
                        <TouchableRipple
                          key={key}
                          onPress={() => void handleKeypadInput(key, setManualAmount, manualAmount)}
                          style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceContainer }]}
                          borderless
                        >
                          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {key}
                          </Text>
                        </TouchableRipple>
                      ))}
                    </View>
                  ))}
                </View>

                <Button
                  mode="contained"
                  disabled={amountTextToCents(manualAmount) <= 0}
                  onPress={() => setManualPhase('category')}
                  style={[styles.pillButton, { marginTop: 16 }]}
                  contentStyle={{ height: 56 }}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
                  Pick a category to save instantly
                </Text>
                <TextInput
                  mode="outlined"
                  label="Receipt/IOU note (paste photo text)"
                  value={receiptText}
                  onChangeText={setReceiptText}
                  multiline
                  style={{ marginBottom: 8 }}
                />
                <TextInput
                  mode="outlined"
                  label="Quick note"
                  value={manualNote}
                  onChangeText={setManualNote}
                  style={{ marginBottom: 8 }}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {['Receipt', 'IOU', 'Reimbursable'].map((tag) => (
                    <Chip
                      key={tag}
                      onPress={() => setManualNote((prev) => (prev ? `${prev} ${tag}` : tag))}
                      mode="outlined"
                    >
                      {tag}
                    </Chip>
                  ))}
                </ScrollView>
                <ScrollView contentContainerStyle={styles.categoryGrid}>
                  {activeCategories.map((item) => (
                    <TouchableRipple
                      key={item.id}
                      onPress={() => void saveManual(item.id)}
                      style={[
                        styles.categoryCell,
                        { backgroundColor: theme.colors.surfaceContainer },
                      ]}
                      borderless
                    >
                      <>
                        <Text variant="headlineMedium">{item.emoji}</Text>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                          {item.name}
                        </Text>
                      </>
                    </TouchableRipple>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={gemmaVisible} transparent animationType="slide" onRequestClose={() => setGemmaVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => setGemmaVisible(false)}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                minHeight: '50%',
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 16 }}>
              ✨ AI Assistant
            </Text>

            <ScrollView style={{ flexGrow: 0, maxHeight: 400 }}>
              {isGemmaLoading && !gemmaText ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                  <ActivityIndicator size="large" />
                  <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
                    Analyzing your spending habits...
                  </Text>
                </View>
              ) : (
                <Markdown
                  style={{
                    body: { color: theme.colors.onSurface, fontSize: 16, lineHeight: 24 },
                    table: { borderColor: theme.colors.outlineVariant, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
                    tr: { borderBottomWidth: 1, borderColor: theme.colors.outlineVariant },
                    th: { fontWeight: 'bold', padding: 8, backgroundColor: theme.colors.surfaceVariant },
                    td: { padding: 8 },
                  }}
                >
                  {gemmaText}
                </Markdown>
              )}
            </ScrollView>

            <Button
              mode="contained"
              onPress={() => setGemmaVisible(false)}
              style={[styles.pillButton, { marginTop: 24 }]}
            >
              Close
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((current) => ({ ...current, visible: false }))}
        duration={4000}
        action={
          snackbar.txId
            ? {
              label: 'Undo',
              onPress: () => {
                undoTransaction(snackbar.txId);
              },
            }
            : undefined
        }
      >
        {snackbar.text}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  balanceContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  balanceGlow: {
    position: 'absolute',
    width: 200,
    height: 100,
    borderRadius: 100,
    opacity: 0.9,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  heroButton: {
    borderRadius: 24,
    paddingHorizontal: 12,
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  searchBar: {
    height: 52,
    marginBottom: 16,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 24,
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
  },
  transactionsList: {
    gap: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txDetails: {
    flex: 1,
    gap: 4,
  },
  aiFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 16,
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  keypadGrid: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadKey: {
    flex: 1,
    minHeight: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButton: {
    borderRadius: 28,
  },
  voiceCard: {
    borderRadius: 28,
  },
  voiceButtons: {
    gap: 10,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  sheetCard: {
    padding: 24,
    paddingBottom: 40,
    gap: 8,
    borderWidth: 1,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryCell: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
