import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'path';

const root = process.cwd();

const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('screen wiring contracts', () => {
  it('home quick actions open AddTransactionModal and render filtered transactions from store', () => {
    const src = read('src/features/home/screens/HomeScreen.tsx');
    assert.match(src, /openQuickAction\('income'\)/);
    assert.match(src, /openQuickAction\('expense'\)/);
    assert.match(src, /<AddTransactionModal/);
    assert.match(src, /filteredTransactions/);
  });

  it('planning goal creation and recurring toggle are wired to stores', () => {
    const src = read('src/features/planning/screens/PlanningScreen.tsx');
    assert.match(src, /addGoal\(\{ name: goalName\.trim\(\), targetCents: Math\.round\(parsed \* 100\) \}\)/);
    assert.match(src, /toggleEvent\(id, !currentEnabled\)/);
  });

  it('analytics computes savings from transaction store data', () => {
    const src = read('src/features/analytics/screens/AnalyticsScreen.tsx');
    assert.match(src, /savedPercentage =\s*totalIncome > 0 \? \(\(savedCents \/ totalIncome\) \* 100\)\.toFixed\(1\) : ["']0\.0["']/);
  });

  it('chat uses provider-aware runner, command callbacks, and inline provider errors', () => {
    const src = read('src/features/chat/screens/ChatScreen.tsx');
    assert.match(src, /const runner = streamFinancialAnalysis/);
    assert.match(src, /onCommand:/);
    assert.match(src, /onIncome:/);
    assert.match(src, /onRecurring:/);
    assert.match(src, /onGoal:/);
    assert.match(src, /No Gemini key saved\./);
    assert.match(src, /Local model is not downloaded yet\./);
    assert.match(src, /pushSystemMessage/);
  });

  it('settings includes theme/currency/export/clear/sync wiring and dynamic app version', () => {
    const appearance = read('src/features/settings/components/AppearanceSection.tsx');
    const currency = read('src/features/settings/components/CurrencyRegionSection.tsx');
    const localData = read('src/features/settings/components/LocalDataSection.tsx');
    const about = read('src/features/settings/components/AboutSection.tsx');

    assert.match(appearance, /setThemePreference\(/);
    assert.match(currency, /router\.push\('\/settings\/currency'\)/);
    assert.match(localData, /exportTransactionsCsv\(/);
    assert.match(localData, /Sharing\.shareAsync\(/);
    assert.match(localData, /clearAllTransactions\(/);
    assert.match(localData, /clearAllGoals\(/);
    assert.match(localData, /clearAllRecurring\(/);
    assert.match(about, /appConfig\?\.expo\?\.version|appConfig\.expo\.version/);
  });

  it('change passcode flow verifies current, requires confirm match, and stores new pin', () => {
    const src = read('src/features/security/screens/ChangePasscodeScreen.tsx');
    assert.match(src, /if \(step === 'verify'\)/);
    assert.match(src, /Incorrect passcode\. Try again\./);
    assert.match(src, /if \(step === 'confirm'\)/);
    assert.match(src, /Passcodes did not match\. Start over\./);
    assert.match(src, /setPasscodePin\(SHA256\(next\)\.toString\(\)\)/);
  });
});
