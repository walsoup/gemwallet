import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View, Dimensions } from 'react-native';
import {
  Appbar,
  Card,
  Text,
  useTheme,
  Surface,
  List,
  Avatar,
  Divider
} from 'react-native-paper';
import { PieChart, BarChart } from 'react-native-gifted-charts';

import { useTransactionStore } from '../store/useTransactionStore';
import { selectBalanceCents } from '../store/useTransactionStore';
import type { Category, Transaction } from '../types/finance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatCurrency(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function InsightsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);

  const expenseTransactions = useMemo(
    () => transactions.filter((tx) => tx.type === 'expense'),
    [transactions]
  );

  // Aggregate expenses by category for Pie Chart
  const pieData = useMemo(() => {
    const totals = new Map<string, number>();
    expenseTransactions.forEach((tx) => {
      const current = totals.get(tx.categoryId) ?? 0;
      totals.set(tx.categoryId, current + tx.amountCents);
    });

    const data = Array.from(totals.entries()).map(([catId, amount]) => {
      const category = categories.find((c) => c.id === catId);
      return {
        value: amount,
        color: category?.tint || theme.colors.primary,
        label: category?.name || 'Misc',
        emoji: category?.emoji || '💰',
      };
    });

    return data.sort((a, b) => b.value - a.value);
  }, [expenseTransactions, categories, theme.colors.primary]);

  // Aggregate expenses by day for Bar Chart (Last 7 days)
  const barData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    const dailyTotals = new Map<string, number>();
    expenseTransactions.forEach((tx) => {
      const dateKey = new Date(tx.timestamp).toISOString().split('T')[0];
      const current = dailyTotals.get(dateKey) ?? 0;
      dailyTotals.set(dateKey, current + tx.amountCents);
    });

    return last7Days.map((date) => {
      const dayName = new Date(date).toLocaleDateString(undefined, { weekday: 'short' });
      return {
        value: (dailyTotals.get(date) ?? 0) / 100,
        label: dayName,
        frontColor: theme.colors.secondaryContainer,
      };
    });
  }, [expenseTransactions, theme.colors.secondaryContainer]);

  const totalExpenseCents = useMemo(
    () => expenseTransactions.reduce((sum, tx) => sum + tx.amountCents, 0),
    [expenseTransactions]
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Insights" titleStyle={{ fontWeight: 'bold' }} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <Card style={{ borderRadius: 24, backgroundColor: theme.colors.surface }} elevation={1}>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Total Spending (All Time)
            </Text>
            <Text variant="displayMedium" style={{ fontWeight: 'bold' }}>
              {formatCurrency(totalExpenseCents)}
            </Text>
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 24 }} mode="contained">
          <Card.Title title="Spending by Category" titleVariant="titleMedium" />
          <Card.Content style={{ alignItems: 'center' }}>
            {pieData.length > 0 ? (
              <View style={{ alignItems: 'center', marginVertical: 16 }}>
                <PieChart
                  donut
                  data={pieData}
                  radius={SCREEN_WIDTH * 0.3}
                  innerRadius={SCREEN_WIDTH * 0.18}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                        {pieData.length}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                        Cats
                      </Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                  No data to visualize yet.
                </Text>
              </View>
            )}

            <View style={{ width: '100%', gap: 8 }}>
              {pieData.slice(0, 5).map((item, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                    <Text variant="bodyMedium">{item.label}</Text>
                  </View>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 24 }} mode="contained">
          <Card.Title title="Weekly Spending Trend" titleVariant="titleMedium" />
          <Card.Content style={{ paddingLeft: 0 }}>
            <BarChart
              data={barData}
              barWidth={22}
              noOfSections={3}
              barBorderRadius={4}
              frontColor={theme.colors.primary}
              yAxisThickness={0}
              xAxisThickness={0}
              hideRules
              yAxisLabelPrefix="$"
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              width={SCREEN_WIDTH - 80}
            />
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 24 }} mode="contained">
          <Card.Title title="Top Expenses" titleVariant="titleMedium" />
          <Card.Content>
            {expenseTransactions
              .sort((a, b) => b.amountCents - a.amountCents)
              .slice(0, 5)
              .map((tx, index) => {
                const category = categories.find((c) => c.id === tx.categoryId);
                return (
                  <View key={tx.id}>
                    <List.Item
                      title={tx.note || category?.name || 'Expense'}
                      description={new Date(tx.timestamp).toLocaleDateString()}
                      left={(props) => (
                        <Avatar.Text
                          {...props}
                          label={category?.emoji || '💸'}
                          size={40}
                          style={{ backgroundColor: theme.colors.surfaceVariant, borderRadius: 12 }}
                          labelStyle={{ fontSize: 20 }}
                        />
                      )}
                      right={() => (
                        <Text variant="bodyLarge" style={{ fontWeight: 'bold', alignSelf: 'center' }}>
                          {formatCurrency(tx.amountCents)}
                        </Text>
                      )}
                      style={{ paddingHorizontal: 0 }}
                    />
                    {index < 4 && <Divider style={{ opacity: 0.5 }} />}
                  </View>
                );
              })}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}
