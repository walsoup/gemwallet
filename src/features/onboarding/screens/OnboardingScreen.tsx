import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { Text, Button, Surface, Switch, useTheme, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactionStore } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { AppTheme } from '../../../../providers/AppThemeProvider';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  interpolate, 
  Extrapolate 
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Your Private Vault',
    description: 'Gemwallet keeps your financial data secure and 100% on your device. No cloud, no tracking.',
    icon: 'shield-lock',
    color: '#ff6b6b',
  },
  {
    id: 'ai',
    title: 'Intelligence Built-in',
    description: 'Chat with your wallet to log expenses, set goals, and analyze your spending patterns automatically.',
    icon: 'robot',
    color: '#52dea2',
  },
  {
    id: 'setup',
    title: 'Getting Started',
    description: 'Enable AI features and personalize your experience to take control of your money today.',
    icon: 'sparkles',
    color: '#ae2f34',
  }
];

export default function OnboardingScreen() {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [activeStep, setActiveStep] = useState(0);

  const completeOnboarding = useTransactionStore((state) => state.completeOnboarding);
  const setAiFeaturesEnabled = useSettingsStore((state) => state.setAiFeaturesEnabled);
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeStep < ONBOARDING_STEPS.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeStep + 1) * width, animated: true });
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiFeaturesEnabled(aiEnabled);
    completeOnboarding({ initialBalanceCents: 0, voiceAssistantEnabled: aiEnabled });
    router.replace('/');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
          const newStep = Math.round(e.nativeEvent.contentOffset.x / width);
          if (newStep !== activeStep) {
            Haptics.selectionAsync();
            setActiveStep(newStep);
          }
        }}
        scrollEventThrottle={16}
      >
        {ONBOARDING_STEPS.map((step, index) => {
          return (
            <View key={step.id} style={[styles.stepContainer, { width }]}>
              <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
                <View style={[styles.iconContainer, { backgroundColor: step.color + '1A' }]}>
                  <MaterialCommunityIcons name={step.icon as any} size={80} color={step.color} />
                </View>
                
                <Text variant="displayMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                  {step.title}
                </Text>
                
                <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
                  {step.description}
                </Text>

                {step.id === 'setup' && (
                  <Surface style={[styles.aiCard, { backgroundColor: theme.colors.surfaceContainerLow }]} elevation={0}>
                    <View style={styles.aiRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium">Enable AI Assistant</Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          Natural language tracking & analysis
                        </Text>
                      </View>
                      <Switch 
                        value={aiEnabled} 
                        onValueChange={(val) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setAiEnabled(val);
                        }} 
                      />
                    </View>
                  </Surface>
                )}
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.pagination}>
          {ONBOARDING_STEPS.map((_, i) => {
            const dotStyle = useAnimatedStyle(() => {
              const opacity = interpolate(
                scrollX.value / width,
                [i - 1, i, i + 1],
                [0.4, 1, 0.4],
                Extrapolate.CLAMP
              );
              const scale = interpolate(
                scrollX.value / width,
                [i - 1, i, i + 1],
                [1, 1.4, 1],
                Extrapolate.CLAMP
              );
              return { opacity, transform: [{ scale }] };
            });

            return (
              <Animated.View 
                key={i} 
                style={[styles.dot, dotStyle, { backgroundColor: theme.colors.primary }]} 
              />
            );
          })}
        </View>

        <Button
          mode="contained"
          onPress={handleNext}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          {activeStep === ONBOARDING_STEPS.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  aiCard: {
    marginTop: 40,
    padding: 20,
    borderRadius: 24,
    width: '100%',
  },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  footer: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    height: 10,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  button: {
    width: '100%',
    borderRadius: 32,
  },
  buttonContent: {
    height: 64,
  },
  buttonLabel: {
    fontSize: 18,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});
