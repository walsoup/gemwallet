import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = '/home/runner/work/gemwallet/gemwallet';

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('major flow smoke contracts', () => {
  it('onboarding completion routes to home and writes onboarding state', () => {
    const src = read('src/features/onboarding/screens/OnboardingScreen.tsx');
    assert.match(src, /completeOnboarding\(/);
    assert.match(src, /router\.replace\('\/'\)/);
  });

  it('add expense flow exists and transaction list renders in home', () => {
    const src = read('src/features/home/screens/HomeScreen.tsx');
    assert.match(src, /openQuickAction\('expense'\)/);
    assert.match(src, /addExpense\(/);
    assert.match(src, /filteredTransactions\.slice\(0, 10\)\.map/);
  });

  it('recurring scheduler runs from root layout', () => {
    const src = read('app/_layout.tsx');
    assert.match(src, /const interval = setInterval\(apply, 60_000\)/);
    assert.match(src, /applyDueEvents\(Date\.now\(\),/);
  });

  it('chat tab is gated by aiFeaturesEnabled and chat send wiring exists', () => {
    const layout = read('app/_layout.tsx');
    const chat = read('src/features/chat/screens/ChatScreen.tsx');
    assert.match(layout, /href: aiFeaturesEnabled \? '\/chat' : null/);
    assert.match(chat, /onPress=\{onSend\}/);
    assert.match(chat, /for await \(const chunk of runner\(/);
  });
});
