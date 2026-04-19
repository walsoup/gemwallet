import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Surface, Text, Chip } from 'react-native-paper';
import { Defs, LinearGradient, Path, Stop, Svg } from 'react-native-svg';

import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useBouncyPress } from '../../../../hooks/useBouncyPress';

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

function triggerHaptic(weight: 'light' | 'medium' | 'heavy' = 'medium') {
  const style =
    weight === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : weight === 'light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

function BouncyPressable({
  children,
  onPress,
  scaleDown = 0.92,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  scaleDown?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(scaleDown);
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        triggerHaptic('medium');
        onPress?.();
      }}
      style={{ flex: 1 }}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
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
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', letterSpacing: -0.2 }}>
            Analytics
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
            Fluid M3Ex charts with tactile motion.
          </Text>
        </View>

        <BouncyPressable style={{ marginBottom: 18 }} onPress={() => {}}>
          <Surface style={[styles.chartCard, { backgroundColor: theme.colors.surfaceContainerHigh }]} elevation={4}>
            <View style={{ gap: 12 }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 0.15 }}>
                30-Day Cashflow
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                <Text variant="displaySmall" style={{ color: theme.colors.onSurface, fontWeight: '800', letterSpacing: -0.2 }}>
                  {formatCurrency(thisMonthSpend, { currencyCode, locale })}
                </Text>
                <Chip
                  style={{
                    backgroundColor: spendChange > 0 ? theme.colors.errorContainer : theme.colors.tertiaryContainer,
                    marginBottom: 4,
                  }}
                  textStyle={{
                    color: spendChange > 0 ? theme.colors.onErrorContainer : theme.colors.onTertiaryContainer,
                    fontWeight: '800',
                    letterSpacing: 0.2,
                  }}
                  onPress={() => triggerHaptic('light')}
                >
                  {spendChange > 0 ? '+' : ''}{spendChange.toFixed(1)}%
                </Chip>
              </View>
              <View style={[styles.chartContainer, { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant }]}>
                <Sparkline points={dailyExpenses} color={theme.colors.primary} />
              </View>
            </View>
          </Surface>
        </BouncyPressable>

        <View style={styles.bentoGrid}>
          <BouncyPressable onPress={() => {}} style={{ flex: 1 }}>
            <Surface style={[styles.bentoCard, { backgroundColor: theme.colors.errorContainer }]} elevation={3}>
              <Text variant="labelLarge" style={{ color: theme.colors.onErrorContainer, letterSpacing: 0.2 }}>High Outflow</Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4, fontWeight: '800' }}>Dining Out</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, opacity: 0.85, marginTop: 6 }}>+24% vs last week</Text>
            </Surface>
          </BouncyPressable>
          <BouncyPressable onPress={() => {}} style={{ flex: 1 }}>
            <Surface style={[styles.bentoCard, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={3}>
              <Text variant="labelLarge" style={{ color: theme.colors.onTertiaryContainer, letterSpacing: 0.2 }}>Savings Rate</Text>
              <Text variant="headlineSmall" style={{ color: theme.colors.onTertiaryContainer, marginTop: 4, fontWeight: '800' }}>18.5%</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer, opacity: 0.85, marginTop: 6 }}>On track for goal</Text>
            </Surface>
          </BouncyPressable>
        </View>

        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginTop: 26, marginBottom: 12 }}>
          Top Movers
        </Text>

        <Surface style={{ backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 28 }} elevation={3}>
          <View style={{ padding: 18, gap: 14 }}>
            {topCategories.map((item, index) => (
              <BouncyPressable key={item.category?.id || index} onPress={() => {}} style={{ width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                  <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                    <Text style={{ fontSize: 20 }}>{item.category?.emoji || '💰'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{item.category?.name || 'Unknown'}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {index === 0 ? 'Highest' : index === 1 ? '2nd highest' : index === 2 ? '3rd highest' : `${index + 1}th highest`} spend
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
                    {formatCurrency(item.amount, { currencyCode, locale })}
                  </Text>
                </View>
              </BouncyPressable>
            ))}
          </View>
        </Surface>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 56,
    gap: 14,
  },
  header: {
    marginBottom: 12,
    gap: 4,
  },
  chartCard: {
    borderRadius: 30,
    padding: 18,
  },
  chartContainer: {
    height: 120,
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 28,
    padding: 16,
    gap: 4,
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
