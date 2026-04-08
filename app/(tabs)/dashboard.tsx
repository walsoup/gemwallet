import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Divider,
  FAB,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { AppIcon } from '../../components/AppIcon';
import { useTransactionStore } from '../../store/useTransactionStore';
import type { TransactionCategory } from '../../types/finance';
import { generateId } from '../../utils/generateId';

const spendLimits: Record<'Food' | 'Transport' | 'Subscriptions' | 'Shopping', number> = {
  Food: 350,
  Transport: 220,
  Subscriptions: 120,
  Shopping: 300,
};

const keypadRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', '⌫'],
] as const;

const categoryButtons = [
  { label: 'Food', value: 'Food' },
  { label: 'Transport', value: 'Transport' },
  { label: 'Subscriptions', value: 'Subscriptions' },
  { label: 'Shopping', value: 'Shopping' },
] as const;

const SHEET_ANIMATION_DURATION = 220;
const SHEET_BACKDROP_OPACITY = 0.25;
const SHEET_MAX_HEIGHT = '92%';

export default function DashboardScreen() {
  const theme = useTheme();
  const sheetAnimation = useRef(new Animated.Value(0)).current;
  const sheetTranslateDistance = Dimensions.get('window').height;

  const transactions = useTransactionStore((state) => state.transactions);
  const addTransaction = useTransactionStore((state) => state.addTransaction);

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Food');
  const [formError, setFormError] = useState('');
  const [isSheetVisible, setIsSheetVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [transactions.length]);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.category === 'Food') acc.Food += tx.amount;
        if (tx.category === 'Transport') acc.Transport += tx.amount;
        if (tx.category === 'Subscriptions') acc.Subscriptions += tx.amount;
        if (tx.category === 'Shopping') acc.Shopping += tx.amount;
        return acc;
      },
      { Food: 0, Transport: 0, Subscriptions: 0, Shopping: 0 }
    );
  }, [transactions]);

  const onPressKey = (key: (typeof keypadRows)[number][number]) => {
    if (key === '⌫') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }

    setAmount((prev) => {
      if (key === '.' && prev.includes('.')) {
        return prev;
      }
      return `${prev}${key}`;
    });
  };

  const openSheet = () => {
    void Haptics.selectionAsync();
    setIsSheetVisible(true);
    Animated.timing(sheetAnimation, {
      toValue: 1,
      duration: SHEET_ANIMATION_DURATION,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = (reset = true) => {
    Animated.timing(sheetAnimation, {
      toValue: 0,
      duration: SHEET_ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setIsSheetVisible(false);
      if (reset) {
        resetForm();
      }
    });
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setCategory('Food');
    setFormError('');
  };

  const onSave = async () => {
    const parsedAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter a valid amount and description.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setFormError('');
    addTransaction({
      id: generateId(),
      title: description.trim(),
      amount: parsedAmount,
      category,
      date: new Date().toISOString(),
      recurring: category === 'Subscriptions',
      interval: category === 'Subscriptions' ? 'monthly' : undefined,
    });

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeSheet();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <Divider style={{ marginVertical: 4 }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16, gap: 14 }}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
              Dashboard
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Adaptive Spending Bars
            </Text>

            {(Object.keys(spendLimits) as (keyof typeof spendLimits)[]).map((item) => {
              const limit = spendLimits[item];
              const spent = totals[item];
              const fill = Math.min((spent / limit) * 100, 100);

              return (
                <View key={item} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                      {item}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      ${spent.toFixed(2)} / ${limit.toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 16,
                      borderRadius: 16,
                      backgroundColor: theme.colors.surfaceVariant,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${fill}%`,
                        height: '100%',
                        borderRadius: 16,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                  </View>
                </View>
              );
            })}

            <Text variant="titleLarge" style={{ marginTop: 12, color: theme.colors.onSurface }}>
              Recent Transactions
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {item.title}
              </Text>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.category} • {new Date(item.date).toLocaleString()}
            </Text>
          </View>
        )}
      />

      <FAB
        icon={() => <AppIcon name="add" color={theme.colors.onPrimaryContainer} size={22} />}
        style={{ position: 'absolute', right: 16, bottom: 24 }}
        onPress={openSheet}
      />

      <Modal transparent visible={isSheetVisible} onRequestClose={() => closeSheet()} animationType="none">
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: theme.colors.backdrop,
              opacity: sheetAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, SHEET_BACKDROP_OPACITY] }),
            }}
          />
          <Pressable
            accessibilityLabel="Close add transaction panel"
            accessibilityHint="Dismiss the add transaction form"
            accessibilityRole="button"
            style={StyleSheet.absoluteFillObject}
            onPress={() => closeSheet()}
          />
          <Animated.View
            style={{
              opacity: sheetAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              transform: [
                {
                  translateY: sheetAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetTranslateDistance, 0],
                  }),
                },
              ],
              maxHeight: SHEET_MAX_HEIGHT,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              backgroundColor: theme.colors.surface,
            }}
          >
            <ScrollView
              contentContainerStyle={{ padding: 16, gap: 14, backgroundColor: theme.colors.surface }}
            >
              <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
                Add Transaction
              </Text>

              <Text
                variant="displaySmall"
                style={{ textAlign: 'center', color: theme.colors.onSurface, minHeight: 58 }}
              >
                {amount ? `$${amount}` : '$0'}
              </Text>

              <View style={{ gap: 10 }}>
                {keypadRows.map((row) => (
                  <View key={row.join('')} style={{ flexDirection: 'row', gap: 10 }}>
                    {row.map((key) => (
                      <Pressable
                        key={key}
                        onPress={() => onPressKey(key)}
                        style={{
                          flex: 1,
                          minHeight: 64,
                          borderRadius: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: theme.colors.surfaceVariant,
                        }}
                      >
                        <Text variant="headlineMedium" style={{ color: theme.colors.onSurface }}>
                          {key}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ))}
              </View>

              <TextInput
                mode="outlined"
                label="Description"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  if (formError) {
                    setFormError('');
                  }
                }}
              />

              <SegmentedButtons
                value={category}
                onValueChange={(value) => setCategory(value as TransactionCategory)}
                buttons={categoryButtons.map((item) => ({ label: item.label, value: item.value }))}
              />

              <Button mode="contained" onPress={onSave}>
                Save
              </Button>
              {formError ? (
                <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                  {formError}
                </Text>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
