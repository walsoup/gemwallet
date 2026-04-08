import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Card, Text, useTheme } from 'react-native-paper';

import { useSettingsStore } from '../../store/useSettingsStore';
import { useTransactionStore } from '../../store/useTransactionStore';
import { streamFinancialAudit } from '../../utils/aiAuditor';

export default function AuditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const transactions = useTransactionStore((state) => state.transactions);
  const apiKey = useSettingsStore((state) => state.gemmaApiKey);

  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState('Tap Analyze and prepare for the roast.');

  const onAnalyze = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsLoading(true);
      setOutput('');

      await streamFinancialAudit(transactions, apiKey, (chunk) => {
        setOutput((current) => `${current}${chunk}`);
      });
    } catch (error) {
      if (error instanceof Error) {
        setOutput(error.message);
      } else {
        setOutput('Failed to run audit.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
          AI Auditor
        </Text>

        {!apiKey.trim() ? (
          <Banner
            visible
            actions={[{ label: 'Open Settings', onPress: () => router.push('/(tabs)/settings') }]}
          >
            No API key found. Add your Gemini API key in Settings.
          </Banner>
        ) : null}

        <Button mode="contained" loading={isLoading} disabled={isLoading || !apiKey.trim()} onPress={onAnalyze}>
          Analyze
        </Button>

        <View style={{ gap: 8 }}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            Chat
          </Text>
          <Card mode="contained">
            <Card.Content>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                {output}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
