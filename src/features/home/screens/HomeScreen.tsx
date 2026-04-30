import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, FAB, Surface, useTheme, Card, Avatar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const transactions = useTransactionStore((state) => state.transactions);
  const balanceCents = useTransactionStore(selectBalanceCents);

  const [fabExpanded, setFabExpanded] = useState(false);

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFabExpanded(!fabExpanded);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Total Balance
          </Text>
          <Text variant="displayMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            ${(balanceCents / 100).toFixed(2)}
          </Text>
        </Surface>

        <View style={styles.transactionsSection}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Recent Transactions
          </Text>
          {transactions.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
              No transactions yet. Start by adding one!
            </Text>
          ) : (
            transactions.slice(0, 10).map((tx) => (
              <Card key={tx.id} style={styles.txCard} mode="elevated" elevation={1}>
                <Card.Title
                  title={tx.note || 'Transaction'}
                  subtitle={new Date(tx.timestamp).toLocaleDateString()}
                  left={(props) => <Avatar.Icon {...props} icon={tx.type === 'expense' ? 'arrow-up' : 'arrow-down'} />}
                  right={(props) => (
                    <Text {...props} variant="titleMedium" style={{ color: tx.type === 'expense' ? theme.colors.error : theme.colors.primary, paddingRight: 16 }}>
                      {tx.type === 'expense' ? '-' : '+'}${(tx.amountCents / 100).toFixed(2)}
                    </Text>
                  )}
                />
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <FAB
        icon={fabExpanded ? 'close' : 'plus'}
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={handleFabPress}
        theme={{ colors: { primaryContainer: theme.colors.primaryContainer, onPrimaryContainer: theme.colors.onPrimaryContainer } }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  transactionsSection: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  txCard: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
  },
});
