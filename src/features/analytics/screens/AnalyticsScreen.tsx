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

  // Daily Velocity Logic (Past 7 days)
  const dailyVelocity = useMemo(() => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const past7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        date: d,
        dayStr: days[d.getDay()],
        totalCents: 0
      };
    });

    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        const txDate = new Date(tx.timestamp);
        const dayMatch = past7Days.find(d =>
          d.date.getDate() === txDate.getDate() &&
          d.date.getMonth() === txDate.getMonth() &&
          d.date.getFullYear() === txDate.getFullYear()
        );
        if (dayMatch) {
          dayMatch.totalCents += tx.amountCents;
        }
      }
    });

    const maxSpend = Math.max(...past7Days.map(d => d.totalCents), 1);

    return past7Days.map(d => ({
      ...d,
      heightPercentage: Math.max(10, (d.totalCents / maxSpend) * 100) // min 10% height for visual
    }));
  }, [now, transactions]);

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

        {/* Daily Velocity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Daily Velocity</Text>
          <View style={[styles.velocityCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            <View style={styles.chartContainer}>
              {dailyVelocity.map((day, idx) => (
                <View key={idx} style={styles.barColumn}>
                  <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                    <View style={[
                      styles.barFill,
                      { backgroundColor: theme.colors.primaryContainer, height: `${day.heightPercentage}%`, opacity: 0.8 }
                    ]} />
                  </View>
                  <Text style={{
                    color: idx === 6 ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
                    fontFamily: idx === 6 ? 'BeVietnamPro_500Medium' : 'BeVietnamPro_400Regular',
                    fontSize: 12,
                    marginTop: 8
                  }}>
                    {day.dayStr}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Movers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Top Movers</Text>
          <View style={[styles.moversCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {topMovers.length > 0 ? topMovers.map((mover, idx) => (
              <BouncyButton
                key={idx}
                style={styles.moverItem}
                onPress={() => {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
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
              </BouncyButton>
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
