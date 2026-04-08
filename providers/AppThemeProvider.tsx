import { PropsWithChildren, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';

import { useSettingsStore } from '../store/useSettingsStore';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);

  const isDark =
    themePreference === 'system' ? colorScheme === 'dark' : themePreference === 'dark';

  const theme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;

    return {
      ...base,
      roundness: 16,
    };
  }, [isDark]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </PaperProvider>
  );
}
