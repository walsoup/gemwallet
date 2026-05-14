import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = '/home/runner/work/gemwallet/gemwallet';

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('recurring wiring contracts', () => {
  it('layout invokes applyDueEvents and posts ledger entries', () => {
    const src = read('app/_layout.tsx');
    assert.match(src, /applyDueEvents\(Date\.now\(\),/);
    assert.match(src, /if \(event\.type === 'income'\)/);
    assert.match(src, /addIncome\(/);
    assert.match(src, /addExpense\(/);
  });

  it('recurring store advances nextRun after applying due events', () => {
    const src = read('store/useRecurringStore.ts');
    assert.match(src, /if \(!state\.recurringEnabled \|\| !event\.enabled \|\| event\.nextRun > now\)/);
    assert.match(src, /apply\(event\)/);
    assert.match(src, /nextRun: addInterval\(event\.nextRun, event\.interval\)/);
  });
});
