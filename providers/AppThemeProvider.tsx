import { PropsWithChildren, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

import { useSettingsStore } from '../store/useSettingsStore';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);

  const isDark =
    themePreference === 'system' ? colorScheme === 'dark' : themePreference === 'dark';

  const { theme: m3Theme } = useMaterial3Theme({ fallbackSourceColor: '#6750A4' });

  const theme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    const m3Colors = isDark ? m3Theme.dark : m3Theme.light;
    const isTrueBlack = isDark && oledTrueBlackEnabled;

    return {
      ...base,
      roundness: 28,
      colors: {
        ...base.colors,
        ...m3Colors,
        background: isTrueBlack ? '#000000' : m3Colors.background,
        surface: isTrueBlack ? '#121212' : m3Colors.surface,
        surfaceVariant: isTrueBlack ? '#1E1E1E' : m3Colors.surfaceVariant,
        outline: highContrastEnabled ? (isDark ? '#FFFFFF' : '#000000') : m3Colors.outline,
        onSurfaceVariant: highContrastEnabled ? base.colors.onSurface : m3Colors.onSurfaceVariant,
        elevation: {
          level0: 'transparent',
          level1: isDark ? '#1C1B1F' : '#F3EDF7',
          level2: isDark ? '#232128' : '#EDDFF6',
          level3: isDark ? '#2A2731' : '#E8D2F5',
          level4: isDark ? '#2D2934' : '#E6CEF5',
          level5: isDark ? '#332E3A' : '#E2C5F4',
        }
      },
    };
  }, [highContrastEnabled, isDark, oledTrueBlackEnabled, m3Theme]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </PaperProvider>
  );
}
