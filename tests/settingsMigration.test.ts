import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { defaultSettingsState, migrateSettingsState } from '../store/settingsMigration';

describe('settings migration', () => {
  it('returns defaults for missing persisted state', () => {
    const result = migrateSettingsState(undefined);

    assert.deepEqual(result, defaultSettingsState);
  });

  it('keeps persisted values and backfills newly-added fields', () => {
    const legacy = {
      themePreference: 'light',
      currencyCode: 'EUR',
      language: 'fr-FR',
      region: 'FR',
      advancedSummariesEnabled: true,
    };

    const result = migrateSettingsState(legacy);

    assert.equal(result.themePreference, 'light');
    assert.equal(result.currencyCode, 'EUR');
    assert.equal(result.language, 'fr-FR');
    assert.equal(result.region, 'FR');
    assert.equal(result.advancedSummariesEnabled, true);
    assert.equal(result.aiProvider, 'google');
    assert.equal(result.huggingFaceToken, '');
    assert.equal(result.localModelId, defaultSettingsState.localModelId);
    assert.equal(result.localModelDownloaded, false);
    assert.equal(result.smartCategorizationEnabled, true);
  });

  it('preserves modern AI fields when present', () => {
    const modern = {
      aiProvider: 'huggingface',
      huggingFaceToken: 'hf_test',
      gemmaModel: 'google/gemma-2-2b-it',
      localModelId: 'gemma-4-e2b-it',
      localModelDownloaded: true,
      smartCategorizationEnabled: false,
    };

    const result = migrateSettingsState(modern);

    assert.equal(result.aiProvider, 'huggingface');
    assert.equal(result.huggingFaceToken, 'hf_test');
    assert.equal(result.gemmaModel, 'google/gemma-2-2b-it');
    assert.equal(result.localModelId, 'gemma-4-e2b-it');
    assert.equal(result.localModelDownloaded, true);
    assert.equal(result.smartCategorizationEnabled, false);
  });

  it('maps legacy local AI provider to google', () => {
    const legacyLocal = {
      aiProvider: 'local',
    };

    const result = migrateSettingsState(legacyLocal);

    assert.equal(result.aiProvider, 'google');
  });
});
