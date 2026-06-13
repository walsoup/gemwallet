import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { exportTransactionsCsv } from '../../../utils/exportTransactionsCsv';

describe('exportTransactionsCsv', () => {
  const categories = [
    { id: 'expense-food', name: 'Food', emoji: '🍔', kind: 'expense' as const },
    { id: 'income-custom', name: 'Custom', emoji: '✏️', kind: 'income' as const },
  ];

  it('exports header and rows including notes when requested', () => {
    const csv = exportTransactionsCsv({
      includeNotes: true,
      categories,
      transactions: [
        {
          id: 'tx-2',
          timestamp: Date.parse('2026-01-02T00:00:00Z'),
          type: 'expense',
          amountCents: 2500,
          categoryId: 'expense-food',
          note: 'Lunch',
        },
      ],
    });

    assert.match(csv, /id,timestamp,type,amountCents,categoryId,categoryName,note/);
    assert.match(csv, /expense-food,Food,Lunch/);
  });

  it('escapes commas and quotes in note fields', () => {
    const csv = exportTransactionsCsv({
      includeNotes: true,
      categories,
      transactions: [
        {
          id: 'tx-1',
          timestamp: Date.parse('2026-01-01T00:00:00Z'),
          type: 'income',
          amountCents: 10000,
          categoryId: 'income-custom',
          note: 'He said "ok", paid back',
        },
      ],
    });

    assert.match(csv, /"He said ""ok"", paid back"/);
  });

  it('omits note column when includeNotes is false', () => {
    const csv = exportTransactionsCsv({
      includeNotes: false,
      categories,
      transactions: [
        {
          id: 'tx-1',
          timestamp: Date.parse('2026-01-01T00:00:00Z'),
          type: 'income',
          amountCents: 10000,
          categoryId: 'income-custom',
          note: 'Ignore me',
        },
      ],
    });

    assert.doesNotMatch(csv, /,note/);
    assert.doesNotMatch(csv, /Ignore me/);
  });
});