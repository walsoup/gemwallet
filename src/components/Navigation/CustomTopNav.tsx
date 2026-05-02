import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { AppTheme } from '../../../providers/AppThemeProvider';

interface CustomTopNavProps {
  title: string;
}

export function CustomTopNav({ title }: CustomTopNavProps) {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.positionContainer}>
      <BlurView
        intensity={80}
        tint="dark"
        style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
        <Pressable
          style={[styles.settingsButton, { backgroundColor: theme.colors.surfaceContainerHigh }]}
          onPress={() => router.push('/settings')}
        >
          <MaterialCommunityIcons name="cog" size={24} color={theme.colors.onSurfaceVariant} />
        </Pressable>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  positionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(21, 19, 19, 0.8)', // fallback for blur
  },
  title: {
    fontWeight: '500',
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
