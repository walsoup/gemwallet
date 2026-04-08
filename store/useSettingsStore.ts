import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';

type SettingsState = {
  gemmaApiKey: string;
  themePreference: ThemePreference;
  setGemmaApiKey: (apiKey: string) => void;
  setThemePreference: (preference: ThemePreference) => void;
  resetSettings: () => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      gemmaApiKey: '',
      themePreference: 'system',
      setGemmaApiKey: (gemmaApiKey) => set({ gemmaApiKey }),
      setThemePreference: (themePreference) => set({ themePreference }),
      resetSettings: () => set({ gemmaApiKey: '', themePreference: 'system' }),
    }),
    {
      name: 'gemwallet-settings-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
