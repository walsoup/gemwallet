import React from 'react';
import { View, Pressable, Switch, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { styles } from './SettingsStyles';

export function SecuritySection() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();

  const biometricAuthEnabled = useSettingsStore((state) => state.biometricAuthEnabled);
  const setBiometricAuthEnabled = useSettingsStore((state) => state.setBiometricAuthEnabled);
  const passcodePin = useSettingsStore((state) => state.passcodePin);
  const setPasscodePin = useSettingsStore((state) => state.setPasscodePin);
  const setPasscodeEnabled = useSettingsStore((state) => state.setPasscodeEnabled);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Security</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Protect your assets.</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="fingerprint" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Biometric Authentication</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Require Face ID / Touch ID</Text>
            </View>
          </View>
          <Switch
            value={biometricAuthEnabled}
            onValueChange={async (val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (val) {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware || !isEnrolled) {
                  Alert.alert('Biometrics Unavailable', 'This device does not have biometric hardware or it is not configured.');
                  setBiometricAuthEnabled(false);
                  return;
                }
              }
              setBiometricAuthEnabled(val);
            }}
            trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>
        <Pressable
          style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings/change-passcode');
          }}
        >
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="lock-outline" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>{passcodePin ? 'Change Passcode' : 'Set Passcode'}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{passcodePin ? 'Update your 6-digit pin' : 'Require a pin to open'}</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>

        {!!passcodePin && (
          <Pressable
            style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPasscodePin('');
              setPasscodeEnabled(false);
            }}
          >
            <View style={styles.settingRowLeft}>
              <MaterialCommunityIcons name="lock-off-outline" size={24} color={theme.colors.onSurfaceVariant} />
              <View>
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Remove Passcode</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Disable pin authentication</Text>
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
