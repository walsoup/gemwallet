import React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useGoalsStore } from '../../../../store/useGoalsStore';
import { useRecurringStore } from '../../../../store/useRecurringStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { exportTransactionsCsv } from '../../../../utils/exportTransactionsCsv';
import { styles } from './SettingsStyles';

export function LocalDataSection() {
  const theme = useTheme<AppTheme>();

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const includeNotesInExport = useSettingsStore((state) => state.includeNotesInExport);

  const clearAllTransactions = useTransactionStore((state) => state.clearAllData);
  const clearAllGoals = useGoalsStore((state) => state.clearAllData);
  const clearAllRecurring = useRecurringStore((state) => state.clearAllData);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Local Data</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Manage your offline vault.</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <Pressable
          style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            try {
              const csv = exportTransactionsCsv({
                transactions,
                categories,
                includeNotes: includeNotesInExport,
              });
              const fileUri = `${FileSystem.cacheDirectory}gemwallet-transactions.csv`;
              await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });

              const canShare = await Sharing.isAvailableAsync();
              if (!canShare) {
                Alert.alert('Sharing not available', 'This device does not support sharing files.');
                return;
              }

              await Sharing.shareAsync(fileUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Export Transactions',
                UTI: 'public.comma-separated-values-text',
              });
            } catch {
              Alert.alert('Export failed', 'Could not export transactions.');
            }
          }}
        >
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="download" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Export Data</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Export transactions as CSV</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>
        <Pressable
          style={({pressed}) => [styles.settingRow, { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            Alert.alert(
              'Clear all data?',
              'This will delete all transactions, categories, and settings stored on this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Continue',
                  style: 'destructive',
                  onPress: () => {
                    Alert.alert('Confirm delete', 'This action cannot be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          clearAllTransactions();
                          clearAllGoals();
                          clearAllRecurring();
                          resetSettings();
                        },
                      },
                    ]);
                  },
                },
              ]
            );
          }}
        >
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="delete" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Clear All Data</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Reset stores on this device</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}
