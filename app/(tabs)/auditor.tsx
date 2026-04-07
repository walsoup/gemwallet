import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { useTransactionStore } from '../../store/useTransactionStore';
import { runFinancialAudit } from '../../utils/aiAuditor';

export default function AuditorScreen() {
  const transactions = useTransactionStore((state) => state.transactions);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState('Press "Roast Me" and face your spending decisions.');

  const onRoast = async () => {
    try {
      setIsLoading(true);
      const result = await runFinancialAudit(transactions);
      setOutput(result);
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
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text variant="headlineMedium">AI Financial Auditor</Text>
      <Button mode="contained" loading={isLoading} disabled={isLoading} onPress={onRoast}>
        Roast Me
      </Button>
      <Text variant="bodyLarge">{output}</Text>
    </ScrollView>
  );
}
