import React from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppTheme } from '../../../../providers/AppThemeProvider';
import { CustomTopNav } from '../../../components/Navigation/CustomTopNav';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import type { CurrencyCode, RegionCode } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { SUPPORTED_CURRENCIES, getEffectiveLocale } from '../../../../utils/currency';

const REGIONS: readonly { code: RegionCode; label: string; locale: string }[] = [
  { code: 'US', label: 'United States', locale: 'en-US' },
  { code: 'EU', label: 'Europe', locale: 'fr-FR' },
  { code: 'UK', label: 'United Kingdom', locale: 'en-GB' },
  { code: 'JP', label: 'Japan', locale: 'ja-JP' },
  { code: 'AU', label: 'Australia', locale: 'en-AU' },
  { code: 'CA', label: 'Canada', locale: 'en-CA' },
  { code: 'MA', label: 'Morocco', locale: 'fr-MA' },
];

export default function CurrencyRegionScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const setCurrencyCode = useSettingsStore((state) => state.setCurrencyCode);
  const region = useSettingsStore((state) => state.region);
  const setRegion = useSettingsStore((state) => state.setRegion);
  const language = useSettingsStore((state) => state.language);

  const previewLocale = getEffectiveLocale({ currencyCode, region, language });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <CustomTopNav title="Currency" />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Currency & Region
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular' }}>
            Preview: {formatCurrency(123456, { currencyCode, locale: previewLocale })}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Currency</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Used to format amounts across Home, Planning, and Analytics.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            {SUPPORTED_CURRENCIES.map((currency) => {
              const selected = currency.code === currencyCode;
              return (
                <Pressable
                  key={currency.code}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceContainerHigh
                        : theme.colors.surfaceContainer,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCurrencyCode(currency.code as CurrencyCode);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons
                      name={selected ? 'check-circle' : 'circle-outline'}
                      size={22}
                      color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <View>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>
                        {currency.code}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                        {currency.label}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                    {formatCurrency(123456, { currencyCode: currency.code, locale: previewLocale })}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Region</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
              Controls date and number formatting preferences.
            </Text>
          </View>
          <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
            {REGIONS.map((item) => {
              const selected = item.code === region;
              return (
                <Pressable
                  key={item.code}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceContainerHigh
                        : theme.colors.surfaceContainer,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRegion(item.code);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons
                      name={selected ? 'check-circle' : 'circle-outline'}
                      size={22}
                      color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <View>
                      <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>
                        {item.label}
                      </Text>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                        {item.code} • {item.locale}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
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
    marginBottom: 32,
    marginTop: 24,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
});
