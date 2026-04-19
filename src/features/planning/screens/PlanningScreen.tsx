import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  Modal,
  Portal,
  ProgressBar,
  Surface,
  Switch,
  Text,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';

import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { useAppTheme } from '../../../../providers/AppThemeProvider';

type RecurringForm = {
  name: string;
  amount: string;
  type: 'income' | 'expense';
  interval: 'weekly' | 'monthly';
  categoryId: string;
  startDate: string;
};

type GoalForm = {
  name: string;
  target: string;
  dueDate: string;
};

function addAlpha(hex: string, opacity: number) {
  if (!hex.startsWith('#')) return hex;
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const safeOpacity = Math.min(Math.max(opacity, 0), 1);
  return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
}

function parseAmountToCents(value: string) {
  if (!value.trim()) return 0;
  const normalized = Number.parseFloat(value.replace(/,/g, ''));
  if (!Number.isFinite(normalized) || normalized <= 0) return 0;
  return Math.round(normalized * 100);
}

function parseDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function useBounce() {
  const scale = useRef(new Animated.Value(1)).current;
  const animateTo = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();

  return {
    scale,
    onPressIn: () => animateTo(0.96),
    onPressOut: () => animateTo(1),
  };
}

function BouncyButton({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = useBounce();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Button
        mode="contained-tonal"
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        icon="plus"
      >
        {children}
      </Button>
    </Animated.View>
  );
}

export default function PlanningScreen() {
  const theme = useAppTheme();

  const goals = useGoalsStore((state) => state.goals);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const events = useRecurringStore((state) => state.events);
  const addEvent = useRecurringStore((state) => state.addEvent);
  const toggleEvent = useRecurringStore((state) => state.toggleEvent);
  const recurringEnabled = useRecurringStore((state) => state.recurringEnabled);
  const setRecurringEnabled = useRecurringStore((state) => state.setRecurringEnabled);

  const categories = useTransactionStore((state) => state.categories);

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const locale = language || 'en-US';

  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [recurringSheetVisible, setRecurringSheetVisible] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalForm>({ name: '', target: '', dueDate: '' });
  const [recurringForm, setRecurringForm] = useState<RecurringForm>({
    name: '',
    amount: '',
    type: 'expense',
    interval: 'monthly',
    categoryId: '',
    startDate: '',
  });
  const [formError, setFormError] = useState('');

  const heroScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.spring(heroScale, {
      toValue: 1,
      bounciness: 12,
      speed: 12,
      useNativeDriver: true,
    }).start();
  }, [heroScale, goals.length, events.length]);

  const filteredCategories = useMemo(
    () =>
      categories.filter((item) =>
        recurringForm.type === 'income' ? item.kind === 'income' : item.kind !== 'income'
      ),
    [categories, recurringForm.type]
  );

  useEffect(() => {
    if (!filteredCategories.length) return;
    if (!filteredCategories.some((item) => item.id === recurringForm.categoryId)) {
      setRecurringForm((prev) => ({ ...prev, categoryId: filteredCategories[0].id }));
    }
  }, [filteredCategories, recurringForm.categoryId]);

  const activeGoals = goals.filter((goal) => goal.enabled);
  const activeEvents = events.filter((event) => event.enabled);

  const totalGoalTarget = activeGoals.reduce((sum, goal) => sum + goal.targetCents, 0);
  const totalGoalSaved = activeGoals.reduce((sum, goal) => sum + goal.savedCents, 0);
  const blendedGoalProgress = totalGoalTarget > 0 ? totalGoalSaved / totalGoalTarget : 0;

  const recurringPulse = activeEvents.reduce((sum, event) => {
    const direction = event.type === 'income' ? 1 : -1;
    const intervalFactor = event.interval === 'weekly' ? 4 : 1;
    return sum + direction * event.amountCents * intervalFactor;
  }, 0);

  const handleAddGoal = () => {
    const targetCents = parseAmountToCents(goalForm.target);
    const dueDate = parseDateInput(goalForm.dueDate);
    if (!goalForm.name.trim() || targetCents <= 0) {
      setFormError('Add a name and target amount to save a goal.');
      return;
    }
    addGoal({ name: goalForm.name, targetCents, dueDate });
    setGoalForm({ name: '', target: '', dueDate: '' });
    setGoalSheetVisible(false);
    setFormError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const handleAddRecurring = () => {
    const amountCents = parseAmountToCents(recurringForm.amount);
    if (!recurringForm.name.trim() || amountCents <= 0 || !recurringForm.categoryId) {
      setFormError('Recurring items need a name, amount, and category.');
      return;
    }

    addEvent({
      name: recurringForm.name,
      amountCents,
      type: recurringForm.type,
      categoryId: recurringForm.categoryId,
      interval: recurringForm.interval,
      startDate: parseDateInput(recurringForm.startDate),
    });
    setRecurringEnabled(true);
    setRecurringForm({
      name: '',
      amount: '',
      type: recurringForm.type,
      interval: recurringForm.interval,
      categoryId: filteredCategories[0]?.id ?? '',
      startDate: '',
    });
    setRecurringSheetVisible(false);
    setFormError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
            Planning
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Modern, Material 3 cash planning with smooth motion.
          </Text>
        </View>

        <Animated.View style={{ transform: [{ scale: heroScale }] }}>
          <Surface style={[styles.surface, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Automations
                </Text>
                <Text variant="headlineSmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                  {formatCurrency(recurringPulse, { currencyCode, locale })}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Est. monthly impact from recurring items
                </Text>
              </View>
              <Divider style={styles.heroDivider} />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                  Goals
                </Text>
                <Text variant="headlineSmall" style={{ color: theme.colors.tertiary, fontWeight: 'bold' }}>
                  {Math.round(blendedGoalProgress * 100)}%
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Across {activeGoals.length || 'no'} active goals
                </Text>
              </View>
            </View>
          </Surface>
        </Animated.View>

        <Surface style={[styles.surface, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                Savings goals
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Keep targets tangible with progress bars.
              </Text>
            </View>
            <BouncyButton onPress={() => setGoalSheetVisible(true)}>New goal</BouncyButton>
          </View>

          <View style={{ gap: 14 }}>
            {goals.length === 0 ? (
              <Card style={[styles.goalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                <Card.Content>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    No goals yet. Set a target to start saving.
                  </Text>
                </Card.Content>
              </Card>
            ) : (
              goals.map((goal) => {
                const progress = Math.min(goal.savedCents / goal.targetCents, 1);
                return (
                  <Card
                    key={goal.id}
                    style={[styles.goalCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}
                  >
                    <Card.Content style={{ gap: 10 }}>
                      <View style={styles.goalHeader}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                          <Text style={{ fontSize: 20 }}>🎯</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                            {goal.name}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {goal.dueDate ? `By ${new Date(goal.dueDate).toLocaleDateString()}` : 'No date set'}
                          </Text>
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
        </Surface>

        <Surface style={[styles.surface, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                Recurring events
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Automate cash in and out with M3-aligned cards.
              </Text>
            </View>
            <BouncyButton onPress={() => setRecurringSheetVisible(true)}>Add</BouncyButton>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                Automation
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Apply due recurring items automatically.
              </Text>
            </View>
            <Switch value={recurringEnabled} onValueChange={setRecurringEnabled} />
          </View>

          <Divider style={{ marginVertical: 12 }} />

          {events.length === 0 ? (
            <Card style={{ backgroundColor: theme.colors.surfaceContainerHigh }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  No recurring events set. Add one to see it here.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              {events.map((event, index) => {
                const isIncome = event.type === 'income';
                return (
                  <View key={event.id}>
                    {index > 0 && <Divider style={{ marginBottom: 12 }} />}
                    <Card style={{ backgroundColor: theme.colors.surfaceContainerHigh }}>
                      <Card.Content style={{ gap: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.iconBoxSmall, { backgroundColor: theme.colors.surfaceVariant }]}>
                            <Text style={{ fontSize: 16 }}>{isIncome ? '📈' : '📉'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                              {event.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Chip
                                compact
                                mode="flat"
                                style={{ backgroundColor: theme.colors.surfaceContainerLowest }}
                                textStyle={{ color: theme.colors.onSurfaceVariant }}
                              >
                                {event.interval === 'weekly' ? 'Weekly' : 'Monthly'}
                              </Chip>
                              <Chip
                                compact
                                mode="outlined"
                                style={{ borderColor: theme.colors.outline }}
                                textStyle={{ color: theme.colors.onSurfaceVariant }}
                              >
                                {event.type.toUpperCase()}
                              </Chip>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                            <Text
                              variant="titleMedium"
                              style={{
                                color: isIncome ? theme.colors.tertiary : theme.colors.onSurface,
                                fontWeight: 'bold',
                              }}
                            >
                              {isIncome ? '+' : '-'}
                              {formatCurrency(event.amountCents, { currencyCode, locale })}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              Next: {new Date(event.nextRun).toLocaleDateString()}
                            </Text>
                          </View>
                          <Switch value={event.enabled} onValueChange={() => toggleEvent(event.id, !event.enabled)} />
                        </View>
                      </Card.Content>
                    </Card>
                  </View>
                );
              })}
            </View>
          )}
        </Surface>
      </ScrollView>

      <Portal>
        <Modal
          visible={goalSheetVisible}
          onDismiss={() => {
            setGoalSheetVisible(false);
            setFormError('');
          }}
          contentContainerStyle={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: addAlpha(theme.colors.outline, 0.2) },
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            New savings goal
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Keep it short and measurable. We will track your progress automatically.
          </Text>
          <TextInput
            label="Goal name"
            mode="outlined"
            value={goalForm.name}
            onChangeText={(text) => setGoalForm((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />
          <TextInput
            label="Target amount"
            mode="outlined"
            keyboardType="numeric"
            value={goalForm.target}
            onChangeText={(text) => setGoalForm((prev) => ({ ...prev, target: text }))}
            style={styles.input}
          />
          <TextInput
            label="Due date (optional, YYYY-MM-DD)"
            mode="outlined"
            value={goalForm.dueDate}
            onChangeText={(text) => setGoalForm((prev) => ({ ...prev, dueDate: text }))}
            style={styles.input}
          />
          {formError ? (
            <HelperText type="error" visible>
              {formError}
            </HelperText>
          ) : null}
          <Button mode="contained" onPress={handleAddGoal} style={{ marginTop: 8 }}>
            Save goal
          </Button>
        </Modal>

        <Modal
          visible={recurringSheetVisible}
          onDismiss={() => {
            setRecurringSheetVisible(false);
            setFormError('');
          }}
          contentContainerStyle={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: addAlpha(theme.colors.outline, 0.2) },
          ]}
        >
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            Add recurring item
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Build a modern, bouncy schedule for cash in or out.
          </Text>
          <TextInput
            label="Name"
            mode="outlined"
            value={recurringForm.name}
            onChangeText={(text) => setRecurringForm((prev) => ({ ...prev, name: text }))}
            style={styles.input}
          />
          <TextInput
            label="Amount"
            mode="outlined"
            keyboardType="numeric"
            value={recurringForm.amount}
            onChangeText={(text) => setRecurringForm((prev) => ({ ...prev, amount: text }))}
            style={styles.input}
          />
          <SegmentedButtons
            value={recurringForm.type}
            onValueChange={(value) =>
              setRecurringForm((prev) => ({ ...prev, type: value as 'income' | 'expense' }))
            }
            style={{ marginBottom: 12 }}
            buttons={[
              { value: 'expense', label: 'Expense', icon: 'arrow-down-bold' },
              { value: 'income', label: 'Income', icon: 'arrow-up-bold' },
            ]}
          />
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 6 }}>
            Interval
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['weekly', 'monthly'] as const).map((interval) => (
              <Chip
                key={interval}
                selected={recurringForm.interval === interval}
                onPress={() => setRecurringForm((prev) => ({ ...prev, interval }))}
                mode="flat"
              >
                {interval === 'weekly' ? 'Weekly' : 'Monthly'}
              </Chip>
            ))}
          </View>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, marginBottom: 6 }}>
            Category
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {filteredCategories.map((category) => (
              <Chip
                key={category.id}
                selected={recurringForm.categoryId === category.id}
                onPress={() => setRecurringForm((prev) => ({ ...prev, categoryId: category.id }))}
                mode="outlined"
                style={{ borderColor: recurringForm.categoryId === category.id ? theme.colors.primary : theme.colors.outline }}
                textStyle={{
                  color:
                    recurringForm.categoryId === category.id
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                }}
              >
                {category.emoji} {category.name}
              </Chip>
            ))}
          </View>
          <TextInput
            label="Start date (optional, YYYY-MM-DD)"
            mode="outlined"
            value={recurringForm.startDate}
            onChangeText={(text) => setRecurringForm((prev) => ({ ...prev, startDate: text }))}
            style={styles.input}
          />
          {formError ? (
            <HelperText type="error" visible>
              {formError}
            </HelperText>
          ) : null}
          <Button mode="contained" onPress={handleAddRecurring} style={{ marginTop: 8 }}>
            Save recurring item
          </Button>
        </Modal>
      </Portal>
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
    gap: 16,
  },
  header: {
    gap: 6,
  },
  surface: {
    borderRadius: 24,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  goalsContainer: {
    gap: 16,
  },
  goalCard: {
    borderRadius: 20,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
  },
  iconBoxSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#00000010',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheet: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    marginBottom: 10,
  },
});
