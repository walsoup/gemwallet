import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CurrencyCode, LanguageCode, RegionCode, ThemePreference } from '../types/finance';

export type SettingsState = {
  themePreference: ThemePreference;
  oledTrueBlackEnabled: boolean;
  highContrastEnabled: boolean;
  secureAccessEnabled: boolean;
  passcodeEnabled: boolean;
  passcodePin: string;
  currencyCode: CurrencyCode;
  language: LanguageCode;
  region: RegionCode;
  geminiApiKey: string;
  gemmaModel: string;
  advancedSummariesEnabled: boolean;
  includeNotesInExport: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setOledTrueBlackEnabled: (enabled: boolean) => void;
  setHighContrastEnabled: (enabled: boolean) => void;
  setSecureAccessEnabled: (enabled: boolean) => void;
  setPasscodeEnabled: (enabled: boolean) => void;
  setPasscodePin: (pin: string) => void;
  setCurrencyCode: (code: CurrencyCode) => void;
  setLanguage: (language: LanguageCode) => void;
  setRegion: (region: RegionCode) => void;
  setGeminiApiKey: (key: string) => void;
  setGemmaModel: (model: string) => void;
  setAdvancedSummariesEnabled: (enabled: boolean) => void;
  setIncludeNotesInExport: (enabled: boolean) => void;
  hydrateFromBackup: (incoming: Partial<SettingsState>) => void;
  resetSettings: () => void;
};

const defaultState = {
  themePreference: 'system' as ThemePreference,
  oledTrueBlackEnabled: false,
  highContrastEnabled: false,
  secureAccessEnabled: false,
  passcodeEnabled: false,
  passcodePin: '',
  currencyCode: 'USD' as CurrencyCode,
  language: 'en-US' as LanguageCode,
  region: 'US' as RegionCode,
  geminiApiKey: '',
  gemmaModel: 'gemma-4-31b-it',
  advancedSummariesEnabled: false,
  includeNotesInExport: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,
      setThemePreference: (themePreference) => set({ themePreference }),
      setOledTrueBlackEnabled: (oledTrueBlackEnabled) => set({ oledTrueBlackEnabled }),
      setHighContrastEnabled: (highContrastEnabled) => set({ highContrastEnabled }),
      setSecureAccessEnabled: (secureAccessEnabled) => set({ secureAccessEnabled }),
      setPasscodeEnabled: (passcodeEnabled) => set({ passcodeEnabled }),
      setPasscodePin: (passcodePin) => set({ passcodePin }),
      setCurrencyCode: (currencyCode) => set({ currencyCode }),
      setLanguage: (language) => set({ language }),
      setRegion: (region) => set({ region }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey: geminiApiKey.trim() }),
      setGemmaModel: (gemmaModel) => set({ gemmaModel }),
      setAdvancedSummariesEnabled: (advancedSummariesEnabled) => set({ advancedSummariesEnabled }),
      setIncludeNotesInExport: (includeNotesInExport) => set({ includeNotesInExport }),
      hydrateFromBackup: (incoming) =>
        set(() => ({
          ...defaultState,
          ...incoming,
        })),
      resetSettings: () => set(defaultState),
    }),
    {
      name: 'gemwallet-settings-v3',
      storage: createJSONStorage(() => AsyncStorage),
      version: 3,
      migrate: (persistedState: SettingsState | undefined) => {
        if (!persistedState) return defaultState;

        return {
          ...defaultState,
          ...persistedState,
          geminiApiKey: persistedState.geminiApiKey ?? '',
          gemmaModel: persistedState.gemmaModel ?? defaultState.gemmaModel,
          currencyCode: persistedState.currencyCode ?? defaultState.currencyCode,
          language: persistedState.language ?? defaultState.language,
          region: persistedState.region ?? defaultState.region,
          passcodeEnabled: persistedState.passcodeEnabled ?? defaultState.passcodeEnabled,
          passcodePin: persistedState.passcodePin ?? defaultState.passcodePin,
          advancedSummariesEnabled: persistedState.advancedSummariesEnabled ?? defaultState.advancedSummariesEnabled,
          includeNotesInExport: persistedState.includeNotesInExport ?? defaultState.includeNotesInExport,
        };
      },
    }
  )
);
