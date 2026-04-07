import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, ScrollView, UIManager, View } from 'react-native';
import { FAB, List, Text } from 'react-native-paper';

import { QuickAddSheet } from '../../components/QuickAddSheet';
import { SpendingChart } from '../../components/SpendingChart';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function DashboardScreen() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const transactions = useTransactionStore((state) => state.transactions);
  const chartOpacity = useRef(new Animated.Value(0)).current;
  const chartTranslateY = useRef(new Animated.Value(14)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(chartOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(chartTranslateY, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(listOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(listTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
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
