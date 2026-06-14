import React from 'react';
import { View, Switch } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { styles } from './SettingsStyles';

export function NotificationsSection() {
  const theme = useTheme<AppTheme>();

  const notificationsTransactionAlerts = useSettingsStore((state) => state.notificationsTransactionAlerts);
  const setNotificationsTransactionAlerts = useSettingsStore((state) => state.setNotificationsTransactionAlerts);
  const notificationsWeeklySummary = useSettingsStore((state) => state.notificationsWeeklySummary);
  const setNotificationsWeeklySummary = useSettingsStore((state) => state.setNotificationsWeeklySummary);
  const notificationsSavingsGoalProgress = useSettingsStore((state) => state.notificationsSavingsGoalProgress);
  const setNotificationsSavingsGoalProgress = useSettingsStore((state) => state.setNotificationsSavingsGoalProgress);
  const notificationsBudgetWarnings = useSettingsStore((state) => state.notificationsBudgetWarnings);
  const setNotificationsBudgetWarnings = useSettingsStore((state) => state.setNotificationsBudgetWarnings);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Notifications</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>
          Choose which alerts you want.
        </Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="bell" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Transaction Alerts</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>When money moves</Text>
            </View>
          </View>
          <Switch
            value={notificationsTransactionAlerts}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotificationsTransactionAlerts(val);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={notificationsTransactionAlerts ? 'Disable transaction alerts' : 'Enable transaction alerts'}
          />
        </View>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="calendar-week" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Weekly Summary</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Spending recap</Text>
            </View>
          </View>
          <Switch
            value={notificationsWeeklySummary}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotificationsWeeklySummary(val);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={notificationsWeeklySummary ? 'Disable weekly summary' : 'Enable weekly summary'}
          />
        </View>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="target" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Savings Goal Progress</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Goal milestones</Text>
            </View>
          </View>
          <Switch
            value={notificationsSavingsGoalProgress}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotificationsSavingsGoalProgress(val);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={notificationsSavingsGoalProgress ? 'Disable savings goal alerts' : 'Enable savings goal alerts'}
          />
        </View>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="alert" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Budget Warnings</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Approaching limits</Text>
            </View>
          </View>
          <Switch
            value={notificationsBudgetWarnings}
            onValueChange={(val) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setNotificationsBudgetWarnings(val);
            }}
            trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }}
            thumbColor={theme.colors.onSurface}
            accessibilityLabel={notificationsBudgetWarnings ? 'Disable budget warnings' : 'Enable budget warnings'}
          />
        </View>
      </View>
    </View>
  );
}
