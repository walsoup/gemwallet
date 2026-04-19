import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateId } from '../utils/generateId';

describe('generateId', () => {
  it('returns a non-empty id', () => {
    const id = generateId();

    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
  });

  it('returns different values across calls', () => {
    const first = generateId();
    const second = generateId();

    assert.notEqual(first, second);
  });
});
