import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TextInput, Pressable, Modal } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { CustomTopNav } from '../../../components/Navigation/CustomTopNav';

type QuickActionMode = 'income' | 'expense';

export default function HomeScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const balanceCents = useTransactionStore(selectBalanceCents);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const goals = useGoalsStore((state) => state.goals);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [quickActionMode, setQuickActionMode] = useState<QuickActionMode>('income');
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickActionAmount, setQuickActionAmount] = useState('');
  const [quickActionLabel, setQuickActionLabel] = useState('');

  const openQuickAction = (mode: QuickActionMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickActionMode(mode);
    setQuickActionAmount('');
    setQuickActionLabel('');
    setQuickActionVisible(true);
  };

  const closeQuickAction = () => {
    setQuickActionVisible(false);
  };

  const submitQuickAction = () => {
    const parsedAmount = Number(quickActionAmount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    const amountCents = Math.round(parsedAmount * 100);
    const note = quickActionLabel.trim() || (quickActionMode === 'income' ? 'Added funds' : 'Spent funds');

    if (quickActionMode === 'income') {
      addIncome({ amountCents, categoryId: 'income-custom', note });
    } else {
      addExpense({ amountCents, categoryId: 'expense-misc', note });
    }

    closeQuickAction();
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Monthly Spend
  const monthlySpendCents = useMemo(() => {
    return transactions
      .filter(tx => tx.type === 'expense' && tx.timestamp >= startOfMonth)
      .reduce((sum, tx) => sum + tx.amountCents, 0);
  }, [transactions, startOfMonth]);

  // Vacation Fund
  const vacationGoal = goals.find(g => g.name.toLowerCase().includes('vacation')) || goals[0];

  // Filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const category = categories.find(c => c.id === tx.categoryId);
      const matchesSearch = (tx.note || category?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (selectedFilter !== 'All') {
        if (selectedFilter === 'Income') {
          matchesFilter = tx.type === 'income';
        } else {
          matchesFilter = category?.name === selectedFilter;
        }
      }
      return matchesSearch && matchesFilter;
    });
  }, [transactions, categories, searchQuery, selectedFilter]);

  const balanceDollars = Math.floor(balanceCents / 100);
  const balanceCentsPart = (balanceCents % 100).toString().padStart(2, '0');

  const filters = ['All', 'Food', 'Income', 'Transport'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomTopNav title="Good afternoon" />

      <Modal
        visible={quickActionVisible}
        transparent
        animationType="fade"
        onRequestClose={closeQuickAction}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeQuickAction}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}
            onPress={() => null}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
              {quickActionMode === 'income' ? 'Add Funds' : 'Spend Funds'}
            </Text>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Amount</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={quickActionAmount}
              onChangeText={setQuickActionAmount}
            />

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Label</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              placeholder={quickActionMode === 'income' ? 'Paycheck, refund…' : 'Rent, groceries…'}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={quickActionLabel}
              onChangeText={setQuickActionLabel}
            />

            <View style={styles.modalActions}>
              <Button mode="text" onPress={closeQuickAction} textColor={theme.colors.onSurfaceVariant}>
                Cancel
              </Button>
              <Button mode="contained" onPress={submitQuickAction}>
                Confirm
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        {/* Hero Balance Section */}
        <View style={styles.heroSection}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, fontFamily: 'BeVietnamPro_500Medium' }}>
            Available Cash
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text variant="displayLarge" style={{ color: theme.colors.onSurface }}>
              ${balanceDollars.toLocaleString()}
            </Text>
            <Text variant="displaySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              .{balanceCentsPart}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Pressable
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => openQuickAction('income')}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.onPrimaryContainer} />
              <Text style={[styles.actionButtonText, { color: theme.colors.onPrimaryContainer }]}>Add Funds</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              onPress={() => openQuickAction('expense')}
            >
              <MaterialCommunityIcons name="send" size={20} color={theme.colors.onSurface} />
              <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>Spend Funds</Text>
            </Pressable>
          </View>
        </View>

        {/* Insights Bento Grid */}
        <View style={styles.bentoGrid}>
          {/* Monthly Spend */}
          <View style={[styles.bentoCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            <View style={styles.bentoHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="chart-line" size={20} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>Monthly Spend</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.tertiary + '1A' }]}>
                <Text style={{ color: theme.colors.tertiary, fontSize: 12, fontFamily: 'BeVietnamPro_500Medium' }}>On track</Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <Text variant="headlineLarge" style={{ color: theme.colors.onSurface }}>
                ${(monthlySpendCents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </Text>
              <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <View style={[styles.progressBarFill, { backgroundColor: theme.colors.primaryContainer, width: '65%' }]} />
              </View>
            </View>
          </View>

          {/* Savings Goal */}
          <View style={[styles.bentoCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            <View style={styles.bentoHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="flag" size={20} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>
                  {vacationGoal ? vacationGoal.name : 'Savings Goal'}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text variant="headlineLarge" style={{ color: theme.colors.onSurface }}>
                  ${vacationGoal ? (vacationGoal.savedCents / 100).toLocaleString() : '0'}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 18, fontFamily: 'SpaceGrotesk_500Medium' }}>
                  / ${vacationGoal ? (vacationGoal.targetCents / 100000).toLocaleString() + 'k' : '0'}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: theme.colors.tertiary, width: vacationGoal ? `${Math.min(100, (vacationGoal.savedCents / vacationGoal.targetCents) * 100)}%` : '0%' }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.searchSection}>
            <View style={styles.searchBarContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { backgroundColor: theme.colors.surfaceContainerLow, color: theme.colors.onSurface, borderColor: theme.colors.outlineVariant + '4D' }]}
                placeholder="Search transactions..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
              {filters.map(filter => {
                const isActive = selectedFilter === filter;
                return (
                  <Pressable
                    key={filter}
                    style={[
                      styles.filterChip,
                      isActive ? { backgroundColor: theme.colors.primaryContainer, borderWidth: 0 }
                               : { backgroundColor: theme.colors.surfaceContainerLow, borderColor: theme.colors.outlineVariant + '33', borderWidth: 1 }
                    ]}
                    onPress={() => setSelectedFilter(filter)}
                  >
                    <Text style={{
                      color: isActive ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                      fontFamily: 'BeVietnamPro_500Medium',
                      fontSize: 14
                    }}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.transactionsList, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {filteredTransactions.slice(0, 10).map((tx, index) => {
              const category = categories.find(c => c.id === tx.categoryId);
              const isIncome = tx.type === 'income';
              const isLast = index === Math.min(filteredTransactions.length, 10) - 1;

              let iconName = 'help';
              if (category?.name === 'Food') iconName = 'silverware-fork-knife';
              else if (category?.name === 'Transport') iconName = 'train';
              else if (isIncome) iconName = 'cash';
              else if (category?.name === 'Entertainment') iconName = 'movie';

              return (
                <Pressable
                  key={tx.id}
                  style={({pressed}) => [
                    styles.txItem,
                    !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant + '26' },
                    pressed && { backgroundColor: theme.colors.surfaceContainer }
                  ]}
                >
                  <View style={styles.txItemLeft}>
                    <View style={[
                      styles.txIconContainer,
                      { backgroundColor: isIncome ? theme.colors.tertiary + '1A' : theme.colors.surfaceContainerHighest }
                    ]}>
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={24}
                        color={isIncome ? theme.colors.tertiary : theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_500Medium', fontSize: 16 }}>
                        {tx.note || category?.name || 'Transaction'}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                        {category?.name || 'Misc'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{
                    color: isIncome ? theme.colors.tertiary : theme.colors.onSurface,
                    fontFamily: 'BeVietnamPro_500Medium',
                    fontSize: 16
                  }}>
                    {isIncome ? '+' : '-'}${(tx.amountCents / 100).toFixed(2)}
                  </Text>
                </Pressable>
              );
            })}
            {filteredTransactions.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>No transactions found.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120, // space for custom bottom nav
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 8,
  },
  primaryButton: {
    // shadow
  },
  secondaryButton: {
  },
  actionButtonText: {
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 16,
  },
  bentoGrid: {
    marginTop: 40,
    gap: 16,
  },
  bentoCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  bentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  transactionsSection: {
    marginTop: 40,
    gap: 16,
  },
  searchSection: {
    gap: 12,
    marginBottom: 8,
  },
  searchBarContainer: {
    position: 'relative',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterContent: {
    gap: 8,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  transactionsList: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  txItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
