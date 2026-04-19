import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  StyleProp,
  View,
  Platform,
  UIManager,
  ViewStyle,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Chip,
  FAB,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  SegmentedButtons,
  ActivityIndicator,
  Card,
  Surface,
} from 'react-native-paper';
import Markdown from 'react-native-markdown-display';

import { useTransactionStore, selectBalanceCents } from '../../../../store/useTransactionStore';
import { useSettingsStore } from '../../../../store/useSettingsStore';
import { useAppTheme } from '../../../../providers/AppThemeProvider';
import type { Category } from '../../../../types/finance';
import { formatCurrency } from '../../../../utils/formatCurrency';
import { generatePersonalGreeting, streamFinancialAnalysis } from '../../nlp/services/gemmaAnalysis';

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

function formatTime(timestamp: number, locale: string) {
  return new Date(timestamp).toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit' });
}

function categoryById(categories: Category[], categoryId: string) {
  return categories.find((item) => item.id === categoryId);
}

function amountTextToCents(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function applyOpacity(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(opacity, 0), 1)})`;
}

function fallbackGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

type HapticWeight = 'light' | 'medium' | 'heavy';

function triggerHaptic(weight: HapticWeight = 'medium') {
  const style =
    weight === 'heavy'
      ? Haptics.ImpactFeedbackStyle.Heavy
      : weight === 'light'
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium;
  Haptics.impactAsync(style).catch(() => {});
}

function useBouncyPress(scaleDown = 0.93) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(scaleDown, { damping: 10, stiffness: 520, mass: 0.7 });
  };
  const onPressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 360, mass: 0.8 });
  };

  return { animatedStyle, onPressIn, onPressOut };
}

function BouncyPressable({
  children,
  onPress,
  haptic = 'medium',
  scaleDown = 0.93,
  style,
  pressableStyle,
}: {
  children: React.ReactNode;
  onPress: () => void;
  haptic?: HapticWeight;
  scaleDown?: number;
  style?: StyleProp<ViewStyle>;
  pressableStyle?: StyleProp<ViewStyle>;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useBouncyPress(scaleDown);
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => {
        triggerHaptic(haptic);
        onPress();
      }}
      style={pressableStyle}
    >
      <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const currencyCode = useSettingsStore((state) => state.currencyCode);
  const language = useSettingsStore((state) => state.language);
  const region = useSettingsStore((state) => state.region);
  const aiProvider = useSettingsStore((state) => state.aiProvider);
  const geminiApiKey = useSettingsStore((state) => state.geminiApiKey);
  const huggingFaceToken = useSettingsStore((state) => state.huggingFaceToken);
  const gemmaModel = useSettingsStore((state) => state.gemmaModel);
  const localModelDownloaded = useSettingsStore((state) => state.localModelDownloaded);
  const advancedSummariesEnabled = useSettingsStore((state) => state.advancedSummariesEnabled);
  const passcodeEnabled = useSettingsStore((state) => state.passcodeEnabled);
  const passcodePin = useSettingsStore((state) => state.passcodePin);
  const resetSettings = useSettingsStore((state) => state.resetSettings);

  const transactions = useTransactionStore((state) => state.transactions);
  const categories = useTransactionStore((state) => state.categories);
  const walletMeta = useTransactionStore((state) => state.walletMeta);
  const balanceCents = useTransactionStore(selectBalanceCents);
  const completeOnboarding = useTransactionStore((state) => state.completeOnboarding);
  const addExpense = useTransactionStore((state) => state.addExpense);
  const addIncome = useTransactionStore((state) => state.addIncome);
  const undoTransaction = useTransactionStore((state) => state.undoTransaction);
  const clearAllData = useTransactionStore((state) => state.clearAllData);
  const locale = language || 'en-US';
  const formatAmount = useCallback(
    (value: number) => formatCurrency(value, { currencyCode, locale }),
    [currencyCode, locale]
  );

  const [search, setSearch] = useState('');
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<string | null>(null);

  const [manualVisible, setManualVisible] = useState(false);
  const [manualPhase, setManualPhase] = useState<'amount' | 'category'>('amount');
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [receiptText, setReceiptText] = useState('');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');

  const [personalGreeting, setPersonalGreeting] = useState(fallbackGreeting());
  const [isGreetingLoading, setIsGreetingLoading] = useState(false);

  const [onboardingPhase, setOnboardingPhase] = useState<'balance' | 'voice'>('balance');
  const [openingBalance, setOpeningBalance] = useState('');

  const [snackbar, setSnackbar] = useState({ visible: false, text: '', txId: '' });

  const [gemmaVisible, setGemmaVisible] = useState(false);
  const [gemmaText, setGemmaText] = useState('');
  const [isGemmaLoading, setIsGemmaLoading] = useState(false);

  const [sessionUnlocked, setSessionUnlocked] = useState(!passcodeEnabled || !passcodePin);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const rawGemmaOutput = useRef('');
  const greetingRefreshRef = useRef(0);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (passcodeEnabled && passcodePin) {
      setSessionUnlocked(false);
    } else {
      setSessionUnlocked(true);
    }
    setPasscodeInput('');
    setPasscodeError('');
  }, [passcodeEnabled, passcodePin]);

  useEffect(() => {
    const hasKey =
      (aiProvider === 'google' && geminiApiKey?.trim()) ||
      (aiProvider === 'huggingface' && huggingFaceToken?.trim()) ||
      (aiProvider === 'local' && localModelDownloaded);

    if (!hasKey) {
      setPersonalGreeting(fallbackGreeting());
      setIsGreetingLoading(false);
      return;
    }
    const now = Date.now();
    if (now - greetingRefreshRef.current < 4 * 60 * 1000) {
      return;
    }
    let cancelled = false;
    setIsGreetingLoading(true);
    (async () => {
      try {
        const greetingText = await generatePersonalGreeting(transactions, {
          aiProvider,
          geminiApiKey,
          huggingFaceToken,
          localModelDownloaded,
          currencyCode,
          locale,
          region,
          model: gemmaModel,
        });
        if (cancelled) {
          return;
        }
        setPersonalGreeting(greetingText || fallbackGreeting());
      } catch {
        if (cancelled) return;
        setPersonalGreeting(fallbackGreeting());
      } finally {
        if (!cancelled) {
          greetingRefreshRef.current = Date.now();
          setIsGreetingLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [aiProvider, currencyCode, geminiApiKey, huggingFaceToken, localModelDownloaded, gemmaModel, locale, region, transactions]);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === 'expense'),
    [categories]
  );
  const incomeCategories = useMemo(() => categories.filter((item) => item.kind === 'income'), [categories]);

  const activeCategories = txType === 'expense' ? expenseCategories : incomeCategories;

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const category = categoryById(categories, item.categoryId);
      const text = [item.note ?? '', category?.name ?? '', category?.emoji ?? '', formatAmount(item.amountCents)]
        .join(' ')
        .toLowerCase();

      const matchesQuery = search.trim() ? text.includes(search.trim().toLowerCase()) : true;
      const matchesCategory = selectedExpenseCategoryId
        ? item.type === 'expense' && item.categoryId === selectedExpenseCategoryId
        : true;

      return matchesQuery && matchesCategory;
    });
  }, [categories, formatAmount, search, selectedExpenseCategoryId, transactions]);

  const pushSnackbar = (text: string, txId: string) => {
    setSnackbar({ visible: true, text, txId });
  };

  const handleUnlock = async () => {
    if (passcodeInput === passcodePin) {
      setSessionUnlocked(true);
      setPasscodeInput('');
      setPasscodeError('');
      await Haptics.selectionAsync();
    } else {
      setPasscodeError('Incorrect passcode.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleKeypadInput = async (key: (typeof keypadRows)[number][number], setValue: (next: string) => void, value: string) => {
    if (key === '⌫') {
      setValue(value.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (value.includes('.') || value.length === 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return;
      }
      setValue(`${value}.`);
      return;
    }
    const [whole, decimal] = value.split('.');
    if (whole.length >= 8 && !decimal) return;
    if (decimal && decimal.length >= 2) return;
    setValue(`${value}${key}`);
    await Haptics.selectionAsync();
  };

  const openManualFlow = async () => {
    setManualAmount('');
    setManualNote('');
    setReceiptText('');
    setManualPhase('amount');
    setTxType('expense');
    setManualVisible(true);
    await Haptics.selectionAsync();
  };

  const saveManual = async (categoryId: string) => {
    const amountCents = amountTextToCents(manualAmount);
    if (amountCents <= 0) return;

    const category = categoryById(categories, categoryId);
    let tx;
    const note = [manualNote, receiptText].filter(Boolean).join(' • ').trim() || undefined;
    if (txType === 'expense') {
      tx = addExpense({ amountCents, categoryId, note });
    } else {
      tx = addIncome({ amountCents, categoryId, note });
    }

    setManualVisible(false);
    setManualAmount('');
    setManualNote('');
    setReceiptText('');
    setManualPhase('amount');
    pushSnackbar(`Logged ${formatAmount(amountCents)} for ${category?.name ?? 'category'}`, tx.id);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const askGemma = async () => {
    setGemmaVisible(true);
    setGemmaText('');
    setIsGemmaLoading(true);
    rawGemmaOutput.current = '';
    try {
      const generator = streamFinancialAnalysis(
        transactions,
        {
          aiProvider,
          geminiApiKey,
          huggingFaceToken,
          localModelDownloaded,
          currencyCode,
          locale,
          region,
          model: gemmaModel,
          advanced: advancedSummariesEnabled,
        },
        {
          onCommand: (command) => {
            const category = expenseCategories.find((c) =>
              c.name.toLowerCase().includes(command.categoryHint.toLowerCase())
            );
            const tx = addExpense({
              amountCents: command.amountCents,
              categoryId: category?.id ?? expenseCategories[0]?.id ?? 'expense-misc',
              note: command.note || 'AI-added expense',
            });
            pushSnackbar(`AI added ${formatAmount(command.amountCents)} for ${category?.name ?? 'expense'}`, tx.id);
          },
        }
      );
      for await (const chunk of generator) {
        rawGemmaOutput.current = `${rawGemmaOutput.current}${chunk}`;
        setGemmaText(rawGemmaOutput.current.trim());
      }
    } catch {
      setGemmaText('Oops, the AI had an issue processing this request.');
    } finally {
      setIsGemmaLoading(false);
    }
  };

  const settingsBounce = useBouncyPress(0.9);
  const addFundsBounce = useBouncyPress(0.9);
  const aiFabBounce = useBouncyPress(0.88);
  const unlockBounce = useBouncyPress(0.94);
  const resetBounce = useBouncyPress(0.94);
  const setBalanceBounce = useBouncyPress(0.94);
  const enableFeaturesBounce = useBouncyPress(0.94);
  const skipBounce = useBouncyPress(0.94);
  const continueManualBounce = useBouncyPress(0.94);
  const closeGemmaBounce = useBouncyPress(0.94);

  if (passcodeEnabled && passcodePin && !sessionUnlocked) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background, justifyContent: 'center', padding: 24 }]}>
        <View style={{ gap: 16 }}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Unlock wallet
          </Text>
          <TextInput
            mode="outlined"
            label="Passcode"
            value={passcodeInput}
            onChangeText={(val) => {
              setPasscodeInput(val);
              setPasscodeError('');
            }}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={8}
          />
          {passcodeError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {passcodeError}
            </Text>
          ) : null}
          <Animated.View style={unlockBounce.animatedStyle}>
            <Button
              mode="contained"
              onPress={() => {
                if (!passcodeInput) return;
                triggerHaptic('medium');
                void handleUnlock();
              }}
              disabled={!passcodeInput}
              onPressIn={unlockBounce.onPressIn}
              onPressOut={unlockBounce.onPressOut}
            >
              Unlock
            </Button>
          </Animated.View>
          <Animated.View style={resetBounce.animatedStyle}>
            <Button
              mode="text"
              onPress={async () => {
                triggerHaptic('medium');
                clearAllData();
                resetSettings();
                setSessionUnlocked(true);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              }}
              onPressIn={resetBounce.onPressIn}
              onPressOut={resetBounce.onPressOut}
            >
              Reset all data (clears passcode)
            </Button>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (!walletMeta.hasCompletedOnboarding) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.onboardingContainer}>
          <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
            Welcome to GemWallet
          </Text>

          {onboardingPhase === 'balance' ? (
            <>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                How much cash is in your pocket right now?
              </Text>
              <Text variant="displaySmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                {openingBalance ? `$${openingBalance}` : '$0.00'}
              </Text>

              <View style={styles.keypadGrid}>
                {keypadRows.map((row) => (
                  <View key={row.join('')} style={styles.keypadRow}>
                    {row.map((key) => (
                      <BouncyPressable
                        key={key}
                        onPress={() => {
                          triggerHaptic('light');
                          void handleKeypadInput(key, setOpeningBalance, openingBalance);
                        }}
                        haptic="light"
                        scaleDown={0.9}
                        pressableStyle={{ flex: 1 }}
                        style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceVariant }]}
                      >
                        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
                          {key}
                        </Text>
                      </BouncyPressable>
                    ))}
                  </View>
                ))}
              </View>

              <Animated.View style={setBalanceBounce.animatedStyle}>
                <Button
                  mode="contained"
                  disabled={amountTextToCents(openingBalance) <= 0}
                  onPress={() => {
                    triggerHaptic('medium');
                    setOnboardingPhase('voice');
                  }}
                  style={styles.pillButton}
                  onPressIn={setBalanceBounce.onPressIn}
                  onPressOut={setBalanceBounce.onPressOut}
                >
                  Set balance
                </Button>
              </Animated.View>
            </>
          ) : (
            <Card style={[styles.voiceCard, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Card.Content style={{ gap: 14 }}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
                  Enable AI assistant?
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Log expenses seamlessly with AI insights.
                </Text>
                <View style={styles.voiceButtons}>
                  <Animated.View style={enableFeaturesBounce.animatedStyle}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        triggerHaptic('medium');
                        completeOnboarding({
                          initialBalanceCents: amountTextToCents(openingBalance),
                          voiceAssistantEnabled: true,
                        });
                      }}
                      style={styles.pillButton}
                      onPressIn={enableFeaturesBounce.onPressIn}
                      onPressOut={enableFeaturesBounce.onPressOut}
                    >
                      Enable features
                    </Button>
                  </Animated.View>
                  <Animated.View style={skipBounce.animatedStyle}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        triggerHaptic('light');
                        completeOnboarding({
                          initialBalanceCents: amountTextToCents(openingBalance),
                          voiceAssistantEnabled: false,
                        });
                      }}
                      style={styles.pillButton}
                      onPressIn={skipBounce.onPressIn}
                      onPressOut={skipBounce.onPressOut}
                    >
                      Skip for now
                    </Button>
                  </Animated.View>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.surfaceContainerLowest }]}>
      <Animated.View entering={FadeInDown.springify().mass(1).damping(12).stiffness(280)} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Surface style={[styles.heroShell, { backgroundColor: theme.colors.surfaceContainerHigh }]} elevation={4}>
          <View style={styles.headerRow}>
            <Animated.View entering={FadeInLeft.springify().mass(0.8).damping(12).stiffness(260)} style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: -0.15 }}>
                {personalGreeting}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Text variant="displaySmall" style={{ color: theme.colors.onSurface, fontWeight: '800', letterSpacing: -0.3 }}>
                  {formatAmount(balanceCents)}
                </Text>
                {isGreetingLoading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
              </View>
            </Animated.View>
            <Animated.View style={settingsBounce.animatedStyle}>
              <IconButton
                icon="cog"
                size={26}
                iconColor={theme.colors.onSurfaceVariant}
                onPress={() => {
                  triggerHaptic('medium');
                  router.push('/settings');
                }}
                onPressIn={settingsBounce.onPressIn}
                onPressOut={settingsBounce.onPressOut}
              />
            </Animated.View>
          </View>

          <Animated.View entering={FadeInDown.delay(70).springify().damping(10).stiffness(320)} style={styles.heroSection}>
            <View style={styles.balanceContainer}>
              <View style={[styles.balanceGlow, { backgroundColor: applyOpacity(theme.colors.primary, 0.18) }]} />
              <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, letterSpacing: 0.2 }}>
                Available Cash
              </Text>
            </View>
            <View style={styles.quickActionsRow}>
              <Animated.View style={addFundsBounce.animatedStyle}>
                <Button
                  mode="contained-tonal"
                  icon="plus"
                  onPress={() => {
                    triggerHaptic('heavy');
                    void openManualFlow();
                  }}
                  onPressIn={addFundsBounce.onPressIn}
                  onPressOut={addFundsBounce.onPressOut}
                  style={[styles.heroButton, { backgroundColor: theme.colors.primaryContainer, flex: 1 }]}
                  labelStyle={{ color: theme.colors.onPrimaryContainer, letterSpacing: 0 }}
                  contentStyle={{ height: 52 }}
                >
                  Add Funds
                </Button>
              </Animated.View>
            </View>
          </Animated.View>
        </Surface>
      </Animated.View>

      <Surface style={[styles.bottomSheet, { backgroundColor: theme.colors.surfaceContainerHighest }]} elevation={4}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.delay(80).springify().damping(12).stiffness(280)}>
            <TextInput
              mode="outlined"
              value={search}
              onChangeText={setSearch}
              placeholder="Search transactions"
              left={<TextInput.Icon icon="magnify" color={theme.colors.onSurfaceVariant} />}
              right={search ? <TextInput.Icon icon="close-circle" onPress={() => setSearch('')} /> : null}
              style={styles.searchBar}
              outlineStyle={{ borderRadius: 22, borderColor: theme.colors.outlineVariant }}
            />
          </Animated.View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Animated.View entering={FadeInRight.delay(90).springify().damping(10).stiffness(300)}>
              <BouncyPressable
                onPress={() => setSelectedExpenseCategoryId(null)}
                haptic="medium"
                scaleDown={0.9}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: !selectedExpenseCategoryId
                      ? theme.colors.secondaryContainer
                      : theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
                pressableStyle={{ marginRight: 8 }}
              >
                <Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}>All</Text>
              </BouncyPressable>
            </Animated.View>
            {expenseCategories.map((item, index) => {
              const selected = selectedExpenseCategoryId === item.id;
              return (
                <Animated.View
                  key={item.id}
                  entering={FadeInRight.delay(110 + index * 40).springify().damping(12).stiffness(320)}
                >
                  <BouncyPressable
                    onPress={() =>
                      setSelectedExpenseCategoryId((current) => (current === item.id ? null : item.id))
                    }
                    haptic="light"
                    scaleDown={0.9}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected ? theme.colors.secondaryContainer : theme.colors.surface,
                        borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                      },
                    ]}
                    pressableStyle={{ marginRight: 8 }}
                  >
                    <Text
                      style={{
                        color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurface,
                        fontWeight: '700',
                      }}
                    >
                      {item.emoji} {item.name}
                    </Text>
                  </BouncyPressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          <View style={styles.transactionsList}>
            {filteredTransactions.length === 0 ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 40 }}>
                No recent transactions
              </Text>
            ) : (
              filteredTransactions.map((item, index) => {
                const category = categoryById(categories, item.categoryId);
                const isIncome = item.type === 'income';
                return (
                  <Animated.View
                    key={item.id}
                    entering={FadeInUp.delay(120 + index * 70).springify().damping(14).stiffness(320)}
                  >
                    <BouncyPressable
                      onPress={() => triggerHaptic('medium')}
                      haptic="medium"
                      scaleDown={0.94}
                      style={[
                        styles.txRow,
                        {
                          borderColor: theme.colors.outlineVariant,
                          backgroundColor: theme.colors.surfaceContainerLow,
                        },
                      ]}
                    >
                      <View style={[styles.txIconContainer, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
                        <Text style={{ fontSize: 20 }}>{category?.emoji ?? '💸'}</Text>
                      </View>
                      <View style={styles.txDetails}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }} numberOfLines={1}>
                          {item.note || category?.name || 'Transaction'}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                          {formatTime(item.timestamp, locale)} • {category?.name ?? 'General'}
                        </Text>
                      </View>
                      <Text
                        variant="titleMedium"
                        style={{
                          color: isIncome ? theme.colors.tertiary : theme.colors.onSurface,
                          fontWeight: '800',
                        }}
                      >
                        {isIncome ? '+' : '-'}{formatAmount(item.amountCents)}
                      </Text>
                    </BouncyPressable>
                  </Animated.View>
                );
              })
            )}
          </View>
        </ScrollView>
      </Surface>

      <Animated.View style={[styles.aiFabWrapper, aiFabBounce.animatedStyle]} entering={FadeInUp.delay(180).springify().damping(10).stiffness(320)}>
        <FAB
          icon="robot-outline"
          label="AI analysis"
          style={[styles.aiFab, { backgroundColor: theme.colors.primaryContainer }]}
          color={theme.colors.onPrimaryContainer}
          onPress={() => {
            aiFabBounce.onPressIn();
            setTimeout(() => aiFabBounce.onPressOut(), 140);
            triggerHaptic('heavy');
            void askGemma();
          }}
          onPressIn={aiFabBounce.onPressIn}
          onPressOut={aiFabBounce.onPressOut}
        />
      </Animated.View>

      <Modal visible={manualVisible} transparent animationType="slide" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => {
              triggerHaptic('medium');
              setManualVisible(false);
            }}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.onSurfaceVariant }]} />

            <SegmentedButtons
              value={txType}
              onValueChange={async (val) => {
                setTxType(val as 'expense' | 'income');
                await Haptics.selectionAsync();
              }}
              buttons={[
                { value: 'expense', label: 'Expense', icon: 'minus' },
                { value: 'income', label: 'Income', icon: 'plus' },
              ]}
              style={{ marginBottom: 16 }}
            />

            {manualPhase === 'amount' ? (
              <>
                <Text variant="displayMedium" style={{ color: txType === 'income' ? theme.colors.tertiary : theme.colors.onSurface, textAlign: 'center', fontWeight: 'bold', marginVertical: 16 }}>
                  {txType === 'income' ? '+' : '-'}{manualAmount ? `$${manualAmount}` : '$0.00'}
                </Text>

                <View style={styles.keypadGrid}>
                  {keypadRows.map((row) => (
                    <View key={row.join('')} style={styles.keypadRow}>
                      {row.map((key) => (
                        <BouncyPressable
                          key={key}
                          onPress={() => {
                            triggerHaptic('light');
                            void handleKeypadInput(key, setManualAmount, manualAmount);
                          }}
                          haptic="light"
                          scaleDown={0.9}
                          pressableStyle={{ flex: 1 }}
                          style={[styles.keypadKey, { backgroundColor: theme.colors.surfaceContainer }]}
                        >
                          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                            {key}
                          </Text>
                        </BouncyPressable>
                      ))}
                    </View>
                  ))}
                </View>

                <Animated.View style={continueManualBounce.animatedStyle}>
                  <Button
                    mode="contained"
                    disabled={amountTextToCents(manualAmount) <= 0}
                    onPress={() => {
                      triggerHaptic('medium');
                      setManualPhase('category');
                    }}
                    style={[styles.pillButton, { marginTop: 16 }]}
                    contentStyle={{ height: 56 }}
                    onPressIn={continueManualBounce.onPressIn}
                    onPressOut={continueManualBounce.onPressOut}
                  >
                    Continue
                  </Button>
                </Animated.View>
              </>
            ) : (
              <>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, textAlign: 'center' }}>
                  Pick a category to save instantly
                </Text>
                <TextInput
                  mode="outlined"
                  label="Receipt/IOU note (paste photo text)"
                  value={receiptText}
                  onChangeText={setReceiptText}
                  multiline
                  style={{ marginBottom: 8 }}
                />
                <TextInput
                  mode="outlined"
                  label="Quick note"
                  value={manualNote}
                  onChangeText={setManualNote}
                  style={{ marginBottom: 8 }}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                  {['Receipt', 'IOU', 'Reimbursable'].map((tag) => (
                    <BouncyPressable
                      key={tag}
                      onPress={() => setManualNote((prev) => (prev ? `${prev} ${tag}` : tag))}
                      haptic="light"
                      scaleDown={0.92}
                      pressableStyle={{}}
                    >
                      <Chip mode="outlined">{tag}</Chip>
                    </BouncyPressable>
                  ))}
                </ScrollView>
                <ScrollView contentContainerStyle={styles.categoryGrid}>
                  {activeCategories.map((item) => (
                    <BouncyPressable
                      key={item.id}
                      onPress={() => void saveManual(item.id)}
                      haptic="medium"
                      scaleDown={0.92}
                      pressableStyle={{ width: '30%' }}
                      style={[
                        styles.categoryCell,
                        { backgroundColor: theme.colors.surfaceContainer },
                      ]}
                    >
                      <Text variant="headlineMedium">{item.emoji}</Text>
                      <Text variant="labelLarge" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                        {item.name}
                      </Text>
                    </BouncyPressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={gemmaVisible} transparent animationType="slide" onRequestClose={() => setGemmaVisible(false)}>
        <View style={styles.sheetRoot}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: theme.colors.backdrop }]}
            onPress={() => {
              triggerHaptic('medium');
              setGemmaVisible(false);
            }}
          />
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: theme.colors.surfaceContainerHigh,
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                minHeight: '50%',
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={[styles.dragHandle, { backgroundColor: theme.colors.onSurfaceVariant }]} />
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold', marginBottom: 16 }}>
              ✨ AI Assistant
            </Text>

            <ScrollView style={{ flexGrow: 0, maxHeight: 400 }}>
              {isGemmaLoading && !gemmaText ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 32 }}>
                  <ActivityIndicator size="large" />
                  <Text variant="bodyLarge" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
                    Analyzing your spending habits...
                  </Text>
                </View>
              ) : (
                <Markdown
                  style={{
                    body: { color: theme.colors.onSurface, fontSize: 16, lineHeight: 24 },
                    table: { borderColor: theme.colors.outlineVariant, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
                    tr: { borderBottomWidth: 1, borderColor: theme.colors.outlineVariant },
                    th: { fontWeight: 'bold', padding: 8, backgroundColor: theme.colors.surfaceVariant },
                    td: { padding: 8 },
                  }}
                >
                  {gemmaText}
                </Markdown>
              )}
            </ScrollView>

            <Animated.View style={closeGemmaBounce.animatedStyle}>
              <Button
                mode="contained"
                onPress={() => {
                  triggerHaptic('medium');
                  setGemmaVisible(false);
                }}
                style={[styles.pillButton, { marginTop: 24 }]}
                onPressIn={closeGemmaBounce.onPressIn}
                onPressOut={closeGemmaBounce.onPressOut}
              >
                Close
              </Button>
            </Animated.View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar((current) => ({ ...current, visible: false }))}
        duration={4000}
        action={
          snackbar.txId
            ? {
              label: 'Undo',
              onPress: () => {
                undoTransaction(snackbar.txId);
              },
            }
            : undefined
        }
      >
        {snackbar.text}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  heroShell: {
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroSection: {
    marginTop: 12,
    gap: 14,
  },
  balanceContainer: {
    position: 'relative',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  balanceGlow: {
    position: 'absolute',
    width: 260,
    height: 120,
    borderRadius: 120,
    opacity: 0.8,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  heroButton: {
    borderRadius: 28,
    paddingHorizontal: 14,
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 26,
    paddingHorizontal: 18,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  searchBar: {
    height: 56,
    marginBottom: 18,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 22,
  },
  filterChip: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  transactionsList: {
    gap: 14,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 22,
  },
  txIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  txDetails: {
    flex: 1,
    gap: 4,
  },
  aiFab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    borderRadius: 22,
    elevation: 10,
  },
  aiFabWrapper: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  onboardingContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  keypadGrid: {
    gap: 12,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  keypadKey: {
    flex: 1,
    minHeight: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButton: {
    borderRadius: 28,
  },
  voiceCard: {
    borderRadius: 28,
  },
  voiceButtons: {
    gap: 10,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  sheetCard: {
    padding: 24,
    paddingBottom: 40,
    gap: 8,
    borderWidth: 1,
  },
  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  categoryCell: {
    aspectRatio: 1,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
