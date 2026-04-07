import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureFonts, MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';

const fonts = configureFonts({
  config: {
    displayLarge: { fontFamily: 'System', fontWeight: '800' },
    headlineMedium: { fontFamily: 'System', fontWeight: '700' },
    titleLarge: { fontFamily: 'System', fontWeight: '700' },
    bodyLarge: { fontFamily: 'System', fontWeight: '500' }
  }
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { theme } = useMaterial3Theme();
  const darkMode = colorScheme === 'dark';
  const baseTheme = darkMode ? MD3DarkTheme : MD3LightTheme;

  const paperTheme = {
    ...baseTheme,
    roundness: 28,
    colors: {
      ...baseTheme.colors,
      ...(darkMode ? theme.dark : theme.light)
    },
    fonts
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right'
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
