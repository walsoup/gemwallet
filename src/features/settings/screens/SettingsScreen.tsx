import React from 'react';
import { ScrollView, StyleSheet, View, Pressable, Switch } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { CustomTopNav } from '../../../components/Navigation/CustomTopNav';

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

  const smartCategorizationEnabled = useSettingsStore((state) => state.smartCategorizationEnabled);
  const setSmartCategorizationEnabled = useSettingsStore((state) => state.setSmartCategorizationEnabled);

  const secureAccessEnabled = useSettingsStore((state) => state.secureAccessEnabled);
  const setSecureAccessEnabled = useSettingsStore((state) => state.setSecureAccessEnabled);

  const themePrimary = useSettingsStore((state) => state.themePrimary);
  const setThemePrimary = useSettingsStore((state) => state.setThemePrimary);

  const colors = [
    '#ff6b6b', // Coral Pink
    '#06b6d4', // Vibrant Cyan
    '#8b5cf6', // Royal Purple
    '#f97316', // Sunset Orange
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomTopNav title="Good morning" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>

        <View style={styles.header}>
          <Text variant="displayMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Settings
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular' }}>
            Manage your Kinetic experience.
          </Text>
        </View>

        {/* On-device AI Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>On-device AI (Gemma)</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Manage local intelligence features.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="robot" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Gemma Model Status</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Downloaded (2.4 GB) • Active</Text>
                </View>
              </View>
            </View>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="auto-fix" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Smart Categorization</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Auto-tag local transactions</Text>
                </View>
              </View>
              <Switch
                value={smartCategorizationEnabled}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSmartCategorizationEnabled(val);
                }}
                trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
                thumbColor={smartCategorizationEnabled ? '#000000' : theme.colors.onSurfaceVariant}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
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
                value={secureAccessEnabled}
                onValueChange={(val) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSecureAccessEnabled(val);
                }}
                trackColor={{ false: theme.colors.surfaceContainerHighest, true: theme.colors.primary }}
                thumbColor={secureAccessEnabled ? '#000000' : theme.colors.onSurfaceVariant}
              />
            </View>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="lock-outline" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Change Passcode</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Update your 6-digit pin</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Personalize your interface.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
                <MaterialCommunityIcons name="palette" size={24} color={theme.colors.onSurfaceVariant} />
                <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Accent Color</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {colors.map(color => {
                  const isSelected = themePrimary === color || (themePrimary === '' && color === '#ff6b6b');
                  return (
                    <Pressable
                      key={color}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        isSelected && { borderWidth: 2, borderColor: color, transform: [{ scale: 1.1 }] }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemePrimary(color);
                      }}
                    >
                      {isSelected && <MaterialCommunityIcons name="check" size={24} color="#000000" />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>

        {/* Local Data Section */}
        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Local Data</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Manage your offline vault.</Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="download" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Export Local Backup</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Save encrypted data locally</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            <Pressable
              style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={styles.settingRowLeft}>
                <MaterialCommunityIcons name="delete" size={24} color={theme.colors.onSurfaceVariant} />
                <View>
                  <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Clear Local Cache</Text>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Free up space on device</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  header: {
    marginBottom: 48,
    marginTop: 32,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
    marginBottom: 8,
  },
  section: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    padding: 4,
  },
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  sectionContent: {
    borderRadius: 12,
    gap: 2,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  colorCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
