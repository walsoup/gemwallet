import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Transaction } from '../types/finance';
import { seedTransactions } from '../utils/seedData';

type FinanceState = {
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
};

export const useTransactionStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      transactions: seedTransactions,
      addTransaction: (tx) => set({ transactions: [tx, ...get().transactions] })
    }),
    {
      name: 'gemwallet-transactions-v1',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

export const selectRecurringTransactions = (state: FinanceState) =>
  state.transactions.filter((tx) => tx.recurring);
