import React from 'react';
import { View, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import * as Linking from 'expo-linking';
import appConfig from '../../../../app.json';
import { styles } from './SettingsStyles';

export function AboutSection() {
  const theme = useTheme<AppTheme>();

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surfaceContainerLow }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>About</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>App info and support.</Text>
      </View>
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.surfaceContainer }]}>
        <View style={[styles.settingRow, { backgroundColor: theme.colors.surfaceContainer }]}>
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="information" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Version</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>{appConfig.expo.version}</Text>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.settingRow,
            { backgroundColor: pressed ? theme.colors.surfaceContainerHigh : theme.colors.surfaceContainer },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const subject = encodeURIComponent('GemWallet Feedback');
            const body = encodeURIComponent('');
            Linking.openURL(`mailto:me@itswal.me?subject=${subject}&body=${body}`);
          }}
        >
          <View style={styles.settingRowLeft}>
            <MaterialCommunityIcons name="email" size={24} color={theme.colors.onSurfaceVariant} />
            <View>
              <Text style={{ color: theme.colors.onSurface, fontFamily: 'BeVietnamPro_600SemiBold', fontSize: 16 }}>Send Feedback</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular', fontSize: 14 }}>Open your mail client</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </View>
    </View>
  );
}
