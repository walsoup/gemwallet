import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, useRef } from 'react';
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

import { useTransactionStore, selectBalanceCents } from '../store/useTransactionStore';
import type { Category, Transaction } from '../types/finance';
import { streamFinancialAnalysis } from '../services/gemma';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

type ManualPhase = 'amount' | 'category';
type OnboardingPhase = 'balance' | 'voice';

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
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
  const undoTransaction = useTransactionStore((state) => state.undoTransaction);

  const [search, setSearch] = useState('');
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<string | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPhase, setManualPhase] = useState<ManualPhase>('amount');
  const [manualAmount, setManualAmount] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });

  // Gemma state
  const [gemmaVisible, setGemmaVisible] = useState(false);
  const [gemmaText, setGemmaText] = useState('');
  const [isGemmaLoading, setIsGemmaLoading] = useState(false);

  // Animation values for collapsing header
  const scrollY = useRef(new Animated.Value(0)).current;

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
    if (txType === 'expense') {
      tx = addExpense({ amountCents, categoryId });
    } else {
      tx = addIncome({ amountCents, categoryId });
    }
    
    setManualVisible(false);
    setManualAmount('');
    setManualPhase('amount');
    pushSnackbar(`Logged ${formatCurrency(amountCents)} for ${category?.name ?? 'category'}`, tx.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const askGemma = async () => {
    setGemmaVisible(true);
    setGemmaText('');
    setIsGemmaLoading(true);
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
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <Animated.View style={[styles.topBar, { height: headerHeight, paddingTop: insets.top, backgroundColor: theme.colors.surface }]}>
        <Animated.View style={{ transform: [{ scale: titleScale }], transformOrigin: 'left bottom' }}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            {greeting()}
          </Text>
        </Animated.View>
        <IconButton
          icon="cog-outline"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
        />
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
                ? formatCurrency(filteredSpendCents)
                : formatCurrency(balanceCents)}
            </Text>
            {balanceCents === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                📨 Wallet is empty
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <TextInput
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          label="Search transactions"
          right={<TextInput.Icon icon="close" accessibilityLabel="Clear search" onPress={() => setSearch('')} />}
          style={{ borderRadius: 24, marginVertical: 8 }}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Chip selected={!selectedExpenseCategoryId} onPress={() => setSelectedExpenseCategoryId(null)} style={{ borderRadius: 16 }}>
            All
          </Chip>
          {expenseCategories.map((item) => (
            <Chip
              key={item.id}
              selected={selectedExpenseCategoryId === item.id}
              onPress={() => {
                setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id));
              }}
              style={{ borderRadius: 16 }}
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
              <View style={styles.transactionRow}>
                <View style={[styles.emojiCircle, { backgroundColor: theme.colors.secondaryContainer }]}> 
                  <Text variant="titleLarge">{category?.emoji ?? '💸'}</Text>
                </View>

                <View style={styles.txCenter}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }} numberOfLines={1}>
                    {item.note || category?.name || 'Transaction'}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatTime(item.timestamp)}
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
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amountCents)}
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
      <FAB
        icon="sparkles"
        label="Ask Gemma"
        style={[styles.gemmaFab, { backgroundColor: theme.colors.tertiaryContainer }]}
        color={theme.colors.onTertiaryContainer}
        onPress={() => {
          void askGemma();
        }}
      />

      <FAB
        icon="plus"
        accessibilityLabel="Add transaction"
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
        <View style={[styles.quickActionsCard, { backgroundColor: theme.colors.surface, borderRadius: theme.roundness }]}> 
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
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.elevation.level3, borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}> 
            <View style={styles.dragHandle} />
            
            <SegmentedButtons
              value={txType}
              onValueChange={(val) => {
                setTxType(val as 'expense' | 'income');
                Haptics.selectionAsync();
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
                          style={[styles.keypadKey, { backgroundColor: theme.colors.elevation.level1 }]}
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
                <ScrollView contentContainerStyle={styles.categoryGrid}>
                  {activeCategories.map((item) => (
                    <TouchableRipple
                      key={item.id}
                      onPress={() => {
                        void saveManual(item.id);
                      }}
                      style={[styles.categoryCell, { backgroundColor: theme.colors.elevation.level1 }]}
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
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.elevation.level3, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: '50%' }]}> 
            <View style={styles.dragHandle} />
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
  transactionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
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
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#999',
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
