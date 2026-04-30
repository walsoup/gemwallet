import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlanningScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
          Planning
        </Text>
        <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Goals and recurring transactions will appear here.
          </Text>
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
  },
  card: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
});
