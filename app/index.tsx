import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'react-native-paper';

import { useTransactionStore, selectBalanceCents } from '../store/useTransactionStore';
import type { Category, Transaction } from '../types/finance';

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

  const [cashVisible, setCashVisible] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [cashCategoryId, setCashCategoryId] = useState('income-atm');

  const [quickActionsVisible, setQuickActionsVisible] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<OnboardingPhase>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(() => categories.filter((item) => item.kind === 'income'), [categories]);

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
    setManualVisible(true);
    await Haptics.selectionAsync();
  };

  const saveExpense = async (categoryId: string) => {
    const amountCents = amountTextToCents(manualAmount);
    if (amountCents <= 0) return;

    const category = categoryById(categories, categoryId);
    const tx = addExpense({ amountCents, categoryId });
    setManualVisible(false);
    setManualAmount('');
    setManualPhase('amount');
    pushSnackbar(`Logged ${formatCurrency(amountCents)} for ${category?.name ?? 'category'}`, tx.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveIncome = async () => {
    const amountCents = amountTextToCents(cashAmount);
    if (amountCents <= 0 || !cashCategoryId) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const category = categoryById(categories, cashCategoryId);
    const tx = addIncome({ amountCents, categoryId: cashCategoryId });
    setCashVisible(false);
    setCashAmount('');
    pushSnackbar(`Added ${formatCurrency(amountCents)} from ${category?.name ?? 'income'}`, tx.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                      <Pressable
                        key={key}
                        onPress={() => {
                          void handleKeypadInput(key, setOpeningBalance, openingBalance);
                        }}
                        style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceVariant }]}
                      >
                        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                          {key}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>

              <Button
                mode="contained"
                disabled={amountTextToCents(openingBalance) <= 0}
                onPress={() => setOnboardingPhase('voice')}
              >
                Set balance
              </Button>
            </>
          ) : (
            <View style={[styles.voiceCard, { backgroundColor: theme.colors.surfaceVariant }]}> 
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
                >
                  Skip for now
                </Button>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}> 
      <View style={styles.topBar}>
        <View>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
            {greeting()}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Track cash with zero cloud sync.
          </Text>
        </View>
        <IconButton icon="cog-outline" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
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
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              📨 Wallet is empty
            </Text>
          ) : null}
        </View>

        <TextInput
          mode="outlined"
          value={search}
          onChangeText={setSearch}
          label="Search transactions"
          right={<TextInput.Icon icon="close" onPress={() => setSearch('')} />}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Chip selected={!selectedExpenseCategoryId} onPress={() => setSelectedExpenseCategoryId(null)}>
            All
          </Chip>
          {expenseCategories.map((item) => (
            <Chip
              key={item.id}
              selected={selectedExpenseCategoryId === item.id}
              onPress={() => {
                setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id));
              }}
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
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
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
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
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
                  }}
                >
                  {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amountCents)}
                </Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <Divider />}
          ListEmptyComponent={
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
              No matching transactions.
            </Text>
          }
        />
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => {
          void openManualFlow();
        }}
        onLongPress={() => setQuickActionsVisible(true)}
      />

      <Modal visible={quickActionsVisible} transparent animationType="fade" onRequestClose={() => setQuickActionsVisible(false)}>
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
          onPress={() => setQuickActionsVisible(false)}
        />
        <View style={[styles.quickActionsCard, { backgroundColor: theme.colors.surface }]}> 
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Quick Actions
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              setQuickActionsVisible(false);
              setCashVisible(true);
            }}
          >
            Add cash
          </Button>
          <Button
            mode="outlined"
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

      <Modal visible={manualVisible} transparent animationType="slide" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => setManualVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.surface }]}> 
            {manualPhase === 'amount' ? (
              <>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                  Expense amount
                </Text>
                <Text variant="displaySmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                  {manualAmount ? `$${manualAmount}` : '$0.00'}
                </Text>

                <View style={styles.keypadGrid}>
                  {keypadRows.map((row) => (
                    <View key={row.join('')} style={styles.keypadRow}>
                      {row.map((key) => (
                        <Pressable
                          key={key}
                          onPress={() => {
                            void handleKeypadInput(key, setManualAmount, manualAmount);
                          }}
                          style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceVariant }]}
                        >
                          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                            {key}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>

                <Button
                  mode="contained"
                  disabled={amountTextToCents(manualAmount) <= 0}
                  onPress={() => setManualPhase('category')}
                >
                  Continue
                </Button>
              </>
            ) : (
              <>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                  Pick category
                </Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Instant-save: tap once to log
                </Text>
                <View style={styles.categoryGrid}>
                  {expenseCategories.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        void saveExpense(item.id);
                      }}
                      style={[styles.categoryCell, { backgroundColor: theme.colors.secondaryContainer }]}
                    >
                      <Text variant="headlineSmall">{item.emoji}</Text>
                      <Text variant="labelLarge" style={{ color: theme.colors.onSecondaryContainer }}>
                        {item.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={cashVisible} transparent animationType="slide" onRequestClose={() => setCashVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => setCashVisible(false)}
          />
          <View style={[styles.sheetCard, { backgroundColor: theme.colors.surface }]}> 
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              Add cash
            </Text>

            <Text variant="displaySmall" style={{ color: theme.colors.tertiary, textAlign: 'center' }}>
              {cashAmount ? `+ $${cashAmount}` : '+ $0.00'}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {incomeCategories.map((item) => (
                <Chip
                  key={item.id}
                  selected={cashCategoryId === item.id}
                  onPress={() => setCashCategoryId(item.id)}
                >
                  {item.emoji} {item.name}
                </Chip>
              ))}
            </ScrollView>

            <View style={styles.keypadGrid}>
              {keypadRows.map((row) => (
                <View key={row.join('')} style={styles.keypadRow}>
                  {row.map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => {
                        void handleKeypadInput(key, setCashAmount, cashAmount);
                      }}
                      style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceVariant }]}
                    >
                      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                        {key}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>

            <Button mode="contained" onPress={() => void saveIncome()}>
              Add to wallet
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
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 12,
  },
  heroCard: {
    borderRadius: 32,
    padding: 20,
    gap: 8,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  transactionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  emojiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCenter: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  quickActionsCard: {
    position: 'absolute',
    right: 16,
    bottom: 88,
    minWidth: 220,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    gap: 12,
    maxHeight: '92%',
  },
  keypadGrid: {
    gap: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadKey: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCell: {
    width: '31%',
    minHeight: 84,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  voiceCard: {
    borderRadius: 24,
    padding: 16,
    gap: 14,
  },
  voiceButtons: {
    gap: 10,
  },
});
