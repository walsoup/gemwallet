import { ScrollView } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { selectRecurringTransactions, useTransactionStore } from '../../store/useTransactionStore';

const HIGH_COST_THRESHOLD = 15;
const HIGH_COST_WARNING = '⚠️ Warning: expensive recurring habit';
const LOW_COST_WARNING = '✅ Mild impact';

export default function GraveyardScreen() {
  const recurring = useTransactionStore(selectRecurringTransactions);
  const total = recurring.reduce((sum, item) => sum + item.amount, 0);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineMedium">Subscription Graveyard</Text>
      <Text variant="bodyLarge">Monthly drain: ${total.toFixed(2)}</Text>

      {recurring.map((item) => {
        const warning = item.amount >= HIGH_COST_THRESHOLD ? HIGH_COST_WARNING : LOW_COST_WARNING;

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
