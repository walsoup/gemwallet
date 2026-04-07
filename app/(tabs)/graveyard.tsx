import { ScrollView } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { selectRecurringTransactions, useTransactionStore } from '../../store/useTransactionStore';

export default function GraveyardScreen() {
  const recurring = useTransactionStore(selectRecurringTransactions);
  const total = recurring.reduce((sum, item) => sum + item.amount, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineMedium">Subscription Graveyard</Text>
      <Text variant="bodyLarge">Monthly drain: ${total.toFixed(2)}</Text>

      {recurring.map((item) => {
        const warning = item.amount >= 15 ? '⚠️ Warning: expensive recurring habit' : '✅ Mild impact';

        return (
          <Card key={item.id} mode="contained">
            <Card.Title title={item.title} subtitle={`${item.interval ?? 'monthly'} • ${warning}`} />
            <Card.Content>
              <Text variant="titleMedium">${item.amount.toFixed(2)}</Text>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
}
