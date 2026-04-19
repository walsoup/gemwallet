import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { decryptBackup, encryptBackup } from '../utils/backup';

describe('backup encryption', () => {
  it('round-trips payload with correct passphrase', () => {
    const payload = {
      transactions: [{ id: '1', amountCents: 1250, type: 'expense' }],
      settings: { currencyCode: 'USD' },
    };

    const encoded = encryptBackup(payload, 's3cret-passphrase');
    const decoded = decryptBackup<typeof payload>(encoded, 's3cret-passphrase');

    assert.deepEqual(decoded, payload);
  });

  it('throws with incorrect passphrase', () => {
    const encoded = encryptBackup({ hello: 'world' }, 'correct-passphrase');

    assert.throws(() => {
      decryptBackup(encoded, 'wrong-passphrase');
    }, /Invalid passphrase|Unexpected end of JSON input/);
  });
});
