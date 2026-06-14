import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Switch, Modal, TextInput } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { ProgressRing } from '../../../components/UI/ProgressRing';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import * as Haptics from 'expo-haptics';
import { formatAppCurrency } from '../../../../utils/currency';

import Animated, { FadeInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { BouncyButton } from '../../../components/UI/BouncyButton';

export default function PlanningScreen() {
  const theme = useTheme<AppTheme>();
  const goals = useGoalsStore((state) => state.goals);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const events = useRecurringStore((state) => state.events);
  const toggleEvent = useRecurringStore((state) => state.toggleEvent);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const handleToggle = (id: string, currentEnabled: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleEvent(id, !currentEnabled);
  };

  const openNewGoal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoalName('');
    setGoalTarget('');
    setGoalModalVisible(true);
  };

  const closeNewGoal = () => {
    setGoalModalVisible(false);
  };

  const submitNewGoal = () => {
    const parsed = Number(goalTarget.replace(/[^0-9.]/g, ''));
    if (!goalName.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    addGoal({ name: goalName.trim(), targetCents: Math.round(parsed * 100) });
    closeNewGoal();
  };

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const addEvent = useRecurringStore((state) => state.addEvent);

  const [recModalVisible, setRecModalVisible] = useState(false);
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'income' | 'expense'>('expense');
  const [recCategoryId, setRecCategoryId] = useState('');
  const [recInterval, setRecInterval] = useState<'weekly' | 'monthly'>('monthly');
  const [recStartDateText, setRecStartDateText] = useState(new Date().toISOString().split('T')[0]);

  const currentMonthSpentByCategory = React.useMemo(() => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const map: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.timestamp >= startOfMonth) {
        map[tx.categoryId] = (map[tx.categoryId] || 0) + tx.amountCents;
      }
    });
    return map;
  }, [transactions]);

  const openNewRecurring = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRecName('');
    setRecAmount('');
    setRecType('expense');
    const defaultCat = categories.find(c => c.kind === 'expense') || categories[0];
    setRecCategoryId(defaultCat?.id || '');
    setRecInterval('monthly');
    setRecStartDateText(new Date().toISOString().split('T')[0]);
    setRecModalVisible(true);
  };

  const closeNewRecurring = () => {
    setRecModalVisible(false);
  };

  const submitNewRecurring = () => {
    const parsedAmount = Number(recAmount.replace(/[^0-9.]/g, ''));
    if (!recName.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !recCategoryId) return;

    const parsedDate = new Date(recStartDateText).getTime();
    const startDate = isNaN(parsedDate) ? Date.now() : parsedDate;

    addEvent({
      name: recName.trim(),
      amountCents: Math.round(parsedAmount * 100),
      type: recType,
      categoryId: recCategoryId,
      interval: recInterval,
      startDate
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeNewRecurring();
  };

  return (
    <ScreenLayout title="Planning" backgroundColor={theme.colors.background}>

      <Modal visible={goalModalVisible} transparent animationType="fade" onRequestClose={closeNewGoal}>
        <BlurView intensity={20} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]} onPress={closeNewGoal}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh, borderColor: theme.colors.outlineVariant }]}
            onPress={() => undefined}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
              New Savings Goal
            </Text>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              placeholder="Vacation, Emergency fund…"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={goalName}
              onChangeText={setGoalName}
            />

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Target</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={goalTarget}
              onChangeText={setGoalTarget}
            />

            <View style={styles.modalActions}>
              <Button mode="text" onPress={closeNewGoal} textColor={theme.colors.onSurfaceVariant}>
                Cancel
              </Button>
              <Button mode="contained" onPress={submitNewGoal}>
                Create
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={recModalVisible} transparent animationType="fade" onRequestClose={closeNewRecurring}>
        <BlurView intensity={20} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]} onPress={closeNewRecurring}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surfaceContainerHigh, borderColor: theme.colors.outlineVariant }]}
            onPress={() => undefined}
          >
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 16 }}>
              New Recurring Event
            </Text>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              placeholder="e.g. Rent, Gym membership..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={recName}
              onChangeText={setRecName}
            />

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Amount</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              keyboardType="decimal-pad"
              placeholder="$0.00"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={recAmount}
              onChangeText={setRecAmount}
            />

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRecType('expense');
                  const targetCats = categories.filter(c => c.kind === 'expense' || c.kind === 'system');
                  if (!targetCats.some(c => c.id === recCategoryId)) {
                    setRecCategoryId(targetCats[0]?.id || '');
                  }
                }}
                style={[
                  styles.typeToggleBtn,
                  recType === 'expense'
                    ? { backgroundColor: theme.colors.errorContainer, borderColor: theme.colors.error }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: recType === 'expense' ? theme.colors.onErrorContainer : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Expense
                </Text>
              </BouncyButton>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRecType('income');
                  const targetCats = categories.filter(c => c.kind === 'income');
                  if (!targetCats.some(c => c.id === recCategoryId)) {
                    setRecCategoryId(targetCats[0]?.id || '');
                  }
                }}
                style={[
                  styles.typeToggleBtn,
                  recType === 'income'
                    ? { backgroundColor: theme.colors.tertiary + '1A', borderColor: theme.colors.tertiary }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: recType === 'income' ? theme.colors.tertiary : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Income
                </Text>
              </BouncyButton>
            </View>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
              {categories
                .filter(c => recType === 'income' ? c.kind === 'income' : (c.kind === 'expense' || c.kind === 'system'))
                .map(c => {
                  const isSelected = c.id === recCategoryId;
                  const budgetLimit = c.maxBudgetLimitCents;
                  const spent = currentMonthSpentByCategory[c.id] || 0;
                  const isWarning = budgetLimit && budgetLimit > 0 && spent >= 0.8 * budgetLimit;

                  return (
                    <BouncyButton
                      key={c.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setRecCategoryId(c.id);
                      }}
                      style={[
                        styles.categoryChip,
                        isSelected
                          ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }
                          : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                      ]}
                    >
                      <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                        {budgetLimit && budgetLimit > 0 && (
                          <View style={{ position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                            <ProgressRing
                              size={32}
                              strokeWidth={2}
                              progress={spent / budgetLimit}
                              color={isWarning ? theme.colors.error : theme.colors.primary}
                              trackColor={isWarning ? theme.colors.errorContainer : theme.colors.surfaceContainerHighest}
                            />
                          </View>
                        )}
                        <Text style={{ fontSize: 16 }}>{c.emoji}</Text>
                      </View>
                      <Text style={{
                        color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                        fontFamily: 'BeVietnamPro_500Medium',
                        fontSize: 14,
                        marginLeft: 4
                      }}>
                        {c.name}
                      </Text>
                    </BouncyButton>
                  );
                })}
            </ScrollView>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Interval</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRecInterval('weekly');
                }}
                style={[
                  styles.typeToggleBtn,
                  recInterval === 'weekly'
                    ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: recInterval === 'weekly' ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Weekly
                </Text>
              </BouncyButton>
              <BouncyButton
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRecInterval('monthly');
                }}
                style={[
                  styles.typeToggleBtn,
                  recInterval === 'monthly'
                    ? { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.surfaceContainerLowest, borderColor: theme.colors.outlineVariant + '4D' }
                ]}
              >
                <Text style={{
                  color: recInterval === 'monthly' ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                  fontFamily: 'BeVietnamPro_500Medium'
                }}>
                  Monthly
                </Text>
              </BouncyButton>
            </View>

            <Text style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8, marginTop: 12 }}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  color: theme.colors.onSurface,
                  borderColor: theme.colors.outlineVariant + '4D',
                },
              ]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={recStartDateText}
              onChangeText={setRecStartDateText}
            />

            <View style={styles.modalActions}>
              <Button mode="text" onPress={closeNewRecurring} textColor={theme.colors.onSurfaceVariant}>
                Cancel
              </Button>
              <Button mode="contained" onPress={submitNewRecurring}>
                Create
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Savings Goals Section */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Savings Goals</Text>
            <BouncyButton
              style={[styles.addButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              onPress={openNewGoal}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>NEW</Text>
            </BouncyButton>
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
                        {formatAppCurrency(goal.savedCents)}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 12 }}>
                        of {formatAppCurrency(goal.targetCents)}
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
        </Animated.View>

        {/* Recurring Events Section */}
        <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Recurring Events</Text>
            <BouncyButton
              style={[styles.addButton, { backgroundColor: theme.colors.surfaceContainerHighest }]}
              onPress={openNewRecurring}
            >
              <MaterialCommunityIcons name="plus" size={16} color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontFamily: 'BeVietnamPro_500Medium', fontSize: 14 }}>NEW</Text>
            </BouncyButton>
          </View>
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
                      {isIncome ? '+' : '-'}{formatAppCurrency(event.amountCents)}
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
        </Animated.View>

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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
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
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeToggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
});
