import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { useRouter } from 'expo-router';
import { formatAppCurrency } from '../../../../utils/currency';
import { styles } from './SettingsStyles';

export function CurrencyRegionSection() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const region = useSettingsStore((state) => state.region);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Currency & Region</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Change formatting across the app.</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <Pressable
          style={({ pressed }) => [
            styles.settingRow,
            { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/settings/currency');
          }}
        >
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="currency-usd" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Currency & Region</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
                {currencyCode} ({region})
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 12 }}>
              {formatAppCurrency(123456)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
