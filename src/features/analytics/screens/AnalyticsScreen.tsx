import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, Chip } from 'react-native-paper';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { formatCurrency } from '../../../../utils/formatCurrency';

function buildDailyExpenses(transactions: any[], days: number) {
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

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ label: date.slice(5), value }));
}

function Sparkline({ points, color }: { points: { value: number }[]; color: string }) {
  const width = 300;
  const height = 120;
  if (!points.length) {
    return <Text variant="bodySmall" style={{ color }}>No data</Text>;
  }
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = 0;
  const stepX = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, idx) => ({
    x: idx * stepX,
    y: height - ((p.value - min) / (max - min)) * height,
  }));

  const toSmoothPath = (data: typeof coords) => {
    if (data.length === 1) {
      const { x, y } = data[0];
      return { line: `M ${x} ${y}`, area: `M ${x} ${height} L ${x} ${y} L ${x + 0.001} ${height} Z` };
    }
    const lineParts: string[] = [`M ${data[0].x} ${data[0].y}`];
    const areaParts: string[] = [`M ${data[0].x} ${height} L ${data[0].x} ${data[0].y}`];

    for (let i = 0; i < data.length - 1; i += 1) {
      const current = data[i];
      const next = data[i + 1];
      const prev = data[i - 1] ?? current;
      const after = data[i + 2] ?? next;

      const c1x = current.x + (next.x - prev.x) / 6;
      const c1y = current.y + (next.y - prev.y) / 6;
      const c2x = next.x - (after.x - current.x) / 6;
      const c2y = next.y - (after.y - current.y) / 6;

      lineParts.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`);
      areaParts.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${next.x} ${next.y}`);
    }

    areaParts.push(`L ${data[data.length - 1].x} ${height} Z`);
    return { line: lineParts.join(' '), area: areaParts.join(' ') };
  };

  const { line, area } = toSmoothPath(coords);
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function AnalyticsScreen() {
  const theme = useAppTheme();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const locale = language || 'en-US';

  const dailyExpenses = useMemo(() => buildDailyExpenses(transactions, 30), [transactions]);
  const thisMonthSpend = dailyExpenses.slice(-30).reduce((sum, p) => sum + p.value, 0);
  const prevMonthSpend = buildDailyExpenses(transactions, 60).slice(0, 30).reduce((sum, p) => sum + p.value, 0);

  const spendChange = prevMonthSpend ? ((thisMonthSpend - prevMonthSpend) / prevMonthSpend) * 100 : 0;
  
  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach(tx => {
      if (tx.type === 'expense') {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amountCents);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, amount]) => ({
        category: categories.find(c => c.id === id),
        amount
      }));
  }, [transactions, categories]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Analytics
          </Text>
        </View>

        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surfaceContainer }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              30-Day Cashflow
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 8 }}>
              <Text variant="displayMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                {formatCurrency(thisMonthSpend, { currencyCode, locale })}
              </Text>
              <Chip
                style={{ backgroundColor: spendChange > 0 ? theme.colors.errorContainer : theme.colors.tertiaryContainer, marginBottom: 8 }}
                textStyle={{ color: spendChange > 0 ? theme.colors.onErrorContainer : theme.colors.onTertiaryContainer, fontWeight: 'bold' }}
              >
                {spendChange > 0 ? '+' : ''}{spendChange.toFixed(1)}%
              </Chip>
            </View>
            <View style={styles.chartContainer}>
              <Sparkline points={dailyExpenses} color={theme.colors.primary} />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bentoGrid}>
          <Card style={[styles.bentoCard, { backgroundColor: theme.colors.errorContainer }]}>
            <Card.Content>
              <Text variant="labelLarge" style={{ color: theme.colors.onErrorContainer }}>High Outflow</Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4, fontWeight: 'bold' }}>Dining Out</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, opacity: 0.8, marginTop: 4 }}>+24% vs last week</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.bentoCard, { backgroundColor: theme.colors.tertiaryContainer }]}>
            <Card.Content>
              <Text variant="labelLarge" style={{ color: theme.colors.onTertiaryContainer }}>Savings Rate</Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.onTertiaryContainer, marginTop: 4, fontWeight: 'bold' }}>18.5%</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer, opacity: 0.8, marginTop: 4 }}>On track for goal</Text>
            </Card.Content>
          </Card>
        </View>

        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginTop: 24, marginBottom: 16 }}>
          Top Movers
        </Text>

        <Card style={{ backgroundColor: theme.colors.surfaceContainer, borderRadius: 24 }}>
          <Card.Content style={{ gap: 16 }}>
            {topCategories.map((item, index) => (
              <View key={item.category?.id || index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                  <Text style={{ fontSize: 20 }}>{item.category?.emoji || '💰'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{item.category?.name || 'Unknown'}</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {index === 0 ? 'Highest' : index === 1 ? '2nd highest' : index === 2 ? '3rd highest' : `${index + 1}th highest`} spend
                  </Text>
                </View>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  {formatCurrency(item.amount, { currencyCode, locale })}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  chartCard: {
    borderRadius: 28,
    marginBottom: 16,
  },
  chartContainer: {
    height: 120,
    marginTop: 16,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  }
});
