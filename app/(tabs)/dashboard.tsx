import BottomSheet from '@gorhom/bottom-sheet';
import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { FAB, List, Text } from 'react-native-paper';

import { QuickAddSheet } from '../../components/QuickAddSheet';
import { SpendingChart } from '../../components/SpendingChart';
import { useTransactionStore } from '../../store/useTransactionStore';

export default function DashboardScreen() {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const transactions = useTransactionStore((state) => state.transactions);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Animated.View entering={FadeInUp.duration(300)}>
          <Text variant="headlineMedium">Spending Pulse</Text>
          <SpendingChart transactions={transactions} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(350)}>
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
        onPress={() => bottomSheetRef.current?.snapToIndex(0)}
      />

      <QuickAddSheet ref={bottomSheetRef} />
    </View>
  );
}
