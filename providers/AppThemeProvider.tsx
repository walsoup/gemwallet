import { PropsWithChildren, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { useSettingsStore } from '../store/useSettingsStore';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);

  const isDark =
    themePreference === 'system' ? colorScheme === 'dark' : themePreference === 'dark';

  const theme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    const isTrueBlack = isDark && oledTrueBlackEnabled;

    return {
      ...base,
      roundness: 24,
      colors: {
        ...base.colors,
        background: isTrueBlack ? '#000000' : base.colors.background,
        surface: isTrueBlack ? '#121212' : base.colors.surface,
        surfaceVariant: isTrueBlack ? '#1E1E1E' : base.colors.surfaceVariant,
        outline: highContrastEnabled ? (isDark ? '#FFFFFF' : '#000000') : base.colors.outline,
        onSurfaceVariant: highContrastEnabled ? base.colors.onSurface : base.colors.onSurfaceVariant,
      },
    };
  }, [highContrastEnabled, isDark, oledTrueBlackEnabled]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </PaperProvider>
  );
}
