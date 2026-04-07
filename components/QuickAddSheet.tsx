import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { SegmentedButtons, TextInput, Button, useTheme } from 'react-native-paper';

import { useTransactionStore } from '../store/useTransactionStore';
import type { TransactionCategory } from '../types/finance';
import { generateId } from '../utils/generateId';

const categories: TransactionCategory[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];
const BACKDROP_OPACITY = 0.35;

type QuickAddSheetProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function QuickAddSheet({ visible, onDismiss }: QuickAddSheetProps) {
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Food');

  const save = () => {
    const parsedAmount = Number(amount);

    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    addTransaction({
      id: generateId(),
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: new Date().toISOString().slice(0, 10)
    });

    setTitle('');
    setAmount('');
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable
        style={{ flex: 1, backgroundColor: `rgba(0, 0, 0, ${BACKDROP_OPACITY})` }}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Close quick add expense dialog"
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={{
            padding: 16,
            gap: 12,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: theme.colors.surface
          }}
        >
          <TextInput mode="outlined" label="What did you buy?" value={title} onChangeText={setTitle} />
          <TextInput
            mode="outlined"
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
          <SegmentedButtons
            value={category}
            onValueChange={(value) => setCategory(value as TransactionCategory)}
            buttons={categories.map((item) => ({ value: item, label: item }))}
          />
          <Button mode="contained" onPress={save}>
            Save Expense
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
