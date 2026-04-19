import { PropsWithChildren, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, PaperProvider, useTheme } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

import { useSettingsStore } from '../store/useSettingsStore';

export type AppTheme = typeof MD3DarkTheme & {
  colors: typeof MD3DarkTheme.colors & {
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    surfaceBright: string;
    surfaceDim: string;
    surfaceTint: string;
  };
};

export const useAppTheme = () => {
  const theme = useTheme<AppTheme>();
  return theme;
};

// Velvet Kinetic palette
const VELVET_DARK_COLORS = {
  primary: '#ffb3b0',
  onPrimary: '#68000f',
  primaryContainer: '#ff6b6b',
  onPrimaryContainer: '#6d0010',
  secondary: '#ffb3b0',
  onSecondary: '#561e1e',
  secondaryContainer: '#753635',
  onSecondaryContainer: '#f8a29e',
  tertiary: '#52dea2',
  onTertiary: '#003824',
  tertiaryContainer: '#00b179',
  onTertiaryContainer: '#003b26',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#151313',
  onBackground: '#e8e1e0',
  surface: '#151313',
  onSurface: '#e8e1e0',
  surfaceVariant: '#383434',
  onSurfaceVariant: '#e0bfbd',
  outline: '#a78a88',
  outlineVariant: '#584140',
  inverseSurface: '#e8e1e0',
  inverseOnSurface: '#33302f',
  inversePrimary: '#ae2f34',
  surfaceContainerLowest: '#100e0e',
  surfaceContainerLow: '#1e1b1b',
  surfaceContainer: '#221f1f',
  surfaceContainerHigh: '#2d2929',
  surfaceContainerHighest: '#383434',
  surfaceBright: '#3c3838',
  surfaceDim: '#151313',
  surfaceTint: '#ffb3b0',
  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);
  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);

  const isDark =
    themePreference === 'system' ? colorScheme === 'dark' : themePreference === 'dark';

  const { theme: m3Theme } = useMaterial3Theme({ fallbackSourceColor: '#FF6B6B' });

  const theme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    const m3Colors = isDark ? m3Theme.dark : m3Theme.light;

    // Use the Velvet Kinetic colors in dark mode, M3 dynamic in light
    const colors = isDark ? { ...m3Colors, ...VELVET_DARK_COLORS } : m3Colors;

    const isTrueBlack = isDark && oledTrueBlackEnabled;
    const background = isTrueBlack ? '#000000' : colors.background;
    const surface = isTrueBlack ? '#0A0A0A' : colors.surface;
    const surfaceVariant = isTrueBlack ? '#161616' : colors.surfaceVariant;

    return {
      ...base,
      roundness: 16,
      colors: {
        ...base.colors,
        ...colors,
        background,
        surface,
        surfaceVariant,
        surfaceContainer: isTrueBlack ? '#0F0F0F' : colors.surfaceContainer,
        surfaceContainerLow: isTrueBlack ? '#0C0C0C' : colors.surfaceContainerLow,
        surfaceContainerLowest: isTrueBlack ? '#000000' : colors.surfaceContainerLowest,
        surfaceContainerHigh: isTrueBlack ? '#131313' : colors.surfaceContainerHigh,
        surfaceContainerHighest: isTrueBlack ? '#161616' : colors.surfaceContainerHighest,
        outline: highContrastEnabled ? (isDark ? '#FFFFFF' : '#000000') : colors.outline,
        onSurfaceVariant: highContrastEnabled ? base.colors.onSurface : colors.onSurfaceVariant,
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
