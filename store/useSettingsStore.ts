import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { CurrencyCode, LanguageCode, RegionCode, ThemePreference } from '../types/finance';
import {
  defaultSettingsState,
  migrateSettingsState,
  type AiProvider,
} from './settingsMigration';

export type { AiProvider } from './settingsMigration';

export type SettingsState = {
  themePreference: ThemePreference;
  oledTrueBlackEnabled: boolean;
  highContrastEnabled: boolean;
  themePrimary: string;
  themeSecondary: string;
  secureAccessEnabled: boolean;
  passcodeEnabled: boolean;
  passcodePin: string;
  currencyCode: CurrencyCode;
  language: LanguageCode;
  region: RegionCode;
  aiProvider: AiProvider;
  geminiApiKey: string;
  huggingFaceToken: string;
  gemmaModel: string; // Used for cloud
  localModelId: string; // LiteRT model selection
  localModelDownloaded: boolean; // Indicates if local model is downloaded
  smartCategorizationEnabled: boolean;
  advancedSummariesEnabled: boolean;
  includeNotesInExport: boolean;
  setupCoachDismissed: boolean;
  backupConfigured: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setOledTrueBlackEnabled: (enabled: boolean) => void;
  setHighContrastEnabled: (enabled: boolean) => void;
  setThemePrimary: (color: string) => void;
  setThemeSecondary: (color: string) => void;
  setSecureAccessEnabled: (enabled: boolean) => void;
  setPasscodeEnabled: (enabled: boolean) => void;
  setPasscodePin: (pin: string) => void;
  setCurrencyCode: (code: CurrencyCode) => void;
  setLanguage: (language: LanguageCode) => void;
  setRegion: (region: RegionCode) => void;
  setAiProvider: (provider: AiProvider) => void;
  setGeminiApiKey: (key: string) => void;
  setHuggingFaceToken: (token: string) => void;
  setGemmaModel: (model: string) => void;
  setLocalModelId: (modelId: string) => void;
  setLocalModelDownloaded: (downloaded: boolean) => void;
  setSmartCategorizationEnabled: (enabled: boolean) => void;
  setAdvancedSummariesEnabled: (enabled: boolean) => void;
  setIncludeNotesInExport: (enabled: boolean) => void;
  setSetupCoachDismissed: (dismissed: boolean) => void;
  setBackupConfigured: (configured: boolean) => void;
  hydrateFromBackup: (incoming: Partial<SettingsState>) => void;
  resetSettings: () => void;
};

const defaultState = defaultSettingsState;

const SECURE_KEYS = {
  geminiApiKey: 'gemwallet-settings-geminiApiKey',
  huggingFaceToken: 'gemwallet-settings-huggingFaceToken',
  passcodePin: 'gemwallet-settings-passcodePin',
};

const secureSettingsStorage: StateStorage = {
  getItem: async (name) => {
    const base = await AsyncStorage.getItem(name);
    if (!base) return base;

    try {
      const parsed = JSON.parse(base) as { state?: Record<string, unknown> };
      const persistedState = parsed.state ?? {};
      const [secureGeminiApiKey, secureHuggingFaceToken, securePasscodePin] = await Promise.all([
        SecureStore.getItemAsync(SECURE_KEYS.geminiApiKey),
        SecureStore.getItemAsync(SECURE_KEYS.huggingFaceToken),
        SecureStore.getItemAsync(SECURE_KEYS.passcodePin),
      ]);

      const fallbackGemini = persistedState.geminiApiKey ?? defaultState.geminiApiKey;
      const fallbackHugging = persistedState.huggingFaceToken ?? defaultState.huggingFaceToken;
      const fallbackPasscode = persistedState.passcodePin ?? defaultState.passcodePin;

      const geminiApiKey = secureGeminiApiKey ?? (fallbackGemini as string);
      const huggingFaceToken = secureHuggingFaceToken ?? (fallbackHugging as string);
      const passcodePin = securePasscodePin ?? (fallbackPasscode as string);

      const { geminiApiKey: _g, huggingFaceToken: _h, passcodePin: _p, ...restState } =
        persistedState;

      const sanitizedForStorage = JSON.stringify({
        ...parsed,
        state: restState,
      });

      await Promise.all([
        AsyncStorage.setItem(name, sanitizedForStorage),
        SecureStore.setItemAsync(SECURE_KEYS.geminiApiKey, geminiApiKey ?? ''),
        SecureStore.setItemAsync(SECURE_KEYS.huggingFaceToken, huggingFaceToken ?? ''),
        SecureStore.setItemAsync(SECURE_KEYS.passcodePin, passcodePin ?? ''),
      ]);

      return JSON.stringify({
        ...parsed,
        state: {
          ...restState,
          geminiApiKey,
          huggingFaceToken,
          passcodePin,
        },
      });
    } catch {
      return base;
    }
  },
  setItem: async (name, value) => {
    try {
      const parsed = JSON.parse(value) as { state?: Record<string, unknown> };
      const { state: persistedState = {}, ...rest } = parsed;
      const {
        geminiApiKey = defaultState.geminiApiKey,
        huggingFaceToken = defaultState.huggingFaceToken,
        passcodePin = defaultState.passcodePin,
        ...restState
      } = persistedState;

      await Promise.all([
        AsyncStorage.setItem(
          name,
          JSON.stringify({
            ...rest,
            state: restState,
          })
        ),
        SecureStore.setItemAsync(SECURE_KEYS.geminiApiKey, (geminiApiKey as string) ?? ''),
        SecureStore.setItemAsync(
          SECURE_KEYS.huggingFaceToken,
          (huggingFaceToken as string) ?? ''
        ),
        SecureStore.setItemAsync(SECURE_KEYS.passcodePin, (passcodePin as string) ?? ''),
      ]);
    } catch {
      await AsyncStorage.setItem(name, value);
    }
  },
  removeItem: async (name) => {
    await Promise.all([
      AsyncStorage.removeItem(name),
      SecureStore.deleteItemAsync(SECURE_KEYS.geminiApiKey),
      SecureStore.deleteItemAsync(SECURE_KEYS.huggingFaceToken),
      SecureStore.deleteItemAsync(SECURE_KEYS.passcodePin),
    ]);
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,
      setThemePreference: (themePreference) => set({ themePreference }),
      setOledTrueBlackEnabled: (oledTrueBlackEnabled) => set({ oledTrueBlackEnabled }),
      setHighContrastEnabled: (highContrastEnabled) => set({ highContrastEnabled }),
      setThemePrimary: (themePrimary) => set({ themePrimary: themePrimary.trim() }),
      setThemeSecondary: (themeSecondary) => set({ themeSecondary: themeSecondary.trim() }),
      setSecureAccessEnabled: (secureAccessEnabled) => set({ secureAccessEnabled }),
      setPasscodeEnabled: (passcodeEnabled) => set({ passcodeEnabled }),
      setPasscodePin: (passcodePin) => set({ passcodePin }),
      setCurrencyCode: (currencyCode) => set({ currencyCode }),
      setLanguage: (language) => set({ language }),
      setRegion: (region) => set({ region }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey: geminiApiKey.trim() }),
      setHuggingFaceToken: (huggingFaceToken) => set({ huggingFaceToken: huggingFaceToken.trim() }),
      setGemmaModel: (gemmaModel) => set({ gemmaModel }),
      setLocalModelId: (localModelId) => set({ localModelId }),
      setLocalModelDownloaded: (localModelDownloaded) => set({ localModelDownloaded }),
      setSmartCategorizationEnabled: (smartCategorizationEnabled) => set({ smartCategorizationEnabled }),
      setAdvancedSummariesEnabled: (advancedSummariesEnabled) => set({ advancedSummariesEnabled }),
      setIncludeNotesInExport: (includeNotesInExport) => set({ includeNotesInExport }),
      setSetupCoachDismissed: (setupCoachDismissed) => set({ setupCoachDismissed }),
      setBackupConfigured: (backupConfigured) => set({ backupConfigured }),
      hydrateFromBackup: (incoming) =>
        set(() => ({
          ...defaultState,
          ...incoming,
        })),
      resetSettings: () => {
        void Promise.all([
          SecureStore.deleteItemAsync(SECURE_KEYS.geminiApiKey),
          SecureStore.deleteItemAsync(SECURE_KEYS.huggingFaceToken),
          SecureStore.deleteItemAsync(SECURE_KEYS.passcodePin),
        ]);
        set(defaultState);
      },
    }),
    {
      name: 'gemwallet-settings-v5',
      storage: createJSONStorage(() => secureSettingsStorage),
      version: 5,
      migrate: (persistedState: unknown, _version: number) => migrateSettingsState(persistedState),
    }
  )
);
