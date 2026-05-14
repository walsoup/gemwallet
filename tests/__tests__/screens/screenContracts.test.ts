import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = '/home/runner/work/gemwallet/gemwallet';

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('screen wiring contracts', () => {
  it('home quick actions call addIncome/addExpense and render transaction list from store', () => {
    const src = read('src/features/home/screens/HomeScreen.tsx');
    assert.match(src, /addIncome\(\{ amountCents, categoryId: 'income-custom', note \}\)/);
    assert.match(src, /addExpense\(\{ amountCents, categoryId: 'expense-misc', note \}\)/);
    assert.match(src, /filteredTransactions\.slice\(0, 10\)\.map/);
  });

  it('planning goal creation and recurring toggle are wired to stores', () => {
    const src = read('src/features/planning/screens/PlanningScreen.tsx');
    assert.match(src, /addGoal\(\{ name: goalName\.trim\(\), targetCents: Math\.round\(parsed \* 100\) \}\)/);
    assert.match(src, /toggleEvent\(id, !currentEnabled\)/);
  });

  it('analytics computes savings from transaction store data', () => {
    const src = read('src/features/analytics/screens/AnalyticsScreen.tsx');
    assert.match(src, /transactions\.forEach\(tx =>/);
    assert.match(src, /savedPercentage = totalIncome > 0 \? \(\(savedCents \/ totalIncome\) \* 100\)\.toFixed\(1\) : '0\.0'/);
  });

  it('chat uses provider-aware runner, command callbacks, and inline provider errors', () => {
    const src = read('src/features/chat/screens/ChatScreen.tsx');
    assert.match(src, /const runner = settings\.aiProvider === 'local'\s*\? streamLocalFinancialAnalysis\s*:\s*streamGeminiFinancialAnalysis/);
    assert.match(src, /onCommand:/);
    assert.match(src, /onIncome:/);
    assert.match(src, /onRecurring:/);
    assert.match(src, /onGoal:/);
    assert.match(src, /Cloud API is selected but no Gemini key is saved\./);
    assert.match(src, /Local model is not downloaded yet\./);
    assert.match(src, /System •/);
  });

  it('settings includes theme/currency/export/clear/sync wiring and dynamic app version', () => {
    const src = read('src/features/settings/screens/SettingsScreen.tsx');
    assert.match(src, /setThemePreference\(/);
    assert.match(src, /router\.push\('\/settings\/currency'\)/);
    assert.match(src, /exportTransactionsCsv\(/);
    assert.match(src, /Sharing\.shareAsync\(/);
    assert.match(src, /clearAllTransactions\(\)/);
    assert.match(src, /clearAllGoals\(\)/);
    assert.match(src, /clearAllRecurring\(\)/);
    assert.match(src, /Cloud Sync \(needs infrastructure\)/);
    assert.match(src, /appConfig\.expo\.version/);
  });

  it('change passcode flow verifies current, requires confirm match, and stores new pin', () => {
    const src = read('src/features/security/screens/ChangePasscodeScreen.tsx');
    assert.match(src, /if \(step === 'verify'\)/);
    assert.match(src, /Incorrect passcode\. Try again\./);
    assert.match(src, /if \(step === 'confirm'\)/);
    assert.match(src, /Passcodes did not match\. Start over\./);
    assert.match(src, /setPasscodePin\(next\)/);
  });
});
