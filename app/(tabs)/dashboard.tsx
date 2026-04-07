import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, ScrollView, UIManager, View } from 'react-native';
import { FAB, List, Text } from 'react-native-paper';

import { QuickAddSheet } from '../../components/QuickAddSheet';
import { SpendingChart } from '../../components/SpendingChart';
import { useTransactionStore } from '../../store/useTransactionStore';

const INITIAL_OFFSET = 16;
const ENTER_STAGGER_DELAY = 80;
const CHART_ENTER_DURATION = 260;
const LIST_ENTER_DURATION = 300;

export default function DashboardScreen() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const transactions = useTransactionStore((state) => state.transactions);
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const chartTranslateY = useRef(new Animated.Value(INITIAL_OFFSET)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(INITIAL_OFFSET)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    Animated.stagger(ENTER_STAGGER_DELAY, [
      Animated.parallel([
        Animated.timing(chartOpacity, { toValue: 1, duration: CHART_ENTER_DURATION, useNativeDriver: true }),
        Animated.timing(chartTranslateY, { toValue: 0, duration: CHART_ENTER_DURATION, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(listOpacity, { toValue: 1, duration: LIST_ENTER_DURATION, useNativeDriver: true }),
        Animated.timing(listTranslateY, { toValue: 0, duration: LIST_ENTER_DURATION, useNativeDriver: true }),
      ]),
    ]).start();
  }, [chartOpacity, chartTranslateY, listOpacity, listTranslateY]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [transactions.length]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Animated.View style={{ opacity: chartOpacity, transform: [{ translateY: chartTranslateY }] }}>
          <Text variant="headlineMedium">Spending Pulse</Text>
          <SpendingChart transactions={transactions} />
        </Animated.View>

        <Animated.View style={{ opacity: listOpacity, transform: [{ translateY: listTranslateY }] }}>
          <Text variant="titleLarge" style={{ marginBottom: 8 }}>
            Recent Transactions
          </Text>
          {transactions.slice(0, 10).map((item) => (
            <List.Item
              key={item.id}
              title={item.title}
              description={`${item.category} • ${item.date}`}
              right={() => <Text style={{ marginTop: 14 }}>${item.amount.toFixed(2)}</Text>}
            />
          ))}
        </Animated.View>
      </ScrollView>

      <FAB
        icon="plus"
        style={{ position: 'absolute', bottom: 20, right: 16 }}
        onPress={() => setIsQuickAddOpen(true)}
      />

      <QuickAddSheet visible={isQuickAddOpen} onDismiss={() => setIsQuickAddOpen(false)} />
    </View>
  );
}
