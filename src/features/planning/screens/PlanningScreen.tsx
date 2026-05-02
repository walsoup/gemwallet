import React from 'react';
import { ScrollView, StyleSheet, View, Pressable, Switch } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { CustomTopNav } from '../../../components/Navigation/CustomTopNav';
import * as Haptics from 'expo-haptics';

export default function PlanningScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const goals = useGoalsStore((state) => state.goals);
  const events = useRecurringStore((state) => state.events);
  const toggleEvent = useRecurringStore((state) => state.toggleEvent);

  const handleToggle = (id: string, currentEnabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleEvent(id, !currentEnabled);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomTopNav title="Planning" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>

        {/* Savings Goals Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Savings Goals</Text>
            <Pressable
              style={[styles.addButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              onPress={() => {}}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>NEW</Text>
            </Pressable>
          </View>

          <View style={styles.goalsGrid}>
            {goals.length > 0 ? goals.map(goal => {
              const progress = Math.min(100, (goal.savedCents / goal.targetCents) * 100);
              return (
                <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.colors.surfaceContainerLow }]}>
                  <View style={styles.goalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.goalIcon, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                        <MaterialCommunityIcons name="shield-check" size={24} color={theme.colors.primaryContainer} />
                      </View>
                      <View>
                        <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_500Medium', fontSize: 16 }}>{goal.name}</Text>
                        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Goal</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_500Medium', fontSize: 18 }}>
                        ${(goal.savedCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 12 }}>
                        of ${(goal.targetCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 24 }}>
                    <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceContainerHighest }]}>
                      <View style={[styles.progressBarFill, { backgroundColor: theme.colors.primaryContainer, width: `${progress}%` }]} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontFamily: 'BeVietnamPro_400Regular' }}>
                        {progress.toFixed(0)}% funded
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontFamily: 'BeVietnamPro_400Regular' }}>
                        {goal.dueDate ? `Est: ${new Date(goal.dueDate).toLocaleDateString()}` : 'No deadline'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }) : (
              <View style={[styles.goalCard, { backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: theme.colors.onSurfaceVariant, padding: 24 }}>No savings goals created.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recurring Events Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, marginBottom: 24 }]}>Recurring Events</Text>
          <View style={[styles.eventsContainer, { backgroundColor: theme.colors.surfaceContainerLow }]}>
            {events.length > 0 ? events.map(event => {
              const isIncome = event.type === 'income';
              let iconName = 'help';
              if (event.name.toLowerCase().includes('rent') || event.name.toLowerCase().includes('mortgage')) iconName = 'home';
              else if (isIncome) iconName = 'cash';
              else if (event.name.toLowerCase().includes('gym')) iconName = 'dumbbell';

              return (
                <View key={event.id} style={[styles.eventItem, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
                  <View style={styles.eventLeft}>
                    <View style={[styles.eventIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                      <MaterialCommunityIcons
                        name={iconName as any}
                        size={20}
                        color={isIncome ? theme.colors.tertiary : theme.colors.onSurfaceVariant}
                      />
                    </View>
                    <View>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_500Medium', fontSize: 16 }}>{event.name}</Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                        {event.interval === 'monthly' ? 'Monthly' : 'Weekly'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <Text style={{
                      color: isIncome ? theme.colors.tertiary : theme.colors.onSurface,
                      fontFamily: 'SpaceGrotesk_500Medium',
                      fontSize: 18
                    }}>
                      {isIncome ? '+' : '-'}${(event.amountCents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </Text>
                    <Switch
                      value={event.enabled}
                      onValueChange={() => handleToggle(event.id, event.enabled)}
                      trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
                      thumbColor={theme.colors.onSurface}
                    />
                  </View>
                </View>
              );
            }) : (
               <View style={{ padding: 24, alignItems: 'center' }}>
                 <Text style={{ color: theme.colors.onSurfaceVariant }}>No recurring events.</Text>
               </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_500Medium',
    fontSize: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  goalsGrid: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 20,
    padding: 24,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  eventsContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    margin: 8,
    borderRadius: 12,
  },
  eventLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
