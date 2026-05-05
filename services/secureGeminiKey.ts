import * as SecureStore from 'expo-secure-store';

const GEMINI_KEY_NAME = 'gemini_api_key';

export async function getGeminiApiKey(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(GEMINI_KEY_NAME);
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export async function setGeminiApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await deleteGeminiApiKey();
    return;
  }

  await SecureStore.setItemAsync(GEMINI_KEY_NAME, trimmed);
}

export async function deleteGeminiApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(GEMINI_KEY_NAME);
}

