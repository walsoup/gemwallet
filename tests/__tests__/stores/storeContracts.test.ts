import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = process.cwd();

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('store contracts', () => {
  it('transaction store defines expected state, actions, and persistence key', () => {
    const src = read('store/useTransactionStore.ts');
    assert.match(src, /transactions:\s*\[\]/);
    assert.match(src, /categories:\s*DEFAULT_CATEGORIES/);
    assert.match(src, /completeOnboarding/);
    assert.match(src, /addExpense/);
    assert.match(src, /addIncome/);
    assert.match(src, /clearAllData/);
    assert.match(src, /name:\s*'gemwallet-transactions-v2'/);
  });

  it('goals store defines expected state, actions, and persistence key', () => {
    const src = read('store/useGoalsStore.ts');
    assert.match(src, /goals:\s*\[\]/);
    assert.match(src, /goalsEnabled:\s*false/);
    assert.match(src, /addGoal/);
    assert.match(src, /contributeToGoal/);
    assert.match(src, /toggleGoal/);
    assert.match(src, /deleteGoal/);
    assert.match(src, /clearAllData/);
    assert.match(src, /name:\s*'gemwallet-goals-v1'/);
  });

  it('recurring store defines expected state, actions, and persistence key', () => {
    const src = read('store/useRecurringStore.ts');
    assert.match(src, /events:\s*\[\]/);
    assert.match(src, /recurringEnabled:\s*false/);
    assert.match(src, /addEvent/);
    assert.match(src, /toggleEvent/);
    assert.match(src, /applyDueEvents/);
    assert.match(src, /runEventNow/);
    assert.match(src, /clearAllData/);
    assert.match(src, /name:\s*'gemwallet-recurring-v1'/);
  });

  it('settings store defines expected preferences, toggles, and persistence key', () => {
    const src = read('store/useSettingsStore.ts');
    assert.match(src, /themePreference/);
    assert.match(src, /setThemePreference/);
    assert.match(src, /setThemePrimary/);
    assert.match(src, /setThemeSecondary/);
    assert.match(src, /setCurrencyCode/);
    assert.match(src, /setRegion/);
    assert.match(src, /setBiometricAuthEnabled/);
    assert.match(src, /setNotificationsTransactionAlerts/);
    assert.match(src, /setNotificationsWeeklySummary/);
    assert.match(src, /setNotificationsSavingsGoalProgress/);
    assert.match(src, /setNotificationsBudgetWarnings/);
    assert.match(src, /setAiProvider/);
    assert.match(src, /setAiFeaturesEnabled/);
    assert.match(src, /name:\s*'gemwallet-settings-v5'/);
  });
});