import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  parseAddExpenseCommand,
  streamFinancialAnalysis,
  generatePersonalGreeting,
} from '../src/features/nlp/services/gemmaAnalysis';

describe('gemmaAnalysis service', () => {
  it('parses ADD_EXPENSE command with cents and note', () => {
    const parsed = parseAddExpenseCommand('ADD_EXPENSE: 12.34 food lunch burrito');

    assert.deepEqual(parsed, {
      amountCents: 1234,
      categoryHint: 'food',
      note: 'lunch burrito',
    });
  });

  it('returns null when command is not present', () => {
    const parsed = parseAddExpenseCommand('Show me spending trends');

    assert.equal(parsed, null);
  });

  it('falls back for google provider when no API key exists', async () => {
    const chunks: string[] = [];

    for await (const chunk of streamFinancialAnalysis(
      [],
      {
        aiProvider: 'google',
        currencyCode: 'USD',
        locale: 'en-US',
        region: 'US',
      }
    )) {
      chunks.push(chunk);
    }

    const output = chunks.join('');
    assert.match(output, /Add your Gemini API key/i);
    assert.match(output, /No transactions yet/i);
  });

  it('returns null greeting when local provider is selected but model is not downloaded', async () => {
    const greeting = await generatePersonalGreeting([], {
      aiProvider: 'local',
      localModelDownloaded: false,
      currencyCode: 'USD',
      locale: 'en-US',
      region: 'US',
    });

    assert.equal(greeting, null);
  });
});
