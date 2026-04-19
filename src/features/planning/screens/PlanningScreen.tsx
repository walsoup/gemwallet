import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Text, ProgressBar, Button, Switch, Divider } from 'react-native-paper';

import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useAppTheme } from '../../../../providers/AppThemeProvider';

export default function PlanningScreen() {
  const theme = useAppTheme();
  
  const goals = useGoalsStore((state) => state.goals);
  const events = useRecurringStore((state) => state.events);
  const toggleEvent = useRecurringStore((state) => state.toggleEvent);
  
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const locale = language || 'en-US';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Planning
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Savings Goals
          </Text>
          <Button mode="text" onPress={() => {}}>+ NEW</Button>
        </View>

        <View style={styles.goalsContainer}>
          {goals.length === 0 ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginVertical: 24 }}>
              No goals set. Start saving!
            </Text>
          ) : (
            goals.map(goal => {
              const progress = Math.min(goal.savedCents / goal.targetCents, 1);
              return (
                <Card key={goal.id} style={[styles.goalCard, { backgroundColor: theme.colors.surfaceContainer }]}>
                  <Card.Content>
                    <View style={styles.goalHeader}>
                      <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Text style={{ fontSize: 20 }}>🎯</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{goal.name}</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{goal.dueDate ? `By ${new Date(goal.dueDate).toLocaleDateString()}` : 'No date set'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                          {formatCurrency(goal.savedCents, { currencyCode, locale })}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          of {formatCurrency(goal.targetCents, { currencyCode, locale })}
                        </Text>
                      </View>
                    </View>
                    <ProgressBar progress={progress} color={theme.colors.primary} style={styles.progressBar} />
                  </Card.Content>
                </Card>
              );
            })
          )}
        </View>

        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Recurring Events
          </Text>
          <Button mode="text" onPress={() => {}}>+ ADD</Button>
        </View>

        <Card style={{ backgroundColor: theme.colors.surfaceContainer, borderRadius: 24 }}>
          <Card.Content style={{ gap: 16 }}>
            {events.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                No recurring events set.
              </Text>
            ) : (
              events.map((event, index) => (
                <View key={event.id}>
                  {index > 0 && <Divider style={{ marginBottom: 16 }} />}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.iconBoxSmall, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <Text style={{ fontSize: 16 }}>{event.type === 'income' ? '📈' : '📉'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{event.name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{event.interval}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                      <Text variant="titleMedium" style={{ color: event.type === 'income' ? theme.colors.tertiary : theme.colors.onSurface, fontWeight: 'bold' }}>
                        {event.type === 'income' ? '+' : '-'}{formatCurrency(event.amountCents, { currencyCode, locale })}
                      </Text>
                    </View>
                    <Switch value={event.enabled} onValueChange={() => toggleEvent(event.id, !event.enabled)} />
                  </View>
                </View>
              ))
            )}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 24,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  iconBoxSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  }
});
