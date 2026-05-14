import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, useRef, useEffect } from 'react';
import { ScrollView, SectionList, StyleSheet, View, Animated, Dimensions } from 'react-native';
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
  ActivityIndicator,
  Appbar,
  List,
  Avatar,
  Portal,
  Surface,
  Modal
} from 'react-native-paper';

import { useTransactionStore, selectBalanceCents } from '../store/useTransactionStore';
import type { Category, Transaction } from '../types/finance';
import { streamFinancialAnalysis, parseTransactionsWithAI } from '../services/gemma';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

type ManualPhase = 'amount' | 'category';
type OnboardingPhase = 'balance' | 'voice';

function formatCurrency(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatRelativeDate(timestamp: number) {
  const now = new Date();
  const target = new Date(timestamp);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const then = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const diffDays = Math.floor((today - then) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return target.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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

// Odometer-like animated number
function AnimatedBalance({ value, style, variant = 'displayLarge' }: { value: number, style?: any, variant?: any }) {
  const animatedValue = useRef(new Animated.Value(value)).current;
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();

    const id = animatedValue.addListener((v) => {
      setDisplayValue(Math.floor(v.value));
    });
    return () => animatedValue.removeListener(id);
  }, [value]);

  return (
    <Text variant={variant} style={style}>
      {value < 0 ? '-' : ''}{formatCurrency(displayValue)}
    </Text>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const walletMeta = useTransactionStore((state) => state.walletMeta);
  const balanceCents = useTransactionStore(selectBalanceCents);
  const completeOnboarding = useTransactionStore((state) => state.completeOnboarding);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);
  const undoTransaction = useTransactionStore((state) => state.undoTransaction);

  const [search, setSearch] = useState('');
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<string | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPhase, setManualPhase] = useState<ManualPhase>('amount');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });

  // Gemma state
  const [gemmaVisible, setGemmaVisible] = useState(false);
  const [gemmaText, setGemmaText] = useState('');
  const [isGemmaLoading, setIsGemmaLoading] = useState(false);

  const [aiInputVisible, setAiInputVisible] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Scroll animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [80, 120],
    outputRange: [0, 1],
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
      const text = [item.note ?? '', category?.name ?? '', category?.emoji ?? '', formatCurrency(item.amountCents)]
        .join(' ')
        .toLowerCase();

      const matchesQuery = search.trim() ? text.includes(search.trim().toLowerCase()) : true;
      const matchesCategory = selectedExpenseCategoryId
        ? item.type === 'expense' && item.categoryId === selectedExpenseCategoryId
        : true;

      return matchesQuery && matchesCategory;
    });
  }, [categories, search, selectedExpenseCategoryId, transactions]);

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
      const key = formatRelativeDate(item.timestamp);
      const current = groups.get(key) ?? [];
      groups.set(key, [...current, item]);
    }

    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filteredTransactions]);

  const pushSnackbar = (text: string, txId: string) => {
    setSnackbar({ visible: true, text, txId });
  };

  const handleKeypadInput = async (key: (typeof keypadRows)[number][number], setValue: (next: string) => void, value: string) => {
    if (key === '⌫') {
      setValue(value.slice(0, -1));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    if (key === '.') {
      if (value.includes('.') || value.length === 0) {
        shake();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setValue(`${value}.`);
      await Haptics.selectionAsync();
      return;
    }

    const [whole, decimal] = value.split('.');
    if (whole.length >= 8 && !decimal && (key as string) !== '⌫') {
      shake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (decimal && decimal.length >= 2 && (key as string) !== '⌫') {
      shake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setValue(`${value}${key}`);
    await Haptics.selectionAsync();
  };

  const openManualFlow = async () => {
    setSelectedTransaction(null);
    setManualAmount('');
    setManualNote('');
    setManualPhase('amount');
    setTxType('expense');
    setManualVisible(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const saveManual = async (categoryId: string) => {
    const amountCents = amountTextToCents(manualAmount);
    if (amountCents <= 0) return;

    const category = categoryById(categories, categoryId);
    
    if (selectedTransaction) {
      updateTransaction({
        id: selectedTransaction.id,
        amountCents,
        categoryId,
        type: txType,
        note: manualNote,
      });
      pushSnackbar(`Updated ${category?.name ?? 'transaction'}`, '');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      let tx;
      if (txType === 'expense') {
        tx = addExpense({ amountCents, categoryId, note: manualNote });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        tx = addIncome({ amountCents, categoryId, note: manualNote });
        // "Reward" sequence
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      pushSnackbar(`Logged ${formatCurrency(amountCents)} for ${category?.name ?? 'category'}`, tx.id);
    }
    
    setManualVisible(false);
    setSelectedTransaction(null);
    setManualAmount('');
    setManualNote('');
    setManualPhase('amount');
  };

  const askGemma = async () => {
    setGemmaVisible(true);
    setGemmaText('');
    setIsGemmaLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const generator = streamFinancialAnalysis(transactions);
      for await (const chunk of generator) {
        setGemmaText((prev) => prev + chunk);
      }
    } catch (e) {
      setGemmaText("Oops, Gemma had an issue processing this request.");
    } finally {
      setIsGemmaLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={{ gap: 16, marginBottom: 8 }}>
      <Card
        mode="contained"
        style={{
          borderRadius: 32,
          backgroundColor:
            balanceCents === 0
              ? theme.colors.surfaceVariant
              : balanceCents < 0
                ? theme.colors.errorContainer
                : theme.colors.primaryContainer,
        }}
      >
        <Card.Content style={{ padding: 24 }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.8 }}>
            {selectedExpenseCategoryId || search.trim() ? 'Filtered spend' : 'Available cash'}
          </Text>
          <AnimatedBalance 
            value={selectedExpenseCategoryId || search.trim() ? filteredSpendCents : balanceCents}
            variant="displayLarge"
            style={{
              color:
                balanceCents < 0 && !(selectedExpenseCategoryId || search.trim())
                  ? theme.colors.onErrorContainer
                  : theme.colors.onSurface,
              fontWeight: 'bold',
              marginTop: 4
            }}
          />
        </Card.Content>
      </Card>

      <TextInput
        mode="outlined"
        value={search}
        onChangeText={setSearch}
        placeholder="Search transactions"
        left={<TextInput.Icon icon="magnify" />}
        right={search ? <TextInput.Icon icon="close" onPress={async () => {
          setSearch('');
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }} /> : null}
        style={{ backgroundColor: theme.colors.surface }}
        outlineStyle={{ borderRadius: 28 }}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        <Chip 
          selected={!selectedExpenseCategoryId} 
          onPress={async () => {
            setSelectedExpenseCategoryId(null);
            await Haptics.selectionAsync();
          }} 
          style={{ borderRadius: 16 }}
        >
          All
        </Chip>
        {expenseCategories.map((item) => (
          <Chip
            key={item.id}
            selected={selectedExpenseCategoryId === item.id}
            onPress={async () => {
              setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id));
              await Haptics.selectionAsync();
            }}
            style={{ borderRadius: 16 }}
          >
            {item.emoji} {item.name}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  if (!walletMeta.hasCompletedOnboarding) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 24 }}>
          <Text variant="headlineLarge" style={{ textAlign: 'center', fontWeight: 'bold' }}>
            GemWallet
          </Text>

          {onboardingPhase === 'balance' ? (
            <Surface style={{ padding: 24, borderRadius: 32, gap: 24 }} elevation={1}>
              <Text variant="titleLarge" style={{ textAlign: 'center', opacity: 0.7 }}>
                Initial cash balance
              </Text>
              <Text variant="displayLarge" style={{ textAlign: 'center', color: theme.colors.primary, fontWeight: 'bold' }}>
                {openingBalance ? `$${openingBalance}` : '$0.00'}
              </Text>

              <Animated.View style={[styles.keypadGrid, { transform: [{ translateX: shakeAnim }] }]}>
                {keypadRows.map((row) => (
                  <View key={row.join('')} style={styles.keypadRow}>
                    {row.map((key) => (
                      <Button
                        key={key}
                        mode="text"
                        style={{ flex: 1, height: 64, justifyContent: 'center' }}
                        labelStyle={{ fontSize: 24 }}
                        onPress={() => {
                          void handleKeypadInput(key, setOpeningBalance, openingBalance);
                        }}
                      >
                        {key}
                      </Button>
                    ))}
                  </View>
                ))}
              </Animated.View>

              <Button
                mode="contained"
                disabled={amountTextToCents(openingBalance) <= 0}
                onPress={async () => {
                  setOnboardingPhase('voice');
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                contentStyle={{ height: 56 }}
                style={{ borderRadius: 28 }}
              >
                Continue
              </Button>
            </Surface>
          ) : (
            <Card style={{ borderRadius: 32 }}> 
              <Card.Content style={{ gap: 16, padding: 24 }}>
                <Text variant="headlineSmall" style={{ textAlign: 'center', fontWeight: 'bold' }}>
                  Voice Assistant
                </Text>
                <Text variant="bodyLarge" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, lineHeight: 24 }}>
                  Enable Gemma to log expenses hands-free using local-only AI processing.
                </Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  <Button
                    mode="contained"
                    onPress={async () => {
                      completeOnboarding({
                        initialBalanceCents: amountTextToCents(openingBalance),
                        voiceAssistantEnabled: true,
                      });
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    contentStyle={{ height: 56 }}
                    style={{ borderRadius: 28 }}
                  >
                    Enable Microphone
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={async () => {
                      completeOnboarding({
                        initialBalanceCents: amountTextToCents(openingBalance),
                        voiceAssistantEnabled: false,
                      });
                      await Haptics.selectionAsync();
                    }}
                    contentStyle={{ height: 56 }}
                    style={{ borderRadius: 28 }}
                  >
                    Skip for Now
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}> 
      <Appbar.Header elevated mode="center-aligned">
        <Appbar.Content 
          title={greeting()} 
          titleStyle={{ fontWeight: 'bold' }} 
        />
        <Animated.View style={{ 
          position: 'absolute', 
          left: 0, 
          right: 0, 
          alignItems: 'center',
          opacity: headerOpacity,
          pointerEvents: 'none'
        }}>
          <AnimatedBalance 
            value={balanceCents} 
            variant="titleLarge" 
            style={{ fontWeight: 'bold' }} 
          />
        </Animated.View>
        <Appbar.Action icon="cog-outline" onPress={() => router.push('/settings')} />
      </Appbar.Header>

      <SectionList
        sections={groupedTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={renderHeader()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        renderSectionHeader={({ section }) => (
          <List.Subheader style={{ paddingHorizontal: 0, marginTop: 16, fontWeight: 'bold', color: theme.colors.primary }}>
            {section.title.toUpperCase()}
          </List.Subheader>
        )}
        renderItem={({ item }) => {
          const category = categoryById(categories, item.categoryId);
          return (
            <TouchableRipple 
              onPress={async () => {
                setSelectedTransaction(item);
                setDetailVisible(true);
                await Haptics.selectionAsync();
              }}
              style={{ borderRadius: 16, overflow: 'hidden' }}
            >
              <List.Item
                title={item.note || category?.name || 'Transaction'}
                titleStyle={{ fontWeight: '600' }}
                description={formatTime(item.timestamp)}
                left={props => (
                  <Avatar.Text 
                    {...props} 
                    label={category?.emoji ?? '💸'} 
                    size={48}
                    style={{ backgroundColor: theme.colors.secondaryContainer, borderRadius: 16 }}
                    labelStyle={{ fontSize: 24 }}
                  />
                )}
                right={props => (
                  <View {...props} style={{ justifyContent: 'center', alignItems: 'flex-end', minWidth: 80 }}>
                    <Text
                      variant="titleMedium"
                      style={{
                        fontWeight: 'bold',
                        color:
                          item.type === 'income'
                            ? theme.colors.tertiary
                            : balanceCents < 0
                              ? theme.colors.error
                              : theme.colors.onSurface,
                      }}
                    >
                      {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amountCents)}
                    </Text>
                  </View>
                )}
                style={{ paddingHorizontal: 0 }}
              />
            </TouchableRipple>
          );
        }}
        ItemSeparatorComponent={() => <Divider style={{ opacity: 0.5 }} />}
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center', gap: 16 }}>
            <Avatar.Icon size={80} icon="wallet-outline" style={{ backgroundColor: theme.colors.surfaceVariant }} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Your wallet is empty.{"\n"}Tap + to log your first expense.
            </Text>
          </View>
        }
      />

      <FAB
        icon="sparkles"
        label="Ask AI"
        style={{ position: 'absolute', left: 16, bottom: 24, borderRadius: 16 }}
        onPress={() => {
          void askGemma();
        }}
      />

      <FAB
        icon="plus"
        style={{ position: 'absolute', right: 16, bottom: 24, borderRadius: 16 }}
        onPress={() => {
          void openManualFlow();
        }}
        onLongPress={async () => {
          setQuickActionsVisible(true);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }}
      />

      <Portal>
        <Modal 
          visible={detailVisible} 
          onDismiss={() => setDetailVisible(false)}
          contentContainerStyle={{ justifyContent: 'flex-end', flex: 1 }}
        >
          <Surface style={{ padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, gap: 16, paddingBottom: insets.bottom + 24 }} elevation={5}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: 'center', marginBottom: 8 }} />
            
            {selectedTransaction && (
              <>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Avatar.Text 
                    label={categoryById(categories, selectedTransaction.categoryId)?.emoji ?? '💸'} 
                    size={64}
                    style={{ backgroundColor: theme.colors.secondaryContainer, borderRadius: 24 }}
                    labelStyle={{ fontSize: 32 }}
                  />
                  <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}{formatCurrency(selectedTransaction.amountCents)}
                  </Text>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    {categoryById(categories, selectedTransaction.categoryId)?.name ?? 'Unknown Category'}
                  </Text>
                </View>

                <Divider style={{ marginVertical: 8 }} />

                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Date</Text>
                    <Text variant="bodyLarge">{formatRelativeDate(selectedTransaction.timestamp)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Time</Text>
                    <Text variant="bodyLarge">{formatTime(selectedTransaction.timestamp)}</Text>
                  </View>
                  {selectedTransaction.note && (
                    <View style={{ gap: 4 }}>
                      <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>Note</Text>
                      <Text variant="bodyLarge">{selectedTransaction.note}</Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <Button
                    mode="contained-tonal"
                    icon="pencil-outline"
                    onPress={async () => {
                      // Pre-populate manual flow for editing
                      setTxType(selectedTransaction.type);
                      setManualAmount((selectedTransaction.amountCents / 100).toString());
                      setManualNote(selectedTransaction.note ?? '');
                      setManualPhase('amount');
                      setDetailVisible(false);
                      setManualVisible(true);
                      await Haptics.selectionAsync();
                    }}
                    style={{ flex: 1, borderRadius: 16 }}
                  >
                    Edit
                  </Button>
                  <Button
                    mode="contained-tonal"
                    icon="trash-can-outline"
                    textColor={theme.colors.error}
                    onPress={async () => {
                      undoTransaction(selectedTransaction.id);
                      setDetailVisible(false);
                      pushSnackbar('Transaction deleted', selectedTransaction.id);
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    }}
                    style={{ flex: 1, borderRadius: 16 }}
                  >
                    Delete
                  </Button>
                </View>
                
                <Button 
                  mode="text" 
                  onPress={() => setDetailVisible(false)}
                  style={{ borderRadius: 16 }}
                >
                  Close
                </Button>
              </>
            )}
          </Surface>
        </Modal>

        <Modal visible={quickActionsVisible} onDismiss={() => setQuickActionsVisible(false)} contentContainerStyle={{ padding: 24 }}>
          <Surface style={{ padding: 24, borderRadius: 32, gap: 16 }} elevation={3}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>Quick Actions</Text>
            <Button
              mode="contained-tonal"
              icon="chart-donut"
              onPress={() => {
                setQuickActionsVisible(false);
                router.push('/insights');
              }}
              style={{ borderRadius: 16 }}
            >
              View Insights
            </Button>
            <Button
              mode="contained-tonal"
              icon="cog-outline"
              onPress={() => {
                setQuickActionsVisible(false);
                router.push('/settings');
              }}
              style={{ borderRadius: 16 }}
            >
              Open Settings
            </Button>
            <Button
              mode="text"
              icon="robot-outline"
              onPress={async () => {
                setQuickActionsVisible(false);
                setAiInputText('');
                setAiInputVisible(true);
                await Haptics.selectionAsync();
              }}
            >
              Text to AI
            </Button>
            <Button mode="text" onPress={() => setQuickActionsVisible(false)}>Close</Button>
          </Surface>
        </Modal>

        <Modal 
          visible={manualVisible} 
          onDismiss={() => setManualVisible(false)}
          contentContainerStyle={{ justifyContent: 'flex-end', flex: 1 }}
        >
          <Surface style={{ padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, gap: 16, paddingBottom: insets.bottom + 24 }} elevation={4}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: 'center', marginBottom: 8 }} />
            
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
              style={{ borderRadius: 16 }}
            />

            {manualPhase === 'amount' ? (
              <>
                <Text variant="displayLarge" style={{ textAlign: 'center', fontWeight: 'bold', marginVertical: 24, color: txType === 'income' ? theme.colors.tertiary : theme.colors.primary }}>
                  {txType === 'income' ? '+' : '-'}{manualAmount ? `$${manualAmount}` : '$0.00'}
                </Text>

                <Animated.View style={[styles.keypadGrid, { transform: [{ translateX: shakeAnim }] }]}>
                  {keypadRows.map((row) => (
                    <View key={row.join('')} style={styles.keypadRow}>
                      {row.map((key) => (
                        <Button
                          key={key}
                          mode="contained-tonal"
                          style={{ flex: 1, height: 64, borderRadius: 20 }}
                          labelStyle={{ fontSize: 24, fontWeight: 'bold' }}
                          onPress={() => {
                            void handleKeypadInput(key, setManualAmount, manualAmount);
                          }}
                        >
                          {key}
                        </Button>
                      ))}
                    </View>
                  ))}
                </Animated.View>

                <Button
                  mode="contained"
                  disabled={amountTextToCents(manualAmount) <= 0}
                  onPress={async () => {
                    setManualPhase('category');
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={{ marginTop: 16, borderRadius: 28 }}
                  contentStyle={{ height: 60 }}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Text variant="titleLarge" style={{ textAlign: 'center', marginBottom: 8, fontWeight: 'bold' }}>
                  Pick Category
                </Text>
                
                <TextInput
                  mode="outlined"
                  label="Note (optional)"
                  value={manualNote}
                  onChangeText={setManualNote}
                  placeholder="What was this for?"
                  style={{ marginBottom: 16, backgroundColor: theme.colors.surface }}
                  outlineStyle={{ borderRadius: 16 }}
                />

                <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                  {activeCategories.map((item) => (
                    <Surface
                      key={item.id}
                      style={{ borderRadius: 24, overflow: 'hidden' }}
                      elevation={1}
                    >
                      <TouchableRipple
                        onPress={() => {
                          void saveManual(item.id);
                        }}
                        style={{ width: (SCREEN_WIDTH - 80) / 3, aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}
                      >
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ fontSize: 32 }}>{item.emoji}</Text>
                          <Text variant="labelLarge" style={{ marginTop: 8, fontWeight: 'bold' }}>
                            {item.name}
                          </Text>
                        </View>
                      </TouchableRipple>
                    </Surface>
                  ))}
                </ScrollView>
                <Button 
                  mode="outlined" 
                  onPress={() => setManualPhase('amount')}
                  style={{ marginTop: 16, borderRadius: 28 }}
                >
                  Back to Amount
                </Button>
              </>
            )}
          </Surface>
        </Modal>

        <Modal 
          visible={gemmaVisible} 
          onDismiss={() => setGemmaVisible(false)}
          contentContainerStyle={{ justifyContent: 'flex-end', flex: 1 }}
        >
          <Surface style={{ padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, gap: 16, paddingBottom: insets.bottom + 24, minHeight: '40%' }} elevation={5}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: 'center', marginBottom: 8 }} />
            <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>✨ AI Analysis</Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {isGemmaLoading && !gemmaText ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <ActivityIndicator size="large" />
                  <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Gemma is analyzing your spending patterns...
                  </Text>
                </View>
              ) : (
                <Text variant="bodyLarge" style={{ lineHeight: 28 }}>
                  {gemmaText}
                </Text>
              )}
            </ScrollView>

            <Button
              mode="contained"
              onPress={() => setGemmaVisible(false)}
              style={{ marginTop: 8, borderRadius: 28 }}
            >
              Dismiss
            </Button>
          </Surface>
        </Modal>
        <Modal 
          visible={aiInputVisible} 
          onDismiss={() => setAiInputVisible(false)}
          contentContainerStyle={{ justifyContent: 'flex-end', flex: 1 }}
        >
          <Surface style={{ padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32, gap: 16, paddingBottom: insets.bottom + 24 }} elevation={5}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.outlineVariant, alignSelf: 'center', marginBottom: 8 }} />
            <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>AI Text Input</Text>
            
            <TextInput
              mode="outlined"
              value={aiInputText}
              onChangeText={setAiInputText}
              placeholder="e.g. Bought a coffee for 5 bucks"
              multiline
              numberOfLines={3}
              style={{ backgroundColor: theme.colors.surfaceVariant }}
              outlineStyle={{ borderRadius: 16 }}
            />

            <Button
              mode="contained"
              loading={isAiProcessing}
              disabled={isAiProcessing || !aiInputText.trim()}
              onPress={async () => {
                setIsAiProcessing(true);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                try {
                  const result = await parseTransactionsWithAI(aiInputText, categories);
                  if (Array.isArray(result)) {
                    let totalAmount = 0;
                    for (const item of result) {
                      const amountCents = item.amount;
                      const catName = item.category;
                      const foundCategory = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                      const categoryId = foundCategory ? foundCategory.id : 'expense-misc';
                      addExpense({ amountCents, categoryId, note: item.item });
                      totalAmount += amountCents;
                    }
                    setAiInputVisible(false);
                    pushSnackbar(`AI logged ${result.length} item(s) for ${formatCurrency(totalAmount)}`, '');
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                } catch (error: any) {
                  pushSnackbar(error.message || 'AI failed to parse your input.', '');
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } finally {
                  setIsAiProcessing(false);
                }
              }}
              style={{ marginTop: 8, borderRadius: 28 }}
              contentStyle={{ height: 56 }}
            >
              Parse & Log
            </Button>
          </Surface>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((current) => ({ ...current, visible: false }))}
        duration={4000}
        action={
          snackbar.txId
            ? {
                label: 'Undo',
                onPress: async () => {
                  undoTransaction(snackbar.txId);
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
  keypadGrid: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  }
});
