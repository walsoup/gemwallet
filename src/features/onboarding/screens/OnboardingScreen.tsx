import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, Switch, useTheme } from 'react-native-paper';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useTransactionStore((state) => state.completeOnboarding);
  const setAiFeaturesEnabled = useSettingsStore((state) => state.setAiFeaturesEnabled);
  const [aiEnabled, setAiEnabled] = useState(false);

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiFeaturesEnabled(aiEnabled);
    completeOnboarding({ initialBalanceCents: 0, voiceAssistantEnabled: aiEnabled });
    router.replace('/');
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="displayMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
          Welcome to Gemwallet
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
          Set up your wallet to get started.
        </Text>
      </View>

      <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <View style={styles.row}>
          <View style={styles.textContainer}>
            <Text variant="titleMedium">Enable AI Features</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Use AI to analyze your spending, chat with your wallet, and automatically categorize transactions.
            </Text>
          </View>
          <Switch value={aiEnabled} onValueChange={(val) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            setAiEnabled(val);
          }} />
        </View>
      </Surface>

      <View style={styles.spacer} />

      <Button
        mode="contained"
        onPress={handleComplete}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Get Started
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 48,
    alignItems: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  spacer: {
    flex: 1,
  },
  button: {
    borderRadius: 24,
    marginTop: 24,
  },
  buttonContent: {
    height: 56,
  },
});
