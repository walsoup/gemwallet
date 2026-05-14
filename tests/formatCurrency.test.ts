import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatCurrency } from '../utils/formatCurrency';

describe('formatCurrency', () => {
  it('formats cents with locale-aware currency symbol', () => {
    const output = formatCurrency(12345, { currencyCode: 'USD', locale: 'en-US' });

    assert.equal(output, '$123.45');
  });

  it('falls back when Intl formatter throws', () => {
    const original = Intl.NumberFormat;

    (Intl as unknown as { NumberFormat: typeof Intl.NumberFormat }).NumberFormat = class {
      constructor() {
        throw new Error('boom');
      }
    } as unknown as typeof Intl.NumberFormat;

    try {
      const output = formatCurrency(999, { currencyCode: 'USD', locale: 'en-US' });
      assert.equal(output, 'USD 9.99');
    } finally {
      (Intl as unknown as { NumberFormat: typeof Intl.NumberFormat }).NumberFormat = original;
    }
  });
});
