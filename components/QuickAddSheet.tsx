import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useMemo, useState } from 'react';
import { SegmentedButtons, TextInput, Button } from 'react-native-paper';

import { useTransactionStore } from '../store/useTransactionStore';
import type { TransactionCategory } from '../types/finance';
import { generateId } from '../utils/generateId';

const categories: TransactionCategory[] = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];

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
      id: generateId(),
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
