import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo, useState } from 'react';
import { SegmentedButtons, TextInput, Button } from 'react-native-paper';

import { useTransactionStore } from '../store/useTransactionStore';
import type { TransactionCategory } from '../types/finance';

const categories: TransactionCategory[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];

function generateTransactionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
      .slice(6, 8)
      .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export const QuickAddSheet = forwardRef<BottomSheet>((_, ref) => {
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const snapPoints = useMemo(() => ['50%'], []);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Food');

  const save = () => {
    const parsedAmount = Number(amount);

    if (!title.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    addTransaction({
      id: generateTransactionId(),
      title: title.trim(),
      amount: parsedAmount,
      category,
      date: new Date().toISOString().slice(0, 10)
    });

    setTitle('');
    setAmount('');
  };

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={snapPoints} enablePanDownToClose>
      <BottomSheetView style={{ padding: 16, gap: 12 }}>
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
      </BottomSheetView>
    </BottomSheet>
  );
});

QuickAddSheet.displayName = 'QuickAddSheet';
