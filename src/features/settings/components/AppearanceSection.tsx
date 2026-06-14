import React, { useState } from 'react';
import { View, Pressable, Switch, ScrollView } from 'react-native';
import { Text, useTheme, TextInput } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { styles } from './SettingsStyles';
import type { ThemePreference } from '../../../../types/finance';

const colors = [
  '#ff6b6b', // Coral Pink
  '#06b6d4', // Vibrant Cyan
  '#8b5cf6', // Royal Purple
  '#f97316', // Sunset Orange
];

const secondaryColors = [
  '#52dea2', // Mint Green
  '#fbbf24', // Amber
  '#38bdf8', // Sky Blue
  '#f472b6', // Pink
];

export function AppearanceSection() {
  const theme = useTheme<AppTheme>();

  const customGreetingName = useSettingsStore((state) => state.customGreetingName);
  const setCustomGreetingName = useSettingsStore((state) => state.setCustomGreetingName);
  const [greetingDraft, setGreetingDraft] = useState(customGreetingName);

  const themePrimary = useSettingsStore((state) => state.themePrimary);
  const setThemePrimary = useSettingsStore((state) => state.setThemePrimary);
  const themeSecondary = useSettingsStore((state) => state.themeSecondary);
  const setThemeSecondary = useSettingsStore((state) => state.setThemeSecondary);

  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  const oledTrueBlackEnabled = useSettingsStore((state) => state.oledTrueBlackEnabled);
  const setOledTrueBlackEnabled = useSettingsStore((state) => state.setOledTrueBlackEnabled);
  const highContrastEnabled = useSettingsStore((state) => state.highContrastEnabled);
  const setHighContrastEnabled = useSettingsStore((state) => state.setHighContrastEnabled);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Personalize your interface.</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={[styles.settingRowLeft, { marginBottom: 12 }]}>
            <MaterialCommunityIcons name="account-edit" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Greeting Name</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Custom name for the Home tab</Text>
            </View>
          </View>
          <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TextInput
              style={{ flex: 1, backgroundColor: theme.colors.surfaceContainerLowest }}
              mode="outlined"
              dense
              placeholder="e.g. John"
              value={greetingDraft}
              onChangeText={setGreetingDraft}
            />
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCustomGreetingName(greetingDraft);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: pressed ? theme.colors.primaryContainer : theme.colors.primary,
              })}
            >
              <Text style={{ color: theme.colors.onPrimary, fontFamily: 'BeVietnamPro_600SemiBold' }}>Save</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
            <MaterialCommunityIcons name="theme-light-dark" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Theme</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Light, Dark, or System default</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {([
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'System' },
            ] as const).map((option) => {
              const selected = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Set theme to ${option.label}`}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.colors.primaryContainer
                        : pressed
                          ? theme.colors.surfaceContainerHighest
                          : theme.colors.surfaceContainerHigh,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemePreference(option.value as ThemePreference);
                  }}
                >
                  <Text style={{
                    color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
                    fontFamily: 'BeVietnamPro_600SemiBold',
                    fontSize: 14,
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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

        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={[styles.settingRowLeft, { marginBottom: 16 }]}>
            <MaterialCommunityIcons name="palette-swatch" size={24} color={theme.colors.onSurfaceVariant} />
            <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Secondary Accent</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
            {secondaryColors.map((color) => {
              const isSelected = themeSecondary === color || (themeSecondary === '' && color === '#52dea2');
              return (
                <Pressable
                  key={color}
                  accessibilityRole="button"
                  accessibilityLabel="Set secondary accent color"
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    isSelected && { borderWidth: 2, borderColor: color, transform: [{ scale: 1.1 }] },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setThemeSecondary(color);
                  }}
                >
                  {isSelected && <MaterialCommunityIcons name="check" size={24} color="#000000" />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="contrast" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>High Contrast</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Improve legibility</Text>
            </View>
          </View>
          <Switch
            value={highContrastEnabled}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setHighContrastEnabled(value);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={highContrastEnabled ? 'Disable high contrast' : 'Enable high contrast'}
          />
        </View>

        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="brightness-4" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>True Black (OLED)</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Dark theme only</Text>
            </View>
          </View>
          <Switch
            value={oledTrueBlackEnabled}
            onValueChange={(value) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOledTrueBlackEnabled(value);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={oledTrueBlackEnabled ? 'Disable true black' : 'Enable true black'}
          />
        </View>
      </View>
    </View>
  );
}
