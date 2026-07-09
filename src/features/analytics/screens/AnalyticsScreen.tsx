import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useTransactionStore } from "../../../../store/useTransactionStore";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppTheme } from "../../../../providers/AppThemeProvider";
import { ScreenLayout } from "../../../components/Layout/ScreenLayout";
import { formatAppCurrency } from "../../../../utils/currency";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import { BarChart, PieChart, LineChart } from "react-native-gifted-charts";

export default function AnalyticsScreen() {
  const theme = useTheme<AppTheme>();
  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);

  // ⚡ Bolt Optimization: Memoize category lookups to avoid O(n²) find operations in filter and map
  const categoryMap = useMemo(() => {
    return categories.reduce(
      (acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      },
      {} as Record<string, (typeof categories)[0]>,
    );
  }, [categories]);

  const now = useMemo(() => new Date(), []);
  const startOfMonth = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
    [now],
  );

  // ⚡ Bolt Optimization: Group relational data in a single pass to avoid redundant O(N) array iterations
  const currentMonthData = useMemo(() => {
    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.timestamp >= startOfMonth) {
        if (tx.type === "income") {
          income += tx.amountCents;
        } else if (tx.type === "expense") {
          expense += tx.amountCents;
          categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amountCents;
          categoryCounts[tx.categoryId] = (categoryCounts[tx.categoryId] || 0) + 1;
        }
      }
    });

    return { income, expense, categoryTotals, categoryCounts };
  }, [transactions, startOfMonth]);

  // Savings Logic
  const { totalIncome, totalExpense } = useMemo(() => {
    return { totalIncome: currentMonthData.income, totalExpense: currentMonthData.expense };
  }, [currentMonthData]);

  const savedCents = Math.max(0, totalIncome - totalExpense);
  const savedPercentage =
    totalIncome > 0 ? ((savedCents / totalIncome) * 100).toFixed(1) : "0.0";

// Donut Chart data (group expenses by category for current month)
  // ⚡ Bolt Optimization: Derive from pre-computed categoryTotals in O(C) complexity
  const donutData = useMemo(() => {
    const map = currentMonthData.categoryTotals;
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.tertiary,
      theme.colors.error,
      theme.colors.primaryContainer,
      theme.colors.secondaryContainer,
      theme.colors.tertiaryContainer,
      theme.colors.errorContainer,
      theme.colors.inversePrimary,
    ];

    return Object.keys(map)
      .map((catId, idx) => {
        const cat = categoryMap[catId];
        return {
          value: map[catId] / 100,
          color: colors[idx % colors.length],
          text: cat?.emoji || "🧩",
          label: cat?.name || "Misc",
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [currentMonthData.categoryTotals, categoryMap, theme.colors]);

  // Line Chart data (Income vs Expense comparison for last 6 months)
  const lineChartData = useMemo(() => {
    const monthsData: {
      year: number;
      month: number;
      label: string;
      incomeValue: number;
      expenseValue: number;
    }[] = [];
    const nowTemp = new Date();

    // ⚡ Bolt Optimization: Use dictionary for O(1) lookups instead of O(N) array find
    const monthKeyToIndex: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(nowTemp.getFullYear(), nowTemp.getMonth() - i, 1);
      monthsData.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleString("default", { month: "short" }),
        incomeValue: 0,
        expenseValue: 0,
      });
      monthKeyToIndex[`${d.getFullYear()}-${d.getMonth()}`] = 5 - i;
    }

    // ⚡ Bolt Optimization: Calculate earliest time bound once outside loop
    const earliestDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth() - 5, 1);
    const earliestTime = earliestDate.getTime();

    transactions.forEach((tx) => {
      // ⚡ Bolt Optimization: Early exit for old transactions to skip Date object creation
      if (tx.timestamp < earliestTime) return;

      const txDate = new Date(tx.timestamp);
      const index = monthKeyToIndex[`${txDate.getFullYear()}-${txDate.getMonth()}`];

      if (index !== undefined) {
        const match = monthsData[index];
        if (tx.type === "income") {
          match.incomeValue += tx.amountCents;
        } else if (tx.type === "expense") {
          match.expenseValue += tx.amountCents;
        }
      }
    });

    const incomeLine = monthsData.map((m) => ({
      value: m.incomeValue / 100,
      label: m.label,
    }));

    const expenseLine = monthsData.map((m) => ({
      value: m.expenseValue / 100,
      label: m.label,
    }));

    return { incomeLine, expenseLine };
  }, [transactions]);

  // Monthly Bar Chart data (last 6 months trend)
  // ⚡ Bolt Optimization: Derive from lineChartData.expenseLine to eliminate redundant O(N) filtering of immutable transactions array
  const monthlyBarData = useMemo(() => {
    return lineChartData.expenseLine.map((m) => ({
      value: m.value,
      label: m.label,
      frontColor: theme.colors.primary,
    }));
  }, [lineChartData.expenseLine, theme.colors.primary]);

  // Top Movers Logic
  // ⚡ Bolt Optimization: Derive from pre-computed categoryTotals and categoryCounts in O(C) complexity
  const topMovers = useMemo(() => {
    const map = currentMonthData.categoryTotals;
    const counts = currentMonthData.categoryCounts;
    const results: { id: string; total: number; count: number; name: string; icon: string }[] = [];

    Object.keys(map).forEach((catId) => {
      const cat = categoryMap[catId];
      if (cat) {
        let icon = "help";
        if (cat.name === "Food" || cat.name === "Dining")
          icon = "silverware-fork-knife";
        else if (cat.name === "Shopping" || cat.name === "Retail")
          icon = "shopping";
        else if (cat.name === "Transport" || cat.name === "Transit")
          icon = "train";

        results.push({
          id: cat.id,
          total: map[catId],
          count: counts[catId],
          name: cat.name,
          icon,
        });
      }
    });

    return results.sort((a, b) => b.total - a.total).slice(0, 3);
  }, [currentMonthData, categoryMap]);

  const moverPercentages = useMemo(() => {
    const previousStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    ).getTime();
    const previousEnd = startOfMonth;

    const totalsForPeriod = (start: number, end: number) => {
      const totals: Record<string, number> = {};
      transactions.forEach((tx) => {
        if (
          tx.type !== "expense" ||
          tx.timestamp < start ||
          tx.timestamp >= end
        )
          return;
        totals[tx.categoryId] = (totals[tx.categoryId] ?? 0) + tx.amountCents;
      });
      return totals;
    };

    // ⚡ Bolt Optimization: Reuse pre-computed currentMonthData.categoryTotals
    const currentTotals = currentMonthData.categoryTotals;
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
  }, [now, startOfMonth, transactions, currentMonthData.categoryTotals]);

  return (
    <ScreenLayout title="Analytics" backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Insight Header Card */}
        <View style={styles.section}>
          <View
            style={[
              styles.insightCard,
              {
                backgroundColor: theme.colors.surfaceContainerLow,
                overflow: "hidden",
              },
            ]}
          >
            {/* Decoration */}
            <View
              style={[
                styles.decoration,
                { backgroundColor: theme.colors.tertiary + "0D" },
              ]}
            />

            <View style={styles.insightHeader}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: theme.colors.surfaceContainerHighest },
                ]}
              >
                <MaterialCommunityIcons
                  name="piggy-bank"
                  size={24}
                  color={theme.colors.tertiary}
                />
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.colors.tertiary + "1A" },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.tertiary,
                    fontFamily: "SpaceGrotesk_500Medium",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Insight
                </Text>
              </View>
            </View>

            <View style={styles.insightContent}>
              <Text
                variant="headlineSmall"
                style={{ color: theme.colors.onSurface, marginBottom: 4 }}
              >
                {savedPercentage}% Saved
              </Text>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: "BeVietnamPro_400Regular",
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                You&apos;ve saved {formatAppCurrency(savedCents)} this month
                based on your recorded income and expenses.
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Spending */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Monthly Spending
          </Text>
          <View
            style={[
              styles.velocityCard,
              {
                backgroundColor: theme.colors.surfaceContainerLow,
                padding: 16,
              },
            ]}
          >
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
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Category Breakdown
          </Text>
          <View
            style={[
              styles.velocityCard,
              {
                backgroundColor: theme.colors.surfaceContainerLow,
                padding: 16,
                alignItems: "center",
              },
            ]}
          >
            {donutData.length > 0 ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
              >
                <PieChart
                  donut
                  radius={70}
                  innerRadius={40}
                  data={donutData}
                  centerLabelComponent={() => (
                    <Text
                      style={{
                        textAlign: "center",
                        fontWeight: "bold",
                        color: theme.colors.onSurface,
                      }}
                    >
                      Expenses
                    </Text>
                  )}
                />
                <View style={{ gap: 4 }}>
                  {donutData.slice(0, 4).map((d, i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: d.color,
                        }}
                      />
                      <Text
                        style={{ color: theme.colors.onSurface, fontSize: 12 }}
                      >
                        {d.text} {d.label} ({formatAppCurrency(d.value * 100)})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                No expense data for this month yet.
              </Text>
            )}
          </View>
        </View>

        {/* Income vs. Expense */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Income vs. Expense
          </Text>
          <View
            style={[
              styles.velocityCard,
              {
                backgroundColor: theme.colors.surfaceContainerLow,
                padding: 16,
              },
            ]}
          >
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
          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Top Movers
          </Text>
          <View
            style={[
              styles.moversCard,
              { backgroundColor: theme.colors.surfaceContainerLow },
            ]}
          >
            {topMovers.length > 0 ? (
              topMovers.map((mover, idx) => (
                <View key={idx} style={styles.moverItem}>
                  <View style={styles.moverLeft}>
                    <View
                      style={[
                        styles.moverIcon,
                        { backgroundColor: theme.colors.surfaceContainer },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={mover.icon as any}
                        size={24}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View>
                      <Text
                        style={{
                          color: theme.colors.onSurface,
                          fontFamily: "SpaceGrotesk_500Medium",
                          fontSize: 16,
                        }}
                      >
                        {mover.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          fontFamily: "BeVietnamPro_400Regular",
                          fontSize: 14,
                        }}
                      >
                        {mover.count} transactions
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        color: theme.colors.onSurface,
                        fontFamily: "SpaceGrotesk_500Medium",
                        fontSize: 16,
                      }}
                    >
                      -{formatAppCurrency(mover.total)}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {(() => {
                        const delta = moverPercentages[mover.id] ?? 0;
                        const isUp = delta >= 0;
                        const abs = Math.min(999, Math.abs(delta));
                        const display = `${abs.toFixed(0)}%`;
                        const color = isUp
                          ? theme.colors.tertiary
                          : theme.colors.error;

                        return (
                          <>
                            <MaterialCommunityIcons
                              name={isUp ? "arrow-up" : "arrow-down"}
                              size={14}
                              color={color}
                            />
                            <Text
                              style={{
                                color,
                                fontFamily: "BeVietnamPro_400Regular",
                                fontSize: 14,
                              }}
                            >
                              {display}
                            </Text>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ padding: 24, alignItems: "center" }}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  No expense data for this month yet.
                </Text>
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
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 18,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  insightCard: {
    borderRadius: 24,
    padding: 24,
    minHeight: 180,
    justifyContent: "space-between",
    position: "relative",
  },
  decoration: {
    position: "absolute",
    right: -32,
    top: -32,
    width: 128,
    height: 128,
    borderBottomLeftRadius: 64,
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 128,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  barTrack: {
    width: "100%",
    height: "100%",
    borderRadius: 4,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 4,
  },
  moversCard: {
    borderRadius: 20,
    padding: 8,
    gap: 4,
  },
  moverItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
  },
  moverLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  moverIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
