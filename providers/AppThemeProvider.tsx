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
    const background = isTrueBlack ? '#000000' : m3Colors.surfaceContainerLowest;
    const surface = isTrueBlack ? '#0A0A0A' : m3Colors.surfaceContainerHigh;
    const surfaceVariant = isTrueBlack ? '#161616' : m3Colors.surfaceVariant;

    return {
      ...base,
      roundness: 16,
      colors: {
        ...base.colors,
        ...m3Colors,
        background,
        surface,
        surfaceVariant,
        surfaceContainer: isTrueBlack ? '#0F0F0F' : m3Colors.surfaceContainer,
        surfaceContainerLow: isTrueBlack ? '#0C0C0C' : m3Colors.surfaceContainerLow,
        surfaceContainerLowest: isTrueBlack ? '#000000' : m3Colors.surfaceContainerLowest,
        surfaceContainerHigh: isTrueBlack ? '#131313' : m3Colors.surfaceContainerHigh,
        surfaceContainerHighest: isTrueBlack ? '#161616' : m3Colors.surfaceContainerHighest,
        outline: highContrastEnabled ? (isDark ? '#FFFFFF' : '#000000') : m3Colors.outline,
        onSurfaceVariant: highContrastEnabled ? base.colors.onSurface : m3Colors.onSurfaceVariant,
        elevation: {
          ...m3Colors.elevation,
        },
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
