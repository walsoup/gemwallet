import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';

const root = '/home/runner/work/gemwallet/gemwallet';

const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');

describe('API key storage security contracts', () => {
  it('secureGeminiKey exclusively uses expo-secure-store APIs', () => {
    const src = read('services/secureGeminiKey.ts');
    assert.match(src, /expo-secure-store/);
    assert.match(src, /SecureStore\.getItemAsync/);
    assert.match(src, /SecureStore\.setItemAsync/);
    assert.match(src, /SecureStore\.deleteItemAsync/);
    assert.doesNotMatch(src, /AsyncStorage/);
  });

  it('settings store does not persist a gemini API key field', () => {
    const src = read('store/useSettingsStore.ts');
    assert.doesNotMatch(src, /geminiApiKey/);
    assert.doesNotMatch(src, /gemini_api_key/);
  });

  it('settings screen test-connection reads key from secure store at runtime', () => {
    const src = read('src/features/settings/screens/SettingsScreen.tsx');
    assert.match(src, /const key = await getGeminiApiKey\(\)/);
    assert.match(src, /new GoogleGenerativeAI\(key\)/);
  });
});
