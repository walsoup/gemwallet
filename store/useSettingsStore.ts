import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
  aiFeaturesEnabled: boolean;
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
  setAiFeaturesEnabled: (enabled: boolean) => void;
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
      setAiFeaturesEnabled: (aiFeaturesEnabled) => set({ aiFeaturesEnabled }),
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
      resetSettings: () => set(defaultState),
    }),
    {
      name: 'gemwallet-settings-v5',
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
      migrate: (persistedState: unknown, _version: number) => migrateSettingsState(persistedState),
    }
  )
);
