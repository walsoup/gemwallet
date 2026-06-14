import * as SecureStore from 'expo-secure-store';

const HF_TOKEN_NAME = 'hugging_face_token';

export async function getHuggingFaceToken(): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(HF_TOKEN_NAME);
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

export async function setHuggingFaceToken(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) {
    await deleteHuggingFaceToken();
    return;
  }

  await SecureStore.setItemAsync(HF_TOKEN_NAME, trimmed);
}

export async function deleteHuggingFaceToken(): Promise<void> {
  await SecureStore.deleteItemAsync(HF_TOKEN_NAME);
}
