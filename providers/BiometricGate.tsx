import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Text, Button, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../store/useSettingsStore';
import type { AppTheme } from './AppThemeProvider';
import { PasscodeKeypad } from '../src/features/security/components/PasscodeKeypad';

export function BiometricGate({ children }: PropsWithChildren) {
  const theme = useTheme<AppTheme>();
  const biometricAuthEnabled = useSettingsStore((state) => state.biometricAuthEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const passcodePin = useSettingsStore((state) => state.passcodePin);

  const [isAuthed, setIsAuthed] = useState(!biometricAuthEnabled && !passcodeEnabled);
  const [error, setError] = useState<string | null>(null);
  const [showPasscodeFallback, setShowPasscodeFallback] = useState(false);
  const [passcodeValue, setPasscodeValue] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const appState = useRef(AppState.currentState);
  const lastActiveTimestamp = useRef<number>(Date.now());

  const runBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !enrolled) {
        setError('Biometrics are not available on this device.');
        if (passcodePin) {
          setShowPasscodeFallback(true);
        } else {
          setIsAuthed(true);
        }
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock GemWallet',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsAuthed(true);
        setError(null);
        setShowPasscodeFallback(false);
      } else {
        setIsAuthed(false);
        setError('Authentication cancelled.');
        if (passcodePin) {
          setShowPasscodeFallback(true);
        }
      }
    } catch {
      setIsAuthed(false);
      setError('Authentication failed.');
      if (passcodePin) {
        setShowPasscodeFallback(true);
      }
    }
  };

  const authenticate = async () => {
    setError(null);
    setPasscodeValue('');
    setPasscodeError(null);
    if (biometricAuthEnabled) {
      setShowPasscodeFallback(false);
      await runBiometrics();
    } else if (passcodePin) {
      setShowPasscodeFallback(true);
    } else {
      setIsAuthed(true);
    }
  };

  useEffect(() => {
    if (biometricAuthEnabled || passcodeEnabled) {
      setIsAuthed(false);
      authenticate();
    } else {
      setIsAuthed(true);
    }
  }, [biometricAuthEnabled, passcodeEnabled]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const timeInBackground = Date.now() - lastActiveTimestamp.current;
        if (
          appState.current.match(/inactive|background/) &&
          timeInBackground > 30000 // 30 seconds timeout
        ) {
          if (biometricAuthEnabled || passcodeEnabled) {
            setIsAuthed(false);
            authenticate();
          }
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastActiveTimestamp.current = Date.now();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [biometricAuthEnabled, passcodeEnabled]);

  const handleDigit = (digit: string) => {
    if (passcodeValue.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasscodeError(null);
    const next = `${passcodeValue}${digit}`;
    setPasscodeValue(next);

    if (next.length === 6) {
      setTimeout(() => {
        if (next === passcodePin) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setIsAuthed(true);
          setShowPasscodeFallback(false);
          setPasscodeValue('');
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setPasscodeError('Incorrect passcode. Try again.');
          setPasscodeValue('');
        }
      }, 120);
    }
  };

  const handleBackspace = () => {
    if (!passcodeValue.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPasscodeValue((prev) => prev.slice(0, -1));
  };

  const renderDots = () => {
    return (
      <View style={styles.dots}>
        {Array.from({ length: 6 }).map((_, idx) => {
          const filled = idx < passcodeValue.length;
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

  if (isAuthed) return <>{children}</>;

  if (showPasscodeFallback) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textAlign: 'center', fontFamily: 'SpaceGrotesk_700Bold' }}>
          Enter Passcode
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, fontFamily: 'BeVietnamPro_400Regular' }}>
          Unlock GemWallet using your secure PIN.
        </Text>
        
        {renderDots()}

        {passcodeError && (
          <Text style={{ color: theme.colors.error, fontFamily: 'BeVietnamPro_500Medium', marginTop: 12 }}>
            {passcodeError}
          </Text>
        )}

        <PasscodeKeypad theme={theme} value={passcodeValue} onDigit={handleDigit} onBackspace={handleBackspace} />

        {biometricAuthEnabled && (
          <Button
            mode="text"
            style={{ marginTop: 20 }}
            onPress={() => {
              runBiometrics();
            }}
          >
            Use Biometrics
          </Button>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.colors.background }}>
      <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
        Unlock required
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8, fontFamily: 'BeVietnamPro_400Regular' }}>
        {error ?? 'Authenticate to continue.'}
      </Text>
      <Button
        mode="contained"
        style={{ marginTop: 20, borderRadius: 14 }}
        onPress={() => {
          authenticate();
        }}
      >
        Try Again
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
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

