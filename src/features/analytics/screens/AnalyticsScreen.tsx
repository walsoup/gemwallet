import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { formatAppCurrency } from '../../../../utils/currency';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { useBouncyPress } from '../../../hooks/useBouncyPress';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';

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

export default function AnalyticsScreen() {
  const theme = useTheme<AppTheme>();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    [now]
  );

  // Savings Logic
  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(tx => {
      if (tx.timestamp >= startOfMonth) {
        if (tx.type === 'income') income += tx.amountCents;
        if (tx.type === 'expense') expense += tx.amountCents;
      }
    });
    return { totalIncome: income, totalExpense: expense };
  }, [transactions, startOfMonth]);

  const savedCents = Math.max(0, totalIncome - totalExpense);
  const savedPercentage = totalIncome > 0 ? ((savedCents / totalIncome) * 100).toFixed(1) : '0.0';

  // Donut Chart data (group expenses by category for current month)
  const donutData = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountCents;
      }
    });

    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.tertiary,
      theme.colors.error,
      '#FF9800',
      '#9C27B0',
      '#00BCD4',
      '#4CAF50',
      '#E91E63'
    ];

    return Object.keys(map).map((catId, idx) => {
      const cat = categories.find(c => c.id === catId);
      return {
        value: map[catId] / 100,
        color: colors[idx % colors.length],
        text: cat?.emoji || '🧩',
        label: cat?.name || 'Misc'
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, categories, startOfMonth, theme.colors]);

  // Monthly Bar Chart data (last 6 months trend)
  const monthlyBarData = useMemo(() => {
    const monthsData: { year: number; month: number; label: string; value: number }[] = [];
    const nowTemp = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowTemp.getFullYear(), nowTemp.getMonth() - i, 1);
      monthsData.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('default', { month: 'short' }),
        value: 0
      });
    }

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const txDate = new Date(tx.timestamp);
        const match = monthsData.find(m => m.year === txDate.getFullYear() && m.month === txDate.getMonth());
        if (match) {
          match.value += tx.amountCents;
        }
      }
    });

    return monthsData.map(m => ({
      value: m.value / 100,
      label: m.label,
      frontColor: theme.colors.primary
    }));
  }, [transactions, theme.colors.primary]);

  // Line Chart data (Income vs Expense comparison for last 6 months)
  const lineChartData = useMemo(() => {
    const monthsData: { year: number; month: number; label: string; incomeValue: number; expenseValue: number }[] = [];
    const nowTemp = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowTemp.getFullYear(), nowTemp.getMonth() - i, 1);
      monthsData.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString('default', { month: 'short' }),
        incomeValue: 0,
        expenseValue: 0
      });
    }

    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const match = monthsData.find(m => m.year === txDate.getFullYear() && m.month === txDate.getMonth());
      if (match) {
        if (tx.type === 'income') {
          match.incomeValue += tx.amountCents;
        } else if (tx.type === 'expense') {
          match.expenseValue += tx.amountCents;
        }
      }
    });

    const incomeLine = monthsData.map(m => ({
      value: m.incomeValue / 100,
      label: m.label
    }));

    const expenseLine = monthsData.map(m => ({
      value: m.expenseValue / 100,
      label: m.label
    }));

    return { incomeLine, expenseLine };
  }, [transactions]);

  // Top Movers Logic
  const topMovers = useMemo(() => {
    const categoryTotals: Record<
      string,
      { id: string; total: number; count: number; name: string; icon: string }
    > = {};

    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
        const cat = categories.find(c => c.id === tx.categoryId);
        if (cat) {
          if (!categoryTotals[cat.id]) {
            let icon = 'help';
            if (cat.name === 'Food' || cat.name === 'Dining') icon = 'silverware-fork-knife';
            else if (cat.name === 'Shopping' || cat.name === 'Retail') icon = 'shopping';
            else if (cat.name === 'Transport' || cat.name === 'Transit') icon = 'train';

            categoryTotals[cat.id] = { id: cat.id, total: 0, count: 0, name: cat.name, icon };
          }
          categoryTotals[cat.id].total += tx.amountCents;
          categoryTotals[cat.id].count += 1;
        }
      }
    });

    return Object.values(categoryTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [transactions, categories, startOfMonth]);

  const moverPercentages = useMemo(() => {
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    const previousEnd = startOfMonth;

    const totalsForPeriod = (start: number, end: number) => {
      const totals: Record<string, number> = {};
      transactions.forEach((tx) => {
        if (tx.type !== 'expense' || tx.timestamp < start || tx.timestamp >= end) return;
        totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + tx.amountCents;
      });
      return totals;
    };

    const currentTotals = totalsForPeriod(startOfMonth, now.getTime());
    const prevTotals = totalsForPeriod(previousStart, previousEnd);

    const percentages: Record<string, number> = {};
    Object.keys(currentTotals).forEach((categoryId) => {
      const current = currentTotals[categoryId] ?? 0;
      const previous = prevTotals[categoryId] ?? 0;

      if (previous <= 0) {
        percentages[categoryId] = current > 0 ? 100 : 0;
      } else {
        percentages[categoryId] = ((current - previous) / previous) * 100;
      }
    });

    return percentages;
  }, [now, startOfMonth, transactions]);

  return (
    <ScreenLayout title="Analytics" backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Insight Header Card */}
        <View style={styles.section}>
          <View style={[styles.insightCard, { backgroundColor: theme.colors.surfaceContainerLow, overflow: 'hidden' }]}>
            {/* Decoration */}
            <View style={[styles.decoration, { backgroundColor: theme.colors.tertiary + '0D' }]} />

            <View style={styles.insightHeader}>
              <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                <MaterialCommunityIcons name="piggy-bank" size={24} color={theme.colors.tertiary} />
              </View>
              <View style={[styles.badge, { backgroundColor: theme.colors.tertiary + '1A' }]}>
                <Text style={{ color: theme.colors.tertiary, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Insight</Text>
              </View>
            </View>

            <View style={styles.insightContent}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
                {savedPercentage}% Saved
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14, lineHeight: 22 }}>
                You&apos;ve saved {formatAppCurrency(savedCents)} this month based on your recorded income and expenses.
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Spending */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Monthly Spending</Text>
          <View style={[styles.velocityCard, { backgroundColor: theme.colors.surfaceContainerLow, padding: 16 }]}>
            <BarChart
              data={monthlyBarData}
              barWidth={22}
              spacing={15}
              barBorderRadius={4}
              yAxisThickness={0}
              xAxisThickness={0}
              noOfSections={4}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant }}
              hideRules
            />
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Category Breakdown</Text>
          <View style={[styles.velocityCard, { backgroundColor: theme.colors.surfaceContainerLow, padding: 16, alignItems: 'center' }]}>
            {donutData.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <PieChart
                  donut
                  radius={70}
                  innerRadius={40}
                  data={donutData}
                  centerLabelComponent={() => (
                    <Text style={{ textAlign: 'center', fontWeight: 'bold', color: theme.colors.onSurface }}>Expenses</Text>
                  )}
                />
                <View style={{ gap: 4 }}>
                  {donutData.slice(0, 4).map((d, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.color }} />
                      <Text style={{ color: theme.colors.onSurface, fontSize: 12 }}>
                        {d.text} {d.label} ({formatAppCurrency(d.value * 100)})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>No expense data for this month yet.</Text>
            )}
          </View>
        </View>

        {/* Income vs. Expense */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Income vs. Expense</Text>
          <View style={[styles.velocityCard, { backgroundColor: theme.colors.surfaceContainerLow, padding: 16 }]}>
            <LineChart
              data={lineChartData.incomeLine}
              data2={lineChartData.expenseLine}
              color1={theme.colors.tertiary}
              color2={theme.colors.error}
              thickness={3}
              dataPointsColor1={theme.colors.tertiary}
              dataPointsColor2={theme.colors.error}
              yAxisThickness={0}
              xAxisThickness={0}
              noOfSections={4}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant }}
              hideRules
            />
          </View>
        </View>

        {/* Top Movers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Top Movers</Text>
          <View style={[styles.moversCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {topMovers.length > 0 ? topMovers.map((mover, idx) => (
              <View
                key={idx}
                style={styles.moverItem}
              >
                <View style={styles.moverLeft}>
                  <View style={[styles.moverIcon, { backgroundColor: theme.colors.surfaceContainer }]}>
                    <MaterialCommunityIcons name={mover.icon as any} size={24} color={theme.colors.onSurfaceVariant} />
                  </View>
                  <View>
                    <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 16 }}>{mover.name}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{mover.count} transactions</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 16 }}>
                    -{formatAppCurrency(mover.total)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {(() => {
                      const delta = moverPercentages[mover.id] ?? 0;
                      const isUp = delta >= 0;
                      const abs = Math.min(999, Math.abs(delta));
                      const display = `${abs.toFixed(0)}%`;
                      const color = isUp ? theme.colors.tertiary : theme.colors.error;

                      return (
                        <>
                          <MaterialCommunityIcons name={isUp ? 'arrow-up' : 'arrow-down'} size={14} color={color} />
                          <Text style={{ color, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{display}</Text>
                        </>
                      );
                    })()}
                  </View>
                </View>
              </View>
            )) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>No expense data for this month yet.</Text>
              </View>
            )}
          </View>
        </View>

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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 18,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  insightCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 180,
    justifyContent: 'space-between',
    position: 'relative',
  },
  decoration: {
    position: 'absolute',
    right: -32,
    top: -32,
    width: 128,
    height: 128,
    borderBottomLeftRadius: 64,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  iconBox: {
    padding: 8,
    borderRadius: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  insightContent: {
    zIndex: 10,
    marginTop: 24,
  },
  velocityCard: {
    borderRadius: 20,
    padding: 24,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 128,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  moversCard: {
    borderRadius: 20,
    padding: 8,
    gap: 4,
  },
  moverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  moverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  moverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
