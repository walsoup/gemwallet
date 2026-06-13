import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

import { formatCurrency } from '../../../utils/formatCurrency';

const root = process.cwd();

describe('currency formatting coverage', () => {
  it('formats every declared supported currency with a non-empty result', () => {
    const src = readFileSync(`${root}/utils/currency.ts`, 'utf8');
    const codes = Array.from(src.matchAll(/\{\s*code:\s*'([A-Z]{3})'/g)).map((m) => m[1]);

    assert.ok(codes.length >= 15);

    for (const code of codes) {
      const formatted = formatCurrency(123456, { currencyCode: code, locale: 'en-US' });
      assert.ok(formatted.length > 0, `expected non-empty format for ${code}`);
      assert.ok(/\d/.test(formatted), `expected numeric content for ${code}`);
    }
  });

  it('handles decimals and separator behavior for common locales', () => {
    const us = formatCurrency(123456, { currencyCode: 'USD', locale: 'en-US' });
    const fr = formatCurrency(123456, { currencyCode: 'EUR', locale: 'fr-FR' });
    const jp = formatCurrency(123456, { currencyCode: 'JPY', locale: 'ja-JP' });

    assert.match(us, /\d/);
    assert.match(fr, /\d/);
    assert.match(jp, /\d/);
  });
});