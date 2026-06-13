import React, { useState, useMemo } from 'react';
import { ScrollView, StyleSheet, View, TextInput, Pressable, Modal, Animated as RNAnimated } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { formatAppCurrency } from '../../../../utils/currency';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useBouncyPress } from '../../../hooks/useBouncyPress';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { Transaction } from '../../../../types/finance';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ProgressRing } from '../../../components/UI/ProgressRing';
import { AnimatedBalance } from '../../../components/UI/AnimatedBalance';

type QuickActionMode = 'income' | 'expense';

const BouncyButton = ({ onPress, style, children, disabled, ...props }: any) => {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(0.95, disabled);
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[style, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export default function HomeScreen() {
  const theme = useTheme<AppTheme>();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const balanceCents = useTransactionStore(selectBalanceCents);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const goals = useGoalsStore((state) => state.goals);
  const undoTransaction = useTransactionStore((state) => state.undoTransaction);

  const handleDeleteTransaction = (txId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    undoTransaction(txId);
  };

  const currentMonthSpentByCategory = useMemo(() => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountCents;
      }
    });
    return map;
  }, [transactions]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [quickActionMode, setQuickActionMode] = useState<QuickActionMode>('income');
  const [quickActionVisible, setQuickActionVisible] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const openQuickAction = (mode: QuickActionMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickActionMode(mode);
    setQuickActionVisible(true);
  };

  const closeQuickAction = () => {
    setQuickActionVisible(false);
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
  const vacationProgressPercent = useMemo(() => {
    if (!vacationGoal) return 0;
    const target = Number.isFinite(vacationGoal.targetCents) ? vacationGoal.targetCents : 0;
    const saved = Number.isFinite(vacationGoal.savedCents) ? vacationGoal.savedCents : 0;
    if (target <= 0) return 0;
    return Math.min(100, Math.max(0, (saved / target) * 100));
  }, [vacationGoal]);

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

  const filters = ['All', 'Food', 'Income', 'Transport'];

  return (
    <ScreenLayout title="Good afternoon" backgroundColor={theme.colors.background}>

      <AddTransactionModal 
        visible={quickActionVisible} 
        initialType={quickActionMode} 
        onClose={closeQuickAction} 
      />

      <TransactionDetailModal 
        transaction={selectedTransaction}
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Balance Section */}
        <View style={styles.heroSection}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, fontFamily: 'BeVietnamPro_500Medium' }}>
            Available Cash
          </Text>
          <AnimatedBalance 
            valueCents={balanceCents} 
            textStyle={{ fontSize: 56, lineHeight: 64 }} 
          />

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <BouncyButton
              style={[styles.actionButton, styles.primaryButton, { backgroundColor: theme.colors.primaryContainer }]}
              onPress={() => openQuickAction('income')}
            >
              <MaterialCommunityIcons name="plus" size={20} color={theme.colors.onPrimaryContainer} />
              <Text style={[styles.actionButtonText, { color: theme.colors.onPrimaryContainer }]}>Add Funds</Text>
            </BouncyButton>
            <BouncyButton
              style={[styles.actionButton, styles.secondaryButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              onPress={() => openQuickAction('expense')}
            >
              <MaterialCommunityIcons name="send" size={20} color={theme.colors.onSurface} />
              <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>Spend Funds</Text>
            </BouncyButton>
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
                {formatAppCurrency(monthlySpendCents)}
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
                  {formatAppCurrency(vacationGoal?.savedCents ?? 0)}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 18, fontFamily: 'SpaceGrotesk_500Medium' }}>
                  / {formatAppCurrency(vacationGoal?.targetCents ?? 0)}
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: theme.colors.tertiary, width: `${vacationProgressPercent}%` }
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Recent Transactions */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.transactionsSection}>
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

              const budgetLimit = category?.maxBudgetLimitCents;
              const spent = category ? currentMonthSpentByCategory[category.id] || 0 : 0;
              const isWarning = budgetLimit && budgetLimit > 0 && spent >= 0.8 * budgetLimit;

              let iconName = 'help';
              if (category?.name === 'Food') iconName = 'silverware-fork-knife';
              else if (category?.name === 'Transport') iconName = 'train';
              else if (isIncome) iconName = 'cash';
              else if (category?.name === 'Entertainment') iconName = 'movie';

              const itemBg = isWarning ? theme.colors.errorContainer : undefined;
              const textColor = isWarning ? theme.colors.onErrorContainer : theme.colors.onSurface;
              const textSubColor = isWarning ? theme.colors.onErrorContainer + 'CC' : theme.colors.onSurfaceVariant;

              return (
                <Swipeable
                  key={tx.id}
                  onSwipeableOpen={(direction) => {
                    if (direction === 'right') {
                      handleDeleteTransaction(tx.id);
                    }
                  }}
                  renderRightActions={(progress, dragX) => {
                    const scale = dragX.interpolate({
                      inputRange: [-80, 0],
                      outputRange: [1, 0],
                      extrapolate: 'clamp',
                    });
                    return (
                      <Pressable
                        onPress={() => handleDeleteTransaction(tx.id)}
                        style={{
                          backgroundColor: theme.colors.errorContainer,
                          justifyContent: 'center',
                          alignItems: 'center',
                          width: 80,
                          height: '100%',
                          borderRadius: 16,
                        }}
                      >
                        <RNAnimated.View style={{ transform: [{ scale }] }}>
                          <MaterialCommunityIcons name="delete" size={24} color={theme.colors.onErrorContainer} />
                        </RNAnimated.View>
                      </Pressable>
                    );
                  }}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedTransaction(tx);
                      setDetailModalVisible(true);
                    }}
                    style={({pressed}) => [
                      styles.txItem,
                      { backgroundColor: itemBg || (pressed ? theme.colors.surfaceContainer : 'transparent') },
                      !isLast && { borderBottomWidth: 1, borderBottomColor: isWarning ? theme.colors.onErrorContainer + '26' : theme.colors.outlineVariant + '26' }
                    ]}
                  >
                    <View style={styles.txItemLeft}>
                      <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                        {budgetLimit && budgetLimit > 0 && (
                          <View style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                            <ProgressRing
                              size={48}
                              strokeWidth={3}
                              progress={spent / budgetLimit}
                              color={isWarning ? theme.colors.error : theme.colors.primary}
                              trackColor={isWarning ? theme.colors.errorContainer : theme.colors.surfaceContainerHighest}
                            />
                          </View>
                        )}
                        <View style={[
                          styles.txIconContainer,
                          { backgroundColor: isIncome ? theme.colors.tertiary + '1A' : (isWarning ? theme.colors.onErrorContainer + '1A' : theme.colors.surfaceContainerHighest) }
                        ]}>
                          <MaterialCommunityIcons
                            name={iconName as any}
                            size={24}
                            color={isIncome ? theme.colors.tertiary : (isWarning ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant)}
                          />
                        </View>
                      </View>
                      <View style={{ marginLeft: 4 }}>
                        <Text style={{ color: textColor, fontFamily: 'BeVietnamPro_500Medium', fontSize: 16 }}>
                          {tx.note || category?.name || 'Transaction'}
                        </Text>
                        <Text style={{ color: textSubColor, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                          {category?.name || 'Misc'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{
                      color: isIncome ? theme.colors.tertiary : textColor,
                      fontFamily: 'BeVietnamPro_500Medium',
                      fontSize: 16
                    }}>
                      {isIncome ? '+' : '-'}{formatAppCurrency(tx.amountCents)}
                    </Text>
                  </Pressable>
                </Swipeable>
              );
            })}
            {filteredTransactions.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>No transactions found.</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  modalBackdrop: {
    flex: 1,
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
