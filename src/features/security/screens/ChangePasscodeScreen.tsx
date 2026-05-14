import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { PasscodeKeypad } from '../components/PasscodeKeypad';

type Step = 'verify' | 'new' | 'confirm' | 'done';

export default function ChangePasscodeScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();

  const existingPin = useSettingsStore((state) => state.passcodePin);
  const setPasscodePin = useSettingsStore((state) => state.setPasscodePin);
  const setPasscodeEnabled = useSettingsStore((state) => state.setPasscodeEnabled);

  const [step, setStep] = useState<Step>(existingPin ? 'verify' : 'new');
  const [value, setValue] = useState('');
  const [candidate, setCandidate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => {
    switch (step) {
      case 'verify':
        return 'Verify Current Passcode';
      case 'new':
        return 'New Passcode';
      case 'confirm':
        return 'Confirm Passcode';
      case 'done':
        return 'Passcode Updated';
    }
  }, [step]);

  const subtitle = useMemo(() => {
    switch (step) {
      case 'verify':
        return 'Enter your current 6-digit PIN.';
      case 'new':
        return 'Choose a new 6-digit PIN.';
      case 'confirm':
        return 'Re-enter your new PIN to confirm.';
      case 'done':
        return 'Your passcode has been updated.';
    }
  }, [step]);

  const handleDigit = (digit: string) => {
    if (value.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    const next = `${value}${digit}`;
    setValue(next);

    if (next.length === 6) {
      setTimeout(() => {
        if (step === 'verify') {
          if (next !== existingPin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError('Incorrect passcode. Try again.');
            setValue('');
            return;
          }
          setValue('');
          setStep('new');
          return;
        }

        if (step === 'new') {
          setCandidate(next);
          setValue('');
          setStep('confirm');
          return;
        }

        if (step === 'confirm') {
          if (next !== candidate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setError('Passcodes did not match. Start over.');
            setCandidate('');
            setValue('');
            setStep('new');
            return;
          }

          setPasscodePin(next);
          setPasscodeEnabled(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setStep('done');
        }
      }, 120);
    }
  };

  const handleBackspace = () => {
    if (!value.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((prev) => prev.slice(0, -1));
  };

  const renderDots = () => {
    return (
      <View style={styles.dots}>
        {Array.from({ length: 6 }).map((_, idx) => {
          const filled = idx < value.length;
          return (
            <View
              key={idx}
              style={[
                styles.dot,
                {
                  backgroundColor: filled ? theme.colors.primaryContainer : theme.colors.surfaceContainerHigh,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <ScreenLayout title="Security" backgroundColor={theme.colors.background}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontFamily: 'SpaceGrotesk_700Bold' }}>
          {title}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', marginTop: 8 }}>
          {subtitle}
        </Text>

        {renderDots()}

        {error && (
          <Text style={{ color: theme.colors.error, fontFamily: 'BeVietnamPro_500Medium', marginTop: 12 }}>
            {error}
          </Text>
        )}

        {step === 'done' ? (
          <Button
            mode="contained"
            style={{ marginTop: 24, borderRadius: 14 }}
            onPress={() => router.back()}
          >
            Done
          </Button>
        ) : (
          <PasscodeKeypad theme={theme} value={value} onDigit={handleDigit} onBackspace={handleBackspace} />
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
});
