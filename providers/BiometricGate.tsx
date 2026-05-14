import React, { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Text, Button, useTheme } from 'react-native-paper';

import { useSettingsStore } from '../store/useSettingsStore';
import type { AppTheme } from './AppThemeProvider';

export function BiometricGate({ children }: PropsWithChildren) {
  const theme = useTheme<AppTheme>();
  const biometricAuthEnabled = useSettingsStore((state) => state.biometricAuthEnabled);

  const [isAuthed, setIsAuthed] = useState(!biometricAuthEnabled);
  const [error, setError] = useState<string | null>(null);
  const hasPrompted = useRef(false);

  useEffect(() => {
    if (!biometricAuthEnabled) {
      setIsAuthed(true);
      setError(null);
      hasPrompted.current = false;
      return;
    }

    if (hasPrompted.current) return;
    hasPrompted.current = true;

    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) {
          setError('Biometrics are not available on this device.');
          setIsAuthed(true);
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
        } else {
          setIsAuthed(false);
          setError('Authentication cancelled.');
        }
      } catch (e) {
        setIsAuthed(false);
        setError('Authentication failed.');
      }
    })();
  }, [biometricAuthEnabled]);

  if (isAuthed) return <>{children}</>;

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
          hasPrompted.current = false;
          setError(null);
        }}
      >
        Try Again
      </Button>
    </View>
  );
}

