import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemePreference } from '../types/finance';

type SettingsState = {
  themePreference: ThemePreference;
  oledTrueBlackEnabled: boolean;
  highContrastEnabled: boolean;
  secureAccessEnabled: boolean;
  setThemePreference: (preference: ThemePreference) => void;
  setOledTrueBlackEnabled: (enabled: boolean) => void;
  setHighContrastEnabled: (enabled: boolean) => void;
  setSecureAccessEnabled: (enabled: boolean) => void;
  resetSettings: () => void;
};

const defaultState = {
  themePreference: 'system' as ThemePreference,
  oledTrueBlackEnabled: false,
  highContrastEnabled: false,
  secureAccessEnabled: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultState,
      setThemePreference: (themePreference) => set({ themePreference }),
      setOledTrueBlackEnabled: (oledTrueBlackEnabled) => set({ oledTrueBlackEnabled }),
      setHighContrastEnabled: (highContrastEnabled) => set({ highContrastEnabled }),
      setSecureAccessEnabled: (secureAccessEnabled) => set({ secureAccessEnabled }),
      resetSettings: () => set(defaultState),
    }),
    {
      name: 'gemwallet-settings-v2',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
