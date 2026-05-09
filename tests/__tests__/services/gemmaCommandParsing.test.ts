import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseAddExpenseCommand,
  parseAddIncomeCommand,
  parseAddRecurringCommand,
  parseAddGoalCommand,
} from '../../../src/features/nlp/services/gemmaAnalysis';

describe('gemma command parsing', () => {
  it('parses ADD_EXPENSE command', () => {
    assert.deepEqual(parseAddExpenseCommand('ADD_EXPENSE: 19.99 food lunch'), {
      amountCents: 1999,
      categoryHint: 'food',
      note: 'lunch',
    });
  });

  it('parses ADD_INCOME command', () => {
    assert.deepEqual(parseAddIncomeCommand('ADD_INCOME: 2000 salary may paycheck'), {
      amountCents: 200000,
      categoryHint: 'salary',
      note: 'may paycheck',
    });
  });

  it('parses ADD_RECURRING command with optional fields', () => {
    const parsed = parseAddRecurringCommand('ADD_RECURRING: Rent 1200 expense monthly housing 2026-07-01');
    assert.ok(parsed);
    assert.equal(parsed?.name, 'Rent');
    assert.equal(parsed?.amountCents, 120000);
    assert.equal(parsed?.type, 'expense');
    assert.equal(parsed?.interval, 'monthly');
    assert.equal(parsed?.categoryHint, 'housing');
    assert.equal(typeof parsed?.startDate, 'number');
  });

  it('parses ADD_GOAL command', () => {
    const parsed = parseAddGoalCommand('ADD_GOAL: EmergencyFund 5000 2027-01-01');
    assert.ok(parsed);
    assert.equal(parsed?.name, 'EmergencyFund');
    assert.equal(parsed?.targetCents, 500000);
    assert.equal(typeof parsed?.dueDate, 'number');
  });

  it('returns null for malformed or non-positive command amounts', () => {
    assert.equal(parseAddExpenseCommand('ADD_EXPENSE: 0 food nope'), null);
    assert.equal(parseAddIncomeCommand('ADD_INCOME: -4 salary nope'), null);
    assert.equal(parseAddRecurringCommand('ADD_RECURRING: Rent 0 expense monthly'), null);
    assert.equal(parseAddGoalCommand('ADD_GOAL: Trip 0'), null);
    assert.equal(parseAddExpenseCommand('hello world'), null);
  });
});
