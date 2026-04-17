import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, View, Animated } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  Divider,
  FAB,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
  SegmentedButtons,
  TouchableRipple,
  Card,
  ActivityIndicator
} from 'react-native-paper';
import { Polyline, Svg } from 'react-native-svg';

import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import type { Category, Transaction } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { parseAddExpenseCommand, streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

type ManualPhase = 'amount' | 'category';
type OnboardingPhase = 'balance' | 'voice';

function formatRelativeDate(timestamp: number, locale: string) {
  const now = new Date();
  const target = new Date(timestamp);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const then = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.floor((today - then) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return target.toLocaleDateString(locale || 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type SeriesPoint = { label: string; value: number };

function buildDailyExpenses(transactions: Transaction[], days: number) {
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const key = new Date(tx.timestamp).toISOString().slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + tx.amountCents);
    }
  }

  const sorted = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({
      label: date.slice(5), // MM-DD
      value,
    }));

  return sorted;
}

function buildWeeklyExpenses(transactions: Transaction[], weeks: number) {
  const now = new Date();
  const buckets = new Map<string, number>();

  const weekKey = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  };

  for (let i = 0; i < weeks; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i * 7);
    buckets.set(weekKey(date), 0);
  }

  for (const tx of transactions) {
    if (tx.type !== 'expense') continue;
    const key = weekKey(new Date(tx.timestamp));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + tx.amountCents);
    }
  }

  const sorted = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([start, value]) => ({
      label: start.slice(5),
      value,
    }));

  return sorted;
}

function detectAnomaly(points: SeriesPoint[]) {
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const latest = points[points.length - 1];
  if (latest.value > avg + stdDev * 1.5 && latest.value > 0) {
    return { label: latest.label, value: latest.value, avg, stdDev };
  }
  return null;
}

function Sparkline({ points, color }: { points: SeriesPoint[]; color: string }) {
  const width = 160;
  const height = 48;
  if (!points.length) {
    return <Text variant="bodySmall" style={{ color }}>No data</Text>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = 0;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, idx) => {
    const x = idx * stepX;
    const y = height - ((p.value - min) / (max - min)) * height;
    return `${x},${Number.isFinite(y) ? y : height}`;
  });

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const passcodePin = useSettingsStore((state) => state.passcodePin);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const setRecurringEnabled = useRecurringStore((state) => state.setRecurringEnabled);
  const addRecurringEvent = useRecurringStore((state) => state.addEvent);
  const recurringEvents = useRecurringStore((state) => state.events);
  const recurringEnabled = useRecurringStore((state) => state.recurringEnabled);
  const goalsEnabled = useGoalsStore((state) => state.goalsEnabled);
  const goals = useGoalsStore((state) => state.goals);

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
  const [manualPhase, setManualPhase] = useState<ManualPhase>('amount');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [receiptText, setReceiptText] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });
  const [recurringSuggestion, setRecurringSuggestion] = useState<{ txId: string; label: string; amountCents: number; categoryId: string; interval: 'weekly' | 'monthly'; type: 'expense' | 'income' } | null>(null);

  // Gemma state
  const [gemmaVisible, setGemmaVisible] = useState(false);
  const [gemmaText, setGemmaText] = useState('');
  const [isGemmaLoading, setIsGemmaLoading] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(!passcodeEnabled || !passcodePin);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Animation values for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastSuggestedId = useRef<string | null>(null);

  useEffect(() => {
    if (passcodeEnabled && passcodePin) {
      setSessionUnlocked(false);
    } else {
      setSessionUnlocked(true);
    }
    setPasscodeInput('');
    setPasscodeError('');
  }, [passcodeEnabled, passcodePin]);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 60],
    extrapolate: 'clamp',
  });

  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.75],
    extrapolate: 'clamp',
  });

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

  const filteredSpendCents = useMemo(
    () =>
      filteredTransactions
        .filter((item) => item.type === 'expense')
        .reduce((sum, item) => sum + item.amountCents, 0),
    [filteredTransactions]
  );

  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, Transaction[]>();

    for (const item of filteredTransactions) {
      const key = formatRelativeDate(item.timestamp, locale);
      const current = groups.get(key) ?? [];
      groups.set(key, [...current, item]);
    }

    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filteredTransactions, locale]);

  const dailyExpenses = useMemo(
    () => buildDailyExpenses(transactions, 14),
    [transactions]
  );

  const weeklyExpenses = useMemo(
    () => buildWeeklyExpenses(transactions, 6),
    [transactions]
  );

  const dailyAnomaly = useMemo(() => detectAnomaly(dailyExpenses), [dailyExpenses]);
  const weeklyAnomaly = useMemo(() => detectAnomaly(weeklyExpenses), [weeklyExpenses]);

  const summarizeSeries = (points: SeriesPoint[]) => {
    if (!points.length) return { latest: 0, changePct: 0 };
    const latest = points[points.length - 1].value;
    const prev = points.length > 1 ? points[points.length - 2].value : 0;
    const changePct = prev ? ((latest - prev) / prev) * 100 : 0;
    return { latest, changePct };
  };

  const dailySummary = summarizeSeries(dailyExpenses);
  const weeklySummary = summarizeSeries(weeklyExpenses);
  const showCoach =
    transactions.length === 0 || !goalsEnabled || goals.length === 0 || !recurringEnabled || recurringEvents.length === 0;

  useEffect(() => {
    if (!transactions.length) return;
    const latest = transactions[0];
    if (latest.id === lastSuggestedId.current) return;
    const matches = transactions.filter(
      (tx) =>
        tx.type === latest.type &&
        tx.categoryId === latest.categoryId &&
        Math.abs(tx.amountCents - latest.amountCents) <= latest.amountCents * 0.1 &&
        tx.id !== latest.id
    );
    if (matches.length < 2) return;
    const timestamps = [latest.timestamp, ...matches.slice(0, 2).map((m) => m.timestamp)].sort((a, b) => b - a);
    const deltas = timestamps.slice(0, 2).map((t, idx) => (idx === timestamps.length - 1 ? 0 : t - timestamps[idx + 1]));
    const avgDelta = deltas[0] || 0;
    let interval: 'weekly' | 'monthly' | null = null;
    const days = avgDelta / (1000 * 60 * 60 * 24);
    if (days >= 5 && days <= 9) interval = 'weekly';
    if (days >= 25 && days <= 35) interval = 'monthly';
    if (!interval) return;

    const alreadyRecurring = recurringEvents.some(
      (ev) =>
        ev.categoryId === latest.categoryId &&
        ev.type === latest.type &&
        Math.abs(ev.amountCents - latest.amountCents) <= latest.amountCents * 0.1
    );
    if (alreadyRecurring) return;

    setRecurringSuggestion({
      txId: latest.id,
      label: categoryById(categories, latest.categoryId)?.name ?? 'category',
      amountCents: latest.amountCents,
      categoryId: latest.categoryId,
      interval,
      type: latest.type,
    });
    lastSuggestedId.current = latest.id;
  }, [categories, recurringEvents, transactions]);

  useEffect(() => {
    if (recurringSuggestion) {
      setSnackbar({
        visible: true,
        text: `Make ${recurringSuggestion.label} ${recurringSuggestion.interval} recurring?`,
        txId: '',
      });
    }
  }, [recurringSuggestion]);

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

  const createRecurringFromSuggestion = async () => {
    if (!recurringSuggestion) return;
    if (!recurringEnabled) {
      setRecurringEnabled(true);
    }
    addRecurringEvent({
      name: recurringSuggestion.label,
      amountCents: recurringSuggestion.amountCents,
      type: recurringSuggestion.type,
      categoryId: recurringSuggestion.categoryId,
      interval: recurringSuggestion.interval,
    });
    setRecurringSuggestion(null);
    await Haptics.selectionAsync();
    pushSnackbar('Recurring event created.', '');
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
    if (whole.length >= 8 && !decimal) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (decimal && decimal.length >= 2) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

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
    try {
      const generator = streamFinancialAnalysis(transactions, {
        apiKey: geminiApiKey,
        currencyCode,
        locale,
        region,
        model: gemmaModel,
        advanced: advancedSummariesEnabled,
      });
      for await (const chunk of generator) {
        const command = parseAddExpenseCommand(chunk);
        if (command) {
          const category = expenseCategories.find((c) =>
            c.name.toLowerCase().includes(command.categoryHint.toLowerCase())
          );
          const tx = addExpense({
            amountCents: command.amountCents,
            categoryId: category?.id ?? expenseCategories[0]?.id ?? 'expense-misc',
            note: command.note || 'Gemma-added expense',
          });
          pushSnackbar(`Gemma added ${formatAmount(command.amountCents)} for ${category?.name ?? 'expense'}`, tx.id);
        } else {
          setGemmaText((prev) => prev + chunk);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Gemma analysis failed', { message, transactionCount: transactions.length });
      setGemmaText('Oops, Gemma had an issue processing this request.');
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
                  Enable Gemma voice assistant?
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Log expenses hands-free with local-first flows.
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
                    Enable microphone
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
    <View style={[styles.screen, { backgroundColor: theme.colors.surfaceContainerLowest }]}> 
      <Animated.View
        style={[
          styles.topBar,
          {
            height: headerHeight,
            paddingTop: insets.top,
            backgroundColor: theme.colors.surfaceContainerHigh,
            shadowColor: theme.colors.shadow,
          },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: titleScale }], transformOrigin: 'left bottom' }}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
            {greeting()}
          </Text>
        </Animated.View>
        <IconButton icon="cog-outline" onPress={() => router.push('/settings')} />
      </Animated.View>

      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <Card
          mode="contained"
          style={[
            styles.heroCard,
            {
              backgroundColor:
                balanceCents === 0
                  ? theme.colors.surfaceVariant
                  : balanceCents < 0
                    ? theme.colors.errorContainer
                    : theme.colors.primaryContainer,
            },
          ]}
        >
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {selectedExpenseCategoryId || search.trim() ? 'Filtered spend' : 'Available cash'}
            </Text>
            <Text
              variant="displaySmall"
              style={{
                color:
                  balanceCents < 0 && !(selectedExpenseCategoryId || search.trim())
                    ? theme.colors.onErrorContainer
                    : theme.colors.onSurface,
                fontWeight: '700',
              }}
            >
              {selectedExpenseCategoryId || search.trim()
                ? formatAmount(filteredSpendCents)
                : formatAmount(balanceCents)}
            </Text>
            {balanceCents === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                📨 Wallet is empty
              </Text>
            ) : null}
            </Card.Content>
          </Card>

          {showCoach ? (
            <Card mode="elevated" style={{ borderRadius: 20, backgroundColor: theme.colors.surface }}>
              <Card.Content style={{ gap: 8 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  Quick setup coach
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Finish these to unlock smoother tracking.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Chip
                    mode="outlined"
                    selected={!transactions.length}
                    onPress={() => void openManualFlow()}
                  >
                    Log first transaction
                  </Chip>
                  <Chip
                    mode="outlined"
                    selected={!goalsEnabled || goals.length === 0}
                    onPress={() => router.push('/settings')}
                  >
                    Create a goal
                  </Chip>
                  <Chip
                    mode="outlined"
                    selected={!recurringEnabled || recurringEvents.length === 0}
                    onPress={() => router.push('/settings')}
                  >
                    Add recurring
                  </Chip>
                  <Chip
                    mode="outlined"
                    onPress={() => router.push('/settings')}
                  >
                    Set backup
                  </Chip>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          <Card
            mode="elevated"
            style={{ borderRadius: 24, backgroundColor: theme.colors.surface }}
            contentStyle={{ padding: 16, gap: 12 }}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              Cashflow trends
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Daily (14d)
                </Text>
                <Sparkline points={dailyExpenses} color={theme.colors.primary} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                  {formatCurrency(dailySummary.latest, { currencyCode, locale })} today
                  {Number.isFinite(dailySummary.changePct) && dailySummary.changePct !== 0
                    ? ` (${dailySummary.changePct > 0 ? '+' : ''}${dailySummary.changePct.toFixed(1)}%) vs prev`
                    : ''}
                </Text>
                {dailyAnomaly ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                    Alert: {formatCurrency(dailyAnomaly.value, { currencyCode, locale })} exceeds typical spend.
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Weekly (6w)
                </Text>
                <Sparkline points={weeklyExpenses} color={theme.colors.tertiary} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                  {formatCurrency(weeklySummary.latest, { currencyCode, locale })} this week
                  {Number.isFinite(weeklySummary.changePct) && weeklySummary.changePct !== 0
                    ? ` (${weeklySummary.changePct > 0 ? '+' : ''}${weeklySummary.changePct.toFixed(1)}%) vs prev`
                    : ''}
                </Text>
                {weeklyAnomaly ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                    Alert: {formatCurrency(weeklyAnomaly.value, { currencyCode, locale })} exceeds typical week.
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          <TextInput
            mode="outlined"
            value={search}
            onChangeText={setSearch}
            label="Search transactions"
          right={<TextInput.Icon icon="close" onPress={() => setSearch('')} />}
          style={{ borderRadius: 24, marginVertical: 8 }}
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
              onPress={() => {
                setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id));
              }}
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

        <SectionList
          sections={groupedTransactions}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => {
            const category = categoryById(categories, item.categoryId);
            return (
              <View
                style={[
                  styles.transactionRow,
                  {
                    backgroundColor: theme.colors.surfaceContainerLow,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                <View style={[styles.emojiCircle, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text variant="titleLarge">{category?.emoji ?? '💸'}</Text>
                </View>

                <View style={styles.txCenter}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
                    {item.note || category?.name || 'Transaction'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatTime(item.timestamp, locale)}
                  </Text>
                </View>

                <Text
                  variant="titleMedium"
                  style={{
                    color:
                      item.type === 'income'
                        ? theme.colors.tertiary
                        : balanceCents < 0
                          ? theme.colors.error
                          : theme.colors.onSurface,
                    textAlign: 'right',
                    minWidth: 96,
                    fontWeight: 'bold',
                  }}
                >
                  {item.type === 'income' ? '+' : '-'}{formatAmount(item.amountCents)}
                </Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <Divider style={{ opacity: 0.5 }} />}
          ListEmptyComponent={
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 24, textAlign: 'center' }}>
              No matching transactions.
            </Text>
          }
        />
      </Animated.ScrollView>

      {/* Ask Gemma FAB */}
      {geminiApiKey?.trim() ? (
        <FAB
          icon="sparkles"
          label="Ask Gemma"
          style={[styles.gemmaFab, { backgroundColor: theme.colors.tertiaryContainer }]}
          color={theme.colors.onTertiaryContainer}
          onPress={() => {
            void askGemma();
          }}
        />
      ) : null}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
        color={theme.colors.onPrimaryContainer}
        onPress={() => {
          void openManualFlow();
        }}
        onLongPress={() => setQuickActionsVisible(true)}
      />

      {/* Quick Actions Modal */}
      <Modal visible={quickActionsVisible} transparent animationType="fade" onRequestClose={() => setQuickActionsVisible(false)}>
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
          onPress={() => setQuickActionsVisible(false)}
        />
        <View
          style={[
            styles.quickActionsCard,
            {
              backgroundColor: theme.colors.surfaceContainerHigh,
              borderRadius: theme.roundness,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        > 
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Quick Actions
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              setQuickActionsVisible(false);
              router.push('/settings');
            }}
          >
            Open settings
          </Button>
          <Button
            mode="text"
            onPress={async () => {
              setQuickActionsVisible(false);
              await Haptics.selectionAsync();
              pushSnackbar('Voice trigger reserved for local Gemma assistant flow.', '');
            }}
          >
            Swipe-up voice (preview)
          </Button>
        </View>
      </Modal>

      {/* Manual Input Modal */}
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
                          onPress={() => {
                            void handleKeypadInput(key, setManualAmount, manualAmount);
                          }}
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
                      onPress={() => {
                        void saveManual(item.id);
                      }}
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

      {/* Gemma Output Modal */}
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
              ✨ Gemma Analysis
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
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                  {gemmaText}
                </Text>
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
            : recurringSuggestion
              ? {
                  label: 'Add recurring',
                  onPress: () => void createRecurringFromSuggestion(),
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
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent', // Will be visually distinct via elevation if needed
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 160,
    gap: 12,
  },
  heroCard: {
    borderRadius: 28,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 8,
  },
  filterChip: {
    borderRadius: 16,
    borderWidth: 1,
  },
  transactionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  emojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  gemmaFab: {
    position: 'absolute',
    left: 16,
    bottom: 24,
    borderRadius: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    borderRadius: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  quickActionsCard: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    minWidth: 220,
    padding: 16,
    gap: 10,
    elevation: 5,
    borderWidth: 1,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    padding: 24,
    paddingBottom: 40,
    gap: 8,
    maxHeight: '92%',
    elevation: 24,
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
    borderRadius: 34, // Fully rounded pill
    justifyContent: 'center',
    alignItems: 'center',
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
  voiceCard: {
    borderRadius: 28,
  },
  voiceButtons: {
    gap: 10,
  },
  pillButton: {
    borderRadius: 28,
  }
});
