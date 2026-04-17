import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Chip,
  Divider,
  HelperText,
  IconButton,
  List,
  ProgressBar,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import { formatCurrency } from '../../../../utils/formatCurrency';

const currencyOptions = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'AUD', label: 'AUD (A$)' },
  { code: 'CAD', label: 'CAD (C$)' },
  { code: 'MAD', label: 'MAD (د.م.)' },
] as const;

const languageOptions = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'ja-JP', label: '日本語' },
] as const;

const regionOptions = [
  { code: 'US', label: 'United States' },
  { code: 'EU', label: 'Europe' },
  { code: 'UK', label: 'United Kingdom' },
  { code: 'JP', label: 'Japan' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
  { code: 'MA', label: 'Morocco' },
] as const;

const modelOptions = [
  { value: 'gemma-4-31b-it', label: 'Gemma 4 31B (default)' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (fallback)' },
  { value: 'gemma-2-9b-it', label: 'Gemma 2 9B' },
] as const;

export default function SettingsScreen() {
  const theme = useTheme();
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('🧩');
  const [exportPreview, setExportPreview] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDueDate, setGoalDueDate] = useState('');
  const [goalContribution, setGoalContribution] = useState<Record<string, string>>({});
  const [recurringName, setRecurringName] = useState('');
  const [recurringAmount, setRecurringAmount] = useState('');
  const [recurringType, setRecurringType] = useState<'expense' | 'income'>('expense');
  const [recurringInterval, setRecurringInterval] = useState<'weekly' | 'monthly'>('monthly');
  const [recurringCategoryId, setRecurringCategoryId] = useState<string | null>(null);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const includeNotesInExport = useSettingsStore((state) => state.includeNotesInExport);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);
  const setPasscodeEnabled = useSettingsStore((state) => state.setPasscodeEnabled);
  const setPasscodePin = useSettingsStore((state) => state.setPasscodePin);
  const setCurrencyCode = useSettingsStore((state) => state.setCurrencyCode);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const setRegion = useSettingsStore((state) => state.setRegion);
  const setGeminiApiKey = useSettingsStore((state) => state.setGeminiApiKey);
  const setGemmaModel = useSettingsStore((state) => state.setGemmaModel);
  const setAdvancedSummariesEnabled = useSettingsStore((state) => state.setAdvancedSummariesEnabled);
  const setIncludeNotesInExport = useSettingsStore((state) => state.setIncludeNotesInExport);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const locale = language || 'en-US';
  const goalsEnabled = useGoalsStore((state) => state.goalsEnabled);
  const goals = useGoalsStore((state) => state.goals);
  const addGoal = useGoalsStore((state) => state.addGoal);
  const contributeToGoal = useGoalsStore((state) => state.contributeToGoal);
  const toggleGoal = useGoalsStore((state) => state.toggleGoal);
  const deleteGoal = useGoalsStore((state) => state.deleteGoal);
  const setGoalsEnabled = useGoalsStore((state) => state.setGoalsEnabled);
  const recurringEnabled = useRecurringStore((state) => state.recurringEnabled);
  const recurringEvents = useRecurringStore((state) => state.events);
  const addRecurringEvent = useRecurringStore((state) => state.addEvent);
  const toggleRecurringEvent = useRecurringStore((state) => state.toggleEvent);
  const deleteRecurringEvent = useRecurringStore((state) => state.deleteEvent);
  const applyDueRecurringEvents = useRecurringStore((state) => state.applyDueEvents);
  const runRecurringEventNow = useRecurringStore((state) => state.runEventNow);

  const categories = useTransactionStore((state) => state.categories);
  const transactions = useTransactionStore((state) => state.transactions);
  const addCustomCategory = useTransactionStore((state) => state.addCustomCategory);
  const deleteCategory = useTransactionStore((state) => state.deleteCategory);
  const clearAllData = useTransactionStore((state) => state.clearAllData);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);

  const exportRows = useMemo(() => {
    const byId = new Map(categories.map((item) => [item.id, item]));
    const dateFormatter = new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const headerColumns = includeNotesInExport
      ? ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Note', 'Amount', 'Currency', 'Region']
      : ['Transaction ID', 'Date', 'Time', 'Type', 'Category', 'Amount', 'Currency', 'Region'];
    const header = headerColumns.join(',');

    const lines = transactions.map((item) => {
      const date = new Date(item.timestamp);
      const category = byId.get(item.categoryId);
      const label = category ? `${category.emoji} ${category.name}` : 'Uncategorized';
      const note = (item.note ?? '').replaceAll('"', '""');
      const amount = formatCurrency(item.amountCents, { currencyCode, locale });

      const columns = [
        item.id,
        dateFormatter.format(date),
        timeFormatter.format(date),
        item.type.toUpperCase(),
        `"${label}"`,
      ];

      if (includeNotesInExport) {
        columns.push(`"${note}"`);
      }

      columns.push(`"${amount}"`, currencyCode, region);

      return columns.join(',');
    });

    return [header, ...lines].join('\n');
  }, [categories, currencyCode, includeNotesInExport, locale, region, transactions]);

  const formatDate = useCallback(
    (timestamp?: number) => {
      if (!timestamp) return 'No date';
      return new Date(timestamp).toLocaleDateString(locale || 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    [locale]
  );

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === 'expense'),
    [categories]
  );

  const incomeCategories = useMemo(
    () => categories.filter((item) => item.kind === 'income'),
    [categories]
  );

  const recurringCategoryList = recurringType === 'income' ? incomeCategories : expenseCategories;

  const ensureRecurringCategory = useCallback(() => {
    if (!recurringCategoryId && recurringCategoryList.length) {
      setRecurringCategoryId(recurringCategoryList[0].id);
    }
  }, [recurringCategoryId, recurringCategoryList]);

  useEffect(() => {
    ensureRecurringCategory();
  }, [ensureRecurringCategory]);

  const handleSavePasscode = () => {
    if (passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm) {
      setPasscodeEnabled(false);
      return;
    }
    setPasscodePin(passcodeDraft);
    setPasscodeEnabled(true);
    setPasscodeDraft('');
    setPasscodeConfirm('');
  };

  const handleCreateGoal = async () => {
    const target = Math.round(Number(goalTarget || '0') * 100);
    if (!goalsEnabled || !goalName.trim() || target <= 0) return;
    const due = goalDueDate ? Date.parse(goalDueDate) : undefined;
    addGoal({ name: goalName, targetCents: target, dueDate: Number.isFinite(due) ? due : undefined });
    setGoalName('');
    setGoalTarget('');
    setGoalDueDate('');
    await Haptics.selectionAsync();
  };

  const handleContributeToGoal = async (goalId: string) => {
    const amount = Math.round(Number(goalContribution[goalId] || '0') * 100);
    if (amount <= 0) return;
    const updated = contributeToGoal(goalId, amount);
    if (updated) {
      addExpense({ amountCents: amount, categoryId: 'expense-savings', note: `Goal: ${updated.name}` });
      setGoalContribution((prev) => ({ ...prev, [goalId]: '' }));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleCreateRecurring = async () => {
    ensureRecurringCategory();
    const amount = Math.round(Number(recurringAmount || '0') * 100);
    if (!recurringEnabled || !recurringName.trim() || amount <= 0 || !recurringCategoryId) return;
    addRecurringEvent({
      name: recurringName,
      amountCents: amount,
      type: recurringType,
      categoryId: recurringCategoryId,
      interval: recurringInterval,
    });
    setRecurringName('');
    setRecurringAmount('');
    await Haptics.selectionAsync();
  };

  const applyDueNow = async () => {
    applyDueRecurringEvents(Date.now(), (event) => {
      if (event.type === 'income') {
        addIncome({ amountCents: event.amountCents, categoryId: event.categoryId, note: `Recurring: ${event.name}` });
      } else {
        addExpense({ amountCents: event.amountCents, categoryId: event.categoryId, note: `Recurring: ${event.name}` });
      }
    });
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const runSingleRecurring = async (id: string) => {
    runRecurringEventNow(id, (event) => {
      if (event.type === 'income') {
        addIncome({ amountCents: event.amountCents, categoryId: event.categoryId, note: `Recurring: ${event.name}` });
      } else {
        addExpense({ amountCents: event.amountCents, categoryId: event.categoryId, note: `Recurring: ${event.name}` });
      }
    }, Date.now());
    await Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          gap: 16,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ gap: 6, paddingHorizontal: 4 }}>
          <Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
            Settings
          </Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Material 3 expressive layout with tonal surfaces, dynamic color, and AI controls.
          </Text>
        </View>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Appearance"
            subtitle="Material Design 3 expressive surfaces"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
            <SegmentedButtons
              value={themePreference}
              onValueChange={(value) => setThemePreference(value as 'system' | 'light' | 'dark')}
              buttons={[
                { label: 'System', value: 'system' },
                { label: 'Light', value: 'light' },
                { label: 'Dark', value: 'dark' },
              ]}
            />
            <List.Item
              title="OLED true black"
              description="Use pure black backgrounds on OLED displays."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={oledTrueBlackEnabled} onValueChange={setOledTrueBlackEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            <List.Item
              title="High contrast mode"
              description="Increase outline contrast for legibility."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={highContrastEnabled} onValueChange={setHighContrastEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Savings goals"
            subtitle="Enable goals, set targets, and log deposits."
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 12 }}>
            <List.Item
              title="Goals enabled"
              description="Track progress with local-only data."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={goalsEnabled} onValueChange={setGoalsEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            {goalsEnabled ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Goal name"
                  value={goalName}
                  onChangeText={setGoalName}
                  placeholder="Emergency fund"
                />
                <TextInput
                  mode="outlined"
                  label="Target amount"
                  value={goalTarget}
                  onChangeText={setGoalTarget}
                  keyboardType="decimal-pad"
                  placeholder="500.00"
                />
                <TextInput
                  mode="outlined"
                  label="Due date (optional, YYYY-MM-DD)"
                  value={goalDueDate}
                  onChangeText={setGoalDueDate}
                  placeholder="2025-12-31"
                />
                <Button mode="contained" onPress={handleCreateGoal} disabled={!goalName.trim() || !goalTarget}>
                  Create goal
                </Button>
                <Divider />
                {goals.length === 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    No goals yet.
                  </Text>
                ) : (
                  goals.map((goal) => {
                    const progress = goal.targetCents ? goal.savedCents / goal.targetCents : 0;
                    return (
                      <Card key={goal.id} mode="outlined" style={{ backgroundColor: theme.colors.surfaceVariant }}>
                        <Card.Content style={{ gap: 8 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                              {goal.name}
                            </Text>
                            <Chip
                              mode="outlined"
                              selected={goal.enabled}
                              onPress={() => toggleGoal(goal.id, !goal.enabled)}
                              selectedColor={theme.colors.onSecondaryContainer}
                            >
                              {goal.enabled ? 'Enabled' : 'Paused'}
                            </Chip>
                          </View>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {formatCurrency(goal.savedCents, { currencyCode, locale })} / {formatCurrency(goal.targetCents, { currencyCode, locale })} {goal.completed ? '• Completed' : ''}
                          </Text>
                          <ProgressBar progress={Math.min(1, progress)} />
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            Due: {formatDate(goal.dueDate)}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <TextInput
                              mode="outlined"
                              style={{ flex: 1 }}
                              label="Deposit amount"
                              value={goalContribution[goal.id] ?? ''}
                              onChangeText={(val) => setGoalContribution((prev) => ({ ...prev, [goal.id]: val }))}
                              keyboardType="decimal-pad"
                            />
                            <Button mode="contained-tonal" onPress={() => void handleContributeToGoal(goal.id)} disabled={!goalContribution[goal.id]}>
                              Add
                            </Button>
                            <IconButton icon="delete-outline" onPress={() => deleteGoal(goal.id)} />
                          </View>
                        </Card.Content>
                      </Card>
                    );
                  })
                )}
              </>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Toggle on to start creating goals.
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Recurring cash events"
            subtitle="Auto-log frequent income or expenses."
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 12 }}>
            <List.Item
              title="Recurring enabled"
              description="Keep schedules local; apply when due."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={recurringEnabled} onValueChange={setRecurringEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            {recurringEnabled ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Event name"
                  value={recurringName}
                  onChangeText={setRecurringName}
                  placeholder="Rent"
                />
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={recurringAmount}
                  onChangeText={setRecurringAmount}
                  keyboardType="decimal-pad"
                  placeholder="1200.00"
                />
                <SegmentedButtons
                  value={recurringType}
                  onValueChange={(val) => setRecurringType(val as 'expense' | 'income')}
                  buttons={[
                    { value: 'expense', label: 'Expense', icon: 'minus' },
                    { value: 'income', label: 'Income', icon: 'plus' },
                  ]}
                />
                <SegmentedButtons
                  value={recurringInterval}
                  onValueChange={(val) => setRecurringInterval(val as 'weekly' | 'monthly')}
                  buttons={[
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                />
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
                  Category
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {recurringCategoryList.map((item) => (
                    <Chip
                      key={item.id}
                      selected={recurringCategoryId === item.id}
                      onPress={() => setRecurringCategoryId(item.id)}
                      selectedColor={theme.colors.onSecondaryContainer}
                      style={{
                        backgroundColor:
                          recurringCategoryId === item.id ? theme.colors.secondaryContainer : theme.colors.surface,
                      }}
                    >
                      {item.emoji} {item.name}
                    </Chip>
                  ))}
                </ScrollView>
                <Button mode="contained" onPress={handleCreateRecurring} disabled={!recurringName.trim() || !recurringAmount || !recurringCategoryId}>
                  Create recurring event
                </Button>
                <Button mode="outlined" onPress={() => void applyDueNow()}>
                  Apply due now
                </Button>
                <Divider />
                {recurringEvents.length === 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    No recurring events yet.
                  </Text>
                ) : (
                  recurringEvents.map((event) => (
                    <Card key={event.id} mode="outlined" style={{ backgroundColor: theme.colors.surfaceVariant }}>
                      <Card.Content style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                            {event.name}
                          </Text>
                          <Chip
                            mode="outlined"
                            selected={event.enabled}
                            onPress={() => toggleRecurringEvent(event.id, !event.enabled)}
                            selectedColor={theme.colors.onSecondaryContainer}
                          >
                            {event.enabled ? 'Enabled' : 'Paused'}
                          </Chip>
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {event.type === 'income' ? '+' : '-'}
                          {formatCurrency(event.amountCents, { currencyCode, locale })} • {event.interval} • Next: {formatDate(event.nextRun)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <Button mode="contained-tonal" onPress={() => void runSingleRecurring(event.id)}>
                            Run now
                          </Button>
                          <Button mode="text" onPress={() => deleteRecurringEvent(event.id)}>
                            Delete
                          </Button>
                        </View>
                      </Card.Content>
                    </Card>
                  ))
                )}
              </>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Toggle on to manage recurring cash events.
              </Text>
            )}
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Gemma & Locale"
            subtitle="Connect Gemini API access and region defaults"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 16 }}>
            <TextInput
              mode="outlined"
              label="Gemini API key"
              placeholder="AIza..."
              value={geminiApiKey}
              secureTextEntry={!showApiKey}
              onChangeText={setGeminiApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              right={
                <TextInput.Icon
                  icon={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowApiKey((prev) => !prev)}
                />
              }
            />
            <HelperText type="info" visible>
              Stored locally and used only to call the Gemma model for insights.
            </HelperText>
            <SegmentedButtons
              value={gemmaModel}
              onValueChange={(value) => setGemmaModel(value)}
              buttons={modelOptions.map((option) => ({ label: option.label, value: option.value }))}
              density="regular"
            />
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Language
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {languageOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={language === option.code}
                  onPress={() => setLanguage(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      language === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Currency
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {currencyOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={currencyCode === option.code}
                  onPress={() => setCurrencyCode(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      currencyCode === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              Region
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {regionOptions.map((option) => (
                <Chip
                  key={option.code}
                  mode="outlined"
                  selected={region === option.code}
                  onPress={() => setRegion(option.code)}
                  selectedColor={theme.colors.onSecondaryContainer}
                  style={{
                    backgroundColor:
                      region === option.code ? theme.colors.secondaryContainer : theme.colors.surface,
                  }}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Security & advanced"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 12 }}>
            <List.Item
              title="Secure app access"
              description="Require a device lock or biometric check before opening."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={secureAccessEnabled} onValueChange={setSecureAccessEnabled} />}
              style={{ paddingHorizontal: 0 }}
            />
            <Divider />
            <List.Item
              title="Local passcode lock"
              description="Gate the app with a PIN stored only on-device."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={passcodeEnabled} onValueChange={(enabled) => {
                if (!enabled) {
                  setPasscodeEnabled(false);
                  setPasscodePin('');
                  setPasscodeDraft('');
                  setPasscodeConfirm('');
                } else {
                  if (passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm) {
                    setPasscodeEnabled(false);
                  } else {
                    setPasscodePin(passcodeDraft);
                    setPasscodeEnabled(true);
                    setPasscodeDraft('');
                    setPasscodeConfirm('');
                  }
                }
              }} />}
              style={{ paddingHorizontal: 0 }}
            />
            {passcodeEnabled ? (
              <HelperText type="info" visible style={{ marginLeft: 0 }}>
                Passcode required on next app open.
              </HelperText>
            ) : null}
            <TextInput
              mode="outlined"
              label="New passcode"
              value={passcodeDraft}
              onChangeText={setPasscodeDraft}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <TextInput
              mode="outlined"
              label="Confirm passcode"
              value={passcodeConfirm}
              onChangeText={setPasscodeConfirm}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={8}
            />
            <Button mode="contained" onPress={handleSavePasscode} disabled={passcodeDraft.length < 4 || passcodeDraft !== passcodeConfirm}>
              Save passcode
            </Button>
            <Divider />
            <List.Item
              title="Advanced Gemma summaries"
              description="Get deeper recommendations, trends, and next steps."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => (
                <Switch value={advancedSummariesEnabled} onValueChange={setAdvancedSummariesEnabled} />
              )}
              style={{ paddingHorizontal: 0 }}
            />
            <List.Item
              title="Include notes in CSV"
              description="Keep memo fields when exporting transactions."
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              right={() => <Switch value={includeNotesInExport} onValueChange={setIncludeNotesInExport} />}
              style={{ paddingHorizontal: 0 }}
            />
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Category management"
            titleVariant="titleLarge"
            titleStyle={{ color: theme.colors.onSurface }}
          />
          <Card.Content style={{ gap: 14 }}>
            <TextInput
              mode="outlined"
              label="Category name (max 14)"
              value={categoryName}
              onChangeText={setCategoryName}
              maxLength={14}
              placeholder="Snacks, Gym, Pets..."
            />
            <TextInput
              mode="outlined"
              label="Emoji"
              value={categoryEmoji}
              onChangeText={setCategoryEmoji}
              maxLength={2}
              placeholder="🧩"
            />
            <Button
              mode="contained"
              onPress={async () => {
                addCustomCategory({ name: categoryName, emoji: categoryEmoji });
                setCategoryName('');
                setCategoryEmoji('🧩');
                await Haptics.selectionAsync();
              }}
            >
              Create category
            </Button>
            <Divider />
            <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Expense categories
            </Text>
            {categories
              .filter((item) => item.kind === 'expense')
              .map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                  }}
                >
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    {item.emoji} {item.name}
                  </Text>
                  {!item.isLocked ? (
                    <IconButton icon="delete-outline" onPress={() => deleteCategory(item.id)} />
                  ) : (
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      locked
                    </Text>
                  )}
                </View>
              ))}
          </Card.Content>
        </Card>

        <Card
          mode="elevated"
          style={{ backgroundColor: theme.colors.surfaceContainer }}
          contentStyle={{ paddingVertical: 12, gap: 12 }}
        >
          <Card.Title
            title="Data export"
            subtitle="Generate a CSV preview without leaving the device"
            titleVariant="titleLarge"
            subtitleVariant="bodyMedium"
            titleStyle={{ color: theme.colors.onSurface }}
            subtitleStyle={{ color: theme.colors.onSurfaceVariant }}
          />
          <Card.Content style={{ gap: 14 }}>
            <Button
              mode="outlined"
              onPress={async () => {
                setExportPreview(exportRows);
                await Haptics.selectionAsync();
              }}
            >
              Generate local CSV preview
            </Button>
            {exportPreview ? (
              <View
                style={{
                  backgroundColor: theme.colors.surfaceVariant,
                  borderRadius: 12,
                  padding: 12,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                }}
              >
                <Text variant="bodySmall" selectable style={{ color: theme.colors.onSurface }}>
                  {exportPreview}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Preview stays on-device. Use export after choosing your locale, currency, and region.
              </Text>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={theme.colors.errorContainer}
          textColor={theme.colors.onErrorContainer}
          onPress={async () => {
            clearAllData();
            resetSettings();
            setExportPreview('');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }}
        >
          Reset all local wallet data
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
