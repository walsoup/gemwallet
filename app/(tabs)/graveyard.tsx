import { useEffect } from 'react';
import { LayoutAnimation, Platform, ScrollView, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, useTheme } from 'react-native-paper';

import { selectRecurringTransactions, useTransactionStore } from '../../store/useTransactionStore';

export default function GraveyardScreen() {
  const theme = useTheme();
  const recurring = useTransactionStore(selectRecurringTransactions);
  const total = recurring.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [recurring.length]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
          Subscription Graveyard
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
          Monthly drain: ${total.toFixed(2)}
        </Text>

        {recurring.map((item) => (
          <Card key={item.id} mode="contained" style={{ backgroundColor: theme.colors.errorContainer }}>
            <Card.Title
              title={item.title}
              subtitle={`${item.interval ?? 'monthly'} • passive wealth drain`}
              titleStyle={{ color: theme.colors.onErrorContainer }}
              subtitleStyle={{ color: theme.colors.onErrorContainer }}
            />
            <Card.Content>
              <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer }}>
                ${item.amount.toFixed(2)}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
