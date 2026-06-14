import React, { useState, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { ScreenLayout } from '../../../components/Layout/ScreenLayout';
import { useLocalSearchParams } from 'expo-router';
import { styles } from '../components/SettingsStyles';

import { SecuritySection } from '../components/SecuritySection';
import { AppearanceSection } from '../components/AppearanceSection';
import { AISettingsSection } from '../components/AISettingsSection';
import { CurrencyRegionSection } from '../components/CurrencyRegionSection';
import { CategoriesSection } from '../components/CategoriesSection';
import { NotificationsSection } from '../components/NotificationsSection';
import { LocalDataSection } from '../components/LocalDataSection';
import { AboutSection } from '../components/AboutSection';

export default function SettingsScreen() {
  const theme = useTheme<AppTheme>();
  const params = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [aiSectionY, setAiSectionY] = useState<number | null>(null);

  useEffect(() => {
    if (params.section !== 'ai' || aiSectionY === null) return;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, aiSectionY - 24), animated: true });
    }, 0);
    return () => clearTimeout(timeout);
  }, [params.section, aiSectionY]);

  return (
    <ScreenLayout title="Settings" backgroundColor={theme.colors.background} contentContainerStyle={{ flex: 1 }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displayMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Settings
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'BeVietnamPro_400Regular' }}>
            Manage your wallet experience.
          </Text>
        </View>

        <SecuritySection />
        <AppearanceSection />
        <AISettingsSection onLayout={(event) => setAiSectionY(event.nativeEvent.layout.y)} />
        <CurrencyRegionSection />
        <CategoriesSection />
        <NotificationsSection />
        <LocalDataSection />
        <AboutSection />
      </ScrollView>
    </ScreenLayout>
  );
}
